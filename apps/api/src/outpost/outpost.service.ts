import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ASTEROID_REWARD_ICE,
  AUTOMATION_INTERVAL_MINUTES,
  AUTOMATION_MAX_TICKS,
  AUTOMATION_YIELD_PER_TICK,
  OUTPOST_GRID_SIZE,
  QUEST_CATALOG,
  RESOURCE_TYPES,
  STARTER_RESOURCE_AMOUNT,
  findRecipe,
  stationFor,
  type AsteroidAnswerResult,
  type AsteroidQuestion,
  type OutpostQuest,
  type QuestObjective,
  type OutpostState,
  type QuestProgress,
  type ResourceType,
  type StationCollectResult,
} from '@questly/shared-types';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AiService } from '../ai/ai.service';

interface QuestInputs {
  lessonCount: number;
  resourceMap: Map<ResourceType, number>;
  totalCraftedMap: Map<string, number>;
  placedTotal: number;
  placedCountByKey: Map<string, number>;
}

const ASTEROID_REDIS_TTL_SECONDS = 300;
const DEFAULT_ASTEROID_TOPICS = [
  'general knowledge',
  'basic arithmetic',
  'science trivia',
];

@Injectable()
export class OutpostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly aiService: AiService,
  ) {}

  async getState(userId: string): Promise<OutpostState> {
    await this.ensureStarterKit(userId);
    const automationCollected = await this.applyAutomation(userId);

    const [gameProfile, stockRows, buildingRows, inputs, claims] =
      await Promise.all([
        this.prisma.gameProfile.findUnique({ where: { userId } }),
        this.prisma.craftedItemStock.findMany({ where: { userId } }),
        this.prisma.outpostBuilding.findMany({ where: { userId } }),
        this.loadQuestInputs(userId),
        this.prisma.questClaim.findMany({
          where: { userId },
          select: { questKey: true },
        }),
      ]);
    const claimedKeys = new Set(claims.map((c) => c.questKey));

    const resources = Object.fromEntries(
      RESOURCE_TYPES.map((r) => [r, inputs.resourceMap.get(r) ?? 0]),
    ) as Record<ResourceType, number>;

    const quests: QuestProgress[] = QUEST_CATALOG.map((quest) =>
      this.toQuestProgress(quest, inputs, claimedKeys),
    );

    return {
      resources,
      stardust: gameProfile?.stardust ?? 0,
      stock: stockRows.map((s) => ({
        buildingKey: s.buildingKey,
        stock: s.stock,
        totalCrafted: s.totalCrafted,
      })),
      grid: buildingRows.map((b) => ({
        x: b.x,
        y: b.y,
        buildingKey: b.buildingKey,
        lastCollectedAt: b.lastCollectedAt?.toISOString() ?? null,
        lastAutomationAt: b.lastAutomationAt.toISOString(),
      })),
      quests,
      automationCollected,
    };
  }

  async craft(userId: string, recipeKey: string) {
    const recipe = findRecipe(recipeKey);
    if (!recipe) throw new NotFoundException(`Unknown recipe "${recipeKey}"`);

    const balances = await this.prisma.resourceBalance.findMany({
      where: { userId },
    });
    const balanceMap = new Map(balances.map((b) => [b.resource, b.amount]));
    for (const [resource, amount] of Object.entries(recipe.cost) as [
      ResourceType,
      number,
    ][]) {
      if ((balanceMap.get(resource) ?? 0) < amount) {
        throw new BadRequestException(
          `Not enough ${resource.toLowerCase()} — need ${amount}, have ${balanceMap.get(resource) ?? 0}`,
        );
      }
    }

    await this.prisma.$transaction([
      ...Object.entries(recipe.cost).map(([resource, amount]) =>
        this.prisma.resourceBalance.update({
          where: {
            userId_resource: { userId, resource: resource as ResourceType },
          },
          data: { amount: { decrement: amount } },
        }),
      ),
      this.prisma.craftedItemStock.upsert({
        where: { userId_buildingKey: { userId, buildingKey: recipe.key } },
        create: { userId, buildingKey: recipe.key, stock: 1, totalCrafted: 1 },
        update: { stock: { increment: 1 }, totalCrafted: { increment: 1 } },
      }),
    ]);

    return this.getState(userId);
  }

  async place(userId: string, buildingKey: string, x: number, y: number) {
    if (x < 0 || x >= OUTPOST_GRID_SIZE || y < 0 || y >= OUTPOST_GRID_SIZE) {
      throw new BadRequestException(
        `Coordinates must be within the ${OUTPOST_GRID_SIZE}x${OUTPOST_GRID_SIZE} grid`,
      );
    }
    const stock = await this.prisma.craftedItemStock.findUnique({
      where: { userId_buildingKey: { userId, buildingKey } },
    });
    if (!stock || stock.stock <= 0) {
      throw new BadRequestException(
        `No ${buildingKey} in stock — craft one first`,
      );
    }
    const occupied = await this.prisma.outpostBuilding.findUnique({
      where: { userId_x_y: { userId, x, y } },
    });
    if (occupied) {
      throw new BadRequestException(`(${x}, ${y}) is already occupied`);
    }

    await this.prisma.$transaction([
      this.prisma.craftedItemStock.update({
        where: { userId_buildingKey: { userId, buildingKey } },
        data: { stock: { decrement: 1 } },
      }),
      this.prisma.outpostBuilding.create({
        data: { userId, buildingKey, x, y },
      }),
    ]);

    return this.getState(userId);
  }

  // Each placed building is also a "station": a short mini-game the client
  // plays for a score (0-100), which scales the payout between 40% and 100%
  // of the station's base yield. Cooldown is enforced here, not the client,
  // since score/timing alone can't be trusted from the browser.
  async collectStation(userId: string, x: number, y: number, score: number) {
    const building = await this.prisma.outpostBuilding.findUnique({
      where: { userId_x_y: { userId, x, y } },
    });
    if (!building) {
      throw new NotFoundException('No building at that cell');
    }

    const station = stationFor(building.buildingKey);
    if (!station) {
      throw new BadRequestException(
        `${building.buildingKey} has no station to run`,
      );
    }

    if (building.lastCollectedAt) {
      const readyAt =
        building.lastCollectedAt.getTime() + station.cooldownSeconds * 1000;
      const remaining = Math.ceil((readyAt - Date.now()) / 1000);
      if (remaining > 0) {
        throw new BadRequestException(
          `Station is still cooling down — ${remaining}s left`,
        );
      }
    }

    const clampedScore = Math.max(0, Math.min(100, score));
    const multiplier = 0.4 + 0.6 * (clampedScore / 100);
    const collected: { resource: ResourceType; amount: number }[] =
      station.resource === 'ALL'
        ? RESOURCE_TYPES.map((resource) => ({
            resource,
            amount: Math.max(1, Math.round(station.baseYield * multiplier)),
          }))
        : [
            {
              resource: station.resource,
              amount: Math.max(1, Math.round(station.baseYield * multiplier)),
            },
          ];

    await this.prisma.$transaction([
      ...collected.map(({ resource, amount }) =>
        this.prisma.resourceBalance.upsert({
          where: { userId_resource: { userId, resource } },
          create: { userId, resource, amount },
          update: { amount: { increment: amount } },
        }),
      ),
      this.prisma.outpostBuilding.update({
        where: { id: building.id },
        data: { lastCollectedAt: new Date() },
      }),
    ]);

    const state = await this.getState(userId);
    return { ...state, collected } satisfies StationCollectResult;
  }

  async claimQuest(userId: string, questKey: string) {
    const quest = QUEST_CATALOG.find((q) => q.key === questKey);
    if (!quest) throw new NotFoundException(`Unknown quest "${questKey}"`);

    const existing = await this.prisma.questClaim.findUnique({
      where: { userId_questKey: { userId, questKey } },
    });
    if (existing) throw new BadRequestException('Quest already claimed');

    const inputs = await this.loadQuestInputs(userId);
    const { current, target } = this.progressForObjective(
      quest.objective,
      inputs,
    );
    if (current < target) {
      throw new BadRequestException('Quest objective not met yet');
    }

    const ops: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.questClaim.create({ data: { userId, questKey } }),
    ];
    if (quest.reward.stardust) {
      ops.push(
        this.prisma.gameProfile.upsert({
          where: { userId },
          create: { userId, stardust: quest.reward.stardust },
          update: { stardust: { increment: quest.reward.stardust } },
        }),
      );
    }
    if (quest.reward.resource && quest.reward.resourceAmount) {
      ops.push(
        this.prisma.resourceBalance.upsert({
          where: {
            userId_resource: { userId, resource: quest.reward.resource },
          },
          create: {
            userId,
            resource: quest.reward.resource,
            amount: quest.reward.resourceAmount,
          },
          update: { amount: { increment: quest.reward.resourceAmount } },
        }),
      );
    }
    await this.prisma.$transaction(ops);

    return this.getState(userId);
  }

  // The Asteroid Belt: needs no crafted building and no lesson, so a brand
  // new account always has something to do. "Mining" is answering one
  // Nova-generated question — the correct answer is held server-side in
  // Redis (never sent to the client) so it can't just be read out of the
  // network tab.
  async startAsteroidMining(userId: string): Promise<AsteroidQuestion> {
    const goals = await this.prisma.goal.findMany({
      where: { userId },
      select: { subject: true },
    });
    const topics = goals.length
      ? goals.map((g) => g.subject)
      : DEFAULT_ASTEROID_TOPICS;
    const topic = topics[Math.floor(Math.random() * topics.length)];

    const { questions } = await this.aiService.generateQuestions({
      topic,
      count: 1,
    });
    const picked = questions[0];
    if (!picked) {
      throw new ServiceUnavailableException(
        'Nova could not prepare a question right now — try again.',
      );
    }

    const attemptId = randomUUID();
    await this.redis.client.set(
      `asteroid:${attemptId}`,
      JSON.stringify({ userId, answer: picked.a }),
      'EX',
      ASTEROID_REDIS_TTL_SECONDS,
    );
    return { attemptId, question: picked.q };
  }

  async answerAsteroidMining(
    userId: string,
    attemptId: string,
    answer: string,
  ): Promise<AsteroidAnswerResult> {
    const key = `asteroid:${attemptId}`;
    const raw = await this.redis.client.get(key);
    if (!raw) {
      throw new BadRequestException(
        'That question expired — mine again for a new one.',
      );
    }
    await this.redis.client.del(key);

    const stored = JSON.parse(raw) as { userId: string; answer: string };
    if (stored.userId !== userId) {
      throw new BadRequestException(
        'That question expired — mine again for a new one.',
      );
    }

    if (!answersMatch(answer, stored.answer)) {
      return { correct: false, correctAnswer: stored.answer };
    }

    await this.prisma.resourceBalance.upsert({
      where: { userId_resource: { userId, resource: 'ICE' } },
      create: { userId, resource: 'ICE', amount: ASTEROID_REWARD_ICE },
      update: { amount: { increment: ASTEROID_REWARD_ICE } },
    });

    return { correct: true, awarded: ASTEROID_REWARD_ICE };
  }

  // Fires on every getState() call but is a no-op after the first time: a
  // brand new account has zero ResourceBalance rows of any kind, which can
  // never become true again once even one has been created (spending a
  // resource to 0 still leaves the row behind), so this can't re-trigger.
  private async ensureStarterKit(userId: string): Promise<void> {
    const count = await this.prisma.resourceBalance.count({
      where: { userId },
    });
    if (count > 0) return;
    await this.prisma.$transaction(
      RESOURCE_TYPES.map((resource) =>
        this.prisma.resourceBalance.create({
          data: { userId, resource, amount: STARTER_RESOURCE_AMOUNT },
        }),
      ),
    );
  }

  private async applyAutomation(
    userId: string,
  ): Promise<{ resource: ResourceType; amount: number }[]> {
    const buildings = await this.prisma.outpostBuilding.findMany({
      where: { userId },
    });
    const ops: Prisma.PrismaPromise<unknown>[] = [];
    const totals = new Map<ResourceType, number>();
    const intervalMs = AUTOMATION_INTERVAL_MINUTES * 60_000;
    const now = Date.now();

    for (const building of buildings) {
      const station = stationFor(building.buildingKey);
      if (!station) continue;

      const elapsedMs = now - building.lastAutomationAt.getTime();
      const ticks = Math.min(
        Math.floor(elapsedMs / intervalMs),
        AUTOMATION_MAX_TICKS,
      );
      if (ticks <= 0) continue;

      const amount = ticks * AUTOMATION_YIELD_PER_TICK;
      const resources: ResourceType[] =
        station.resource === 'ALL' ? RESOURCE_TYPES : [station.resource];
      for (const resource of resources) {
        ops.push(
          this.prisma.resourceBalance.upsert({
            where: { userId_resource: { userId, resource } },
            create: { userId, resource, amount },
            update: { amount: { increment: amount } },
          }),
        );
        totals.set(resource, (totals.get(resource) ?? 0) + amount);
      }
      ops.push(
        this.prisma.outpostBuilding.update({
          where: { id: building.id },
          data: {
            lastAutomationAt: new Date(
              building.lastAutomationAt.getTime() + ticks * intervalMs,
            ),
          },
        }),
      );
    }

    if (ops.length) await this.prisma.$transaction(ops);
    return [...totals.entries()].map(([resource, amount]) => ({
      resource,
      amount,
    }));
  }

  private async loadQuestInputs(userId: string): Promise<QuestInputs> {
    const [completedLessons, resources, stockRows, buildingRows] =
      await Promise.all([
        // distinct, not count() — a lesson completed more than once (see
        // ProgressService.completeLesson's replay support) must still only
        // count once toward "how many distinct lessons has this user done".
        this.prisma.lessonCompletion.findMany({
          where: { userId },
          select: { lessonId: true },
          distinct: ['lessonId'],
        }),
        this.prisma.resourceBalance.findMany({ where: { userId } }),
        this.prisma.craftedItemStock.findMany({ where: { userId } }),
        this.prisma.outpostBuilding.findMany({ where: { userId } }),
      ]);
    const placedCountByKey = new Map<string, number>();
    for (const b of buildingRows) {
      placedCountByKey.set(
        b.buildingKey,
        (placedCountByKey.get(b.buildingKey) ?? 0) + 1,
      );
    }
    return {
      lessonCount: completedLessons.length,
      resourceMap: new Map(resources.map((r) => [r.resource, r.amount])),
      totalCraftedMap: new Map(
        stockRows.map((s) => [s.buildingKey, s.totalCrafted]),
      ),
      placedTotal: buildingRows.length,
      placedCountByKey,
    };
  }

  private progressForObjective(
    objective: QuestObjective,
    inputs: QuestInputs,
  ): { current: number; target: number } {
    switch (objective.type) {
      case 'completeLessons':
        return { current: inputs.lessonCount, target: objective.count };
      case 'resourceBalance':
        return {
          current: inputs.resourceMap.get(objective.resource) ?? 0,
          target: objective.count,
        };
      case 'craftTotal':
        return {
          current: inputs.totalCraftedMap.get(objective.buildingKey) ?? 0,
          target: objective.count,
        };
      case 'placeTotal': {
        const current = objective.buildingKey
          ? (inputs.placedCountByKey.get(objective.buildingKey) ?? 0)
          : inputs.placedTotal;
        return { current, target: objective.count };
      }
    }
  }

  private toQuestProgress(
    quest: OutpostQuest,
    inputs: QuestInputs,
    claimedKeys: Set<string>,
  ): QuestProgress {
    const { current, target } = this.progressForObjective(
      quest.objective,
      inputs,
    );
    return {
      quest,
      current: Math.min(current, target),
      target,
      complete: current >= target,
      claimed: claimedKeys.has(quest.key),
    };
  }
}

function normalizeAnswer(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ');
}

// Same leniency spirit as the mini-games' client-side isAnswerCorrect:
// short answers (numbers, single words) need an exact match so "4" doesn't
// accept "40", but longer ones tolerate the student's phrasing being a
// substring/superset of the model's.
function answersMatch(given: string, correct: string): boolean {
  const a = normalizeAnswer(given);
  const b = normalizeAnswer(correct);
  if (!a || !b) return false;
  if (a === b) return true;
  if (b.length <= 3) return false;
  return a.includes(b) || b.includes(a);
}

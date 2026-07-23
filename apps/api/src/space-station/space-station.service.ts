import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AUTOMATION_INTERVAL_MINUTES,
  AUTOMATION_MAX_TICKS,
  AUTOMATION_YIELD_PER_TICK,
  RESOURCE_TYPES,
  SPACE_STATION_GRID_SIZE,
  STARTER_RESOURCE_AMOUNT,
  findSpaceStationRecipe,
  spaceStationStationFor,
  type ResourceType,
  type SpaceStationCollectResult,
  type SpaceStationState,
} from '@questly/shared-types';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SpaceStationService {
  constructor(private readonly prisma: PrismaService) {}

  async getState(userId: string): Promise<SpaceStationState> {
    await this.ensureStarterKit(userId);
    const automationCollected = await this.applyAutomation(userId);

    const [resourceRows, stockRows, buildingRows] = await Promise.all([
      this.prisma.resourceBalance.findMany({ where: { userId } }),
      this.prisma.craftedItemStock.findMany({ where: { userId } }),
      this.prisma.spaceStationBuilding.findMany({ where: { userId } }),
    ]);
    const resourceMap = new Map(
      resourceRows.map((r) => [r.resource, r.amount]),
    );

    return {
      resources: Object.fromEntries(
        RESOURCE_TYPES.map((r) => [r, resourceMap.get(r) ?? 0]),
      ) as Record<ResourceType, number>,
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
      automationCollected,
    };
  }

  async craft(userId: string, recipeKey: string) {
    const recipe = findSpaceStationRecipe(recipeKey);
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
    if (
      x < 0 ||
      x >= SPACE_STATION_GRID_SIZE ||
      y < 0 ||
      y >= SPACE_STATION_GRID_SIZE
    ) {
      throw new BadRequestException(
        `Coordinates must be within the ${SPACE_STATION_GRID_SIZE}x${SPACE_STATION_GRID_SIZE} grid`,
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
    const occupied = await this.prisma.spaceStationBuilding.findUnique({
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
      this.prisma.spaceStationBuilding.create({
        data: { userId, buildingKey, x, y },
      }),
    ]);

    return this.getState(userId);
  }

  async collectStation(userId: string, x: number, y: number, score: number) {
    const building = await this.prisma.spaceStationBuilding.findUnique({
      where: { userId_x_y: { userId, x, y } },
    });
    if (!building) {
      throw new NotFoundException('No building at that cell');
    }

    const station = spaceStationStationFor(building.buildingKey);
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
      this.prisma.spaceStationBuilding.update({
        where: { id: building.id },
        data: { lastCollectedAt: new Date() },
      }),
    ]);

    const state = await this.getState(userId);
    return { ...state, collected } satisfies SpaceStationCollectResult;
  }

  // Same "zero ResourceBalance rows of any kind" trigger as
  // OutpostService.ensureStarterKit — idempotent regardless of whether the
  // player visits the Outpost or the Space Station first.
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
    const buildings = await this.prisma.spaceStationBuilding.findMany({
      where: { userId },
    });
    const ops: Prisma.PrismaPromise<unknown>[] = [];
    const totals = new Map<ResourceType, number>();
    const intervalMs = AUTOMATION_INTERVAL_MINUTES * 60_000;
    const now = Date.now();

    for (const building of buildings) {
      const station = spaceStationStationFor(building.buildingKey);
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
        this.prisma.spaceStationBuilding.update({
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
}

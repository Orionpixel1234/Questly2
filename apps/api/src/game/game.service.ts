import { BadRequestException, Injectable } from '@nestjs/common';
import { SHIP_TIERS } from '@questly/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateProfile(userId: string) {
    return this.prisma.gameProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  // The map is always derived live from real Lesson/LessonCompletion rows —
  // there's no game-only data that could drift from actual progress.
  async starMap(userId: string) {
    const [lessons, completions, profile] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, title: true, subject: true },
        orderBy: { subject: 'asc' },
      }),
      this.prisma.lessonCompletion.findMany({
        where: { userId },
        select: { lessonId: true },
      }),
      this.getOrCreateProfile(userId),
    ]);

    const claimedIds = new Set(completions.map((c) => c.lessonId));
    const bySubject = new Map<
      string,
      { lessonId: string; title: string; claimed: boolean }[]
    >();
    for (const lesson of lessons) {
      const nodes = bySubject.get(lesson.subject) ?? [];
      nodes.push({
        lessonId: lesson.id,
        title: lesson.title,
        claimed: claimedIds.has(lesson.id),
      });
      bySubject.set(lesson.subject, nodes);
    }

    return {
      profile: { stardust: profile.stardust, shipTier: profile.shipTier },
      systems: [...bySubject.entries()].map(([subject, nodes]) => ({
        subject,
        nodes,
      })),
    };
  }

  async upgrade(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const nextTier = SHIP_TIERS.find((t) => t.tier === profile.shipTier + 1);
    if (!nextTier)
      throw new BadRequestException('Already at the top ship tier');
    if (profile.stardust < nextTier.cost) {
      throw new BadRequestException('Not enough stardust for this upgrade');
    }
    return this.prisma.gameProfile.update({
      where: { userId },
      data: { stardust: { decrement: nextTier.cost }, shipTier: nextTier.tier },
    });
  }

  async leaderboard() {
    const profiles = await this.prisma.gameProfile.findMany({
      where: { user: { banned: false } },
      orderBy: { stardust: 'desc' },
      take: 20,
      include: { user: { select: { name: true } } },
    });
    return profiles.map((p) => ({
      userId: p.userId,
      name: p.user.name,
      stardust: p.stardust,
      shipTier: p.shipTier,
    }));
  }

  // --- Admin moderation ---

  async listProfiles() {
    const profiles = await this.prisma.gameProfile.findMany({
      orderBy: { stardust: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });
    return profiles.map((p) => ({
      userId: p.userId,
      name: p.user.name,
      email: p.user.email,
      stardust: p.stardust,
      shipTier: p.shipTier,
    }));
  }

  async adjustStardust(userId: string, delta: number) {
    await this.getOrCreateProfile(userId);
    const profile = await this.prisma.gameProfile.findUniqueOrThrow({
      where: { userId },
    });
    const nextStardust = Math.max(0, profile.stardust + delta);
    return this.prisma.gameProfile.update({
      where: { userId },
      data: { stardust: nextStardust },
    });
  }

  async resetProfile(userId: string) {
    await this.getOrCreateProfile(userId);
    return this.prisma.gameProfile.update({
      where: { userId },
      data: { stardust: 0, shipTier: 1 },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

    const [
      usersByRole,
      totalLessons,
      publishedLessons,
      totalClasses,
      totalEnrollments,
      totalCompletions,
      expAgg,
      newUsers7d,
      newUsers30d,
    ] = await Promise.all([
      this.prisma.user.groupBy({ by: ['roleId'], _count: { _all: true } }),
      this.prisma.lesson.count(),
      this.prisma.lesson.count({ where: { published: true } }),
      this.prisma.class.count(),
      this.prisma.enrollment.count(),
      this.prisma.lessonCompletion.count(),
      this.prisma.goal.aggregate({ _sum: { exp: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    const roles = await this.prisma.role.findMany({ select: { id: true, name: true } });
    const roleNameById = new Map(roles.map((role) => [role.id, role.name]));
    const usersByRoleName: Record<string, number> = {
      admin: 0,
      author: 0,
      student: 0,
      educator: 0,
    };
    for (const row of usersByRole) {
      const name = roleNameById.get(row.roleId);
      if (name) usersByRoleName[name] = row._count._all;
    }
    const totalUsers = Object.values(usersByRoleName).reduce((sum, n) => sum + n, 0);

    return {
      totalUsers,
      usersByRole: usersByRoleName,
      newUsers7d,
      newUsers30d,
      totalLessons,
      publishedLessons,
      draftLessons: totalLessons - publishedLessons,
      totalClasses,
      totalEnrollments,
      totalCompletions,
      totalExpAwarded: expAgg._sum.exp ?? 0,
    };
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EXP_PER_LESSON, levelForExp } from '@questly/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { userId },
      orderBy: { subject: 'asc' },
    });
    return goals.map((goal) => ({
      subject: goal.subject,
      target: goal.target,
      exp: goal.exp,
      level: levelForExp(goal.exp),
    }));
  }

  // Idempotent: completing the same lesson twice is a 409, not double EXP.
  // If the student never set an explicit goal for the lesson's subject, one
  // is created with a starter target so the EXP has somewhere to land.
  async completeLesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson || !lesson.published) {
      throw new NotFoundException('Lesson not found');
    }

    const existing = await this.prisma.lessonCompletion.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    if (existing) {
      throw new ConflictException('Lesson already completed');
    }

    const [, goal] = await this.prisma.$transaction([
      this.prisma.lessonCompletion.create({
        data: { userId, lessonId, expAwarded: EXP_PER_LESSON },
      }),
      this.prisma.goal.upsert({
        where: { userId_subject: { userId, subject: lesson.subject } },
        create: {
          userId,
          subject: lesson.subject,
          target: 500,
          exp: EXP_PER_LESSON,
        },
        update: { exp: { increment: EXP_PER_LESSON } },
      }),
    ]);

    return {
      subject: goal.subject,
      exp: goal.exp,
      level: levelForExp(goal.exp),
      expAwarded: EXP_PER_LESSON,
    };
  }

  async completedLessonIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.lessonCompletion.findMany({
      where: { userId },
      select: { lessonId: true },
    });
    return rows.map((row) => row.lessonId);
  }

  async leaderboard() {
    const goals = await this.prisma.goal.groupBy({
      by: ['userId'],
      _sum: { exp: true },
    });
    const totals = new Map(goals.map((g) => [g.userId, g._sum.exp ?? 0]));
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...totals.keys()] } },
      select: { id: true, name: true },
    });
    return users
      .map((user) => {
        const totalExp = totals.get(user.id) ?? 0;
        return {
          userId: user.id,
          name: user.name,
          totalExp,
          level: levelForExp(totalExp),
        };
      })
      .sort((a, b) => b.totalExp - a.totalExp)
      .slice(0, 20);
  }
}

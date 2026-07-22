import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EXP_PER_LESSON,
  RESOURCE_PER_LESSON,
  STARDUST_PER_LESSON,
  levelForExp,
  resourceForSubject,
} from '@questly/shared-types';
import { gradeAnswers, parseLesson } from '@questly/lesson-dsl';
import type { AnswersPayload, OpenResponseBlock } from '@questly/lesson-dsl';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

export interface GradingActor {
  userId: string;
  role: string;
}

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
  // `answers` is optional and only meaningful for lessons with quiz blocks
  // (see LESSON_DSL.md's "Quiz blocks" section) — a plain content lesson is
  // completed exactly like before, no grading involved.
  async completeLesson(
    userId: string,
    lessonId: string,
    answers?: AnswersPayload,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson || lesson.status !== 'PUBLISHED') {
      throw new NotFoundException('Lesson not found');
    }

    const existing = await this.prisma.lessonCompletion.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    if (existing) {
      throw new ConflictException('Lesson already completed');
    }

    // Server-side grading is authoritative — the frontend's live preview
    // score (same gradeAnswers() call, run client-side for instant
    // feedback) is never trusted for what actually gets recorded.
    const grading =
      answers && Object.keys(answers).length > 0
        ? gradeParsedLesson(lesson.content, answers)
        : null;

    const [completion, goal] = await this.prisma.$transaction([
      this.prisma.lessonCompletion.create({
        data: {
          userId,
          lessonId,
          expAwarded: EXP_PER_LESSON,
          answers: answers ? (answers as Prisma.InputJsonValue) : undefined,
          autoScore: grading?.autoScore,
          autoTotal: grading?.autoTotal,
          manualTotal: grading?.manualTotal,
        },
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
      // Stardust — the game's currency — is awarded here and only here, in
      // the same transaction as the real completion, so the game can never
      // get ahead of (or fall behind) actual lesson progress.
      this.prisma.gameProfile.upsert({
        where: { userId },
        create: { userId, stardust: STARDUST_PER_LESSON },
        update: { stardust: { increment: STARDUST_PER_LESSON } },
      }),
      // Outpost mining — same rule: the only way to get a resource is to
      // complete the real lesson it's attached to. Which resource is a
      // deterministic hash of the subject (see resourceForSubject).
      this.prisma.resourceBalance.upsert({
        where: {
          userId_resource: {
            userId,
            resource: resourceForSubject(lesson.subject),
          },
        },
        create: {
          userId,
          resource: resourceForSubject(lesson.subject),
          amount: RESOURCE_PER_LESSON,
        },
        update: { amount: { increment: RESOURCE_PER_LESSON } },
      }),
    ]);

    return {
      subject: goal.subject,
      exp: goal.exp,
      level: levelForExp(goal.exp),
      expAwarded: EXP_PER_LESSON,
      grading: grading
        ? {
            autoScore: completion.autoScore,
            autoTotal: completion.autoTotal,
            manualTotal: completion.manualTotal,
            pendingManualGrading: (completion.manualTotal ?? 0) > 0,
          }
        : null,
    };
  }

  // Author/Educator see only their own lessons' pending submissions; Admin
  // sees everything. "Pending" = has OpenResponse points (manualTotal > 0)
  // that haven't been scored yet (gradedAt still null) — see the
  // LessonCompletion model comment for why there's no separate status field.
  async findPendingGrading(actor: GradingActor) {
    const completions = await this.prisma.lessonCompletion.findMany({
      where: {
        manualTotal: { gt: 0 },
        gradedAt: null,
        ...(actor.role === 'admin'
          ? {}
          : { lesson: { authorId: actor.userId } }),
      },
      include: {
        user: { select: { name: true, email: true } },
        lesson: { select: { id: true, title: true, content: true } },
      },
      orderBy: { completedAt: 'asc' },
    });

    return completions.map((completion) => {
      const parsed = parseLesson(completion.lesson.content);
      const answers = (completion.answers ?? {}) as AnswersPayload;
      const openQuestions = parsed.ok
        ? parsed.document.blocks
            .map((block, blockIndex) => ({ block, blockIndex }))
            .filter(
              (
                entry,
              ): entry is { block: OpenResponseBlock; blockIndex: number } =>
                entry.block.type === 'openResponse',
            )
            .map(({ block, blockIndex }) => ({
              blockIndex,
              question: block.question,
              answer:
                typeof answers[blockIndex] === 'string'
                  ? answers[blockIndex]
                  : '',
            }))
        : [];

      return {
        completionId: completion.id,
        lessonId: completion.lesson.id,
        lessonTitle: completion.lesson.title,
        studentName: completion.user.name,
        studentEmail: completion.user.email,
        submittedAt: completion.completedAt,
        manualTotal: completion.manualTotal,
        openQuestions,
      };
    });
  }

  async gradeSubmission(
    completionId: string,
    actor: GradingActor,
    dto: GradeSubmissionDto,
  ) {
    const completion = await this.prisma.lessonCompletion.findUnique({
      where: { id: completionId },
      include: { lesson: { select: { authorId: true } } },
    });
    if (!completion) throw new NotFoundException('Submission not found');
    if (actor.role !== 'admin' && completion.lesson.authorId !== actor.userId) {
      throw new ForbiddenException('Not your lesson');
    }
    if ((completion.manualTotal ?? 0) === 0) {
      throw new BadRequestException(
        'This submission has nothing to manually grade',
      );
    }
    if (dto.manualScore > (completion.manualTotal ?? 0)) {
      throw new BadRequestException(
        `manualScore cannot exceed manualTotal (${completion.manualTotal})`,
      );
    }

    return this.prisma.lessonCompletion.update({
      where: { id: completionId },
      data: {
        manualScore: dto.manualScore,
        feedback: dto.feedback
          ? (dto.feedback as Prisma.InputJsonValue)
          : undefined,
        gradedAt: new Date(),
      },
    });
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

// A malformed/unparseable lesson.content is only possible for lessons
// authored before this grammar existed, or hand-edited outside the app — in
// that case grading degrades to "not graded" rather than 500ing the whole
// completion request.
function gradeParsedLesson(content: string, answers: AnswersPayload) {
  const parsed = parseLesson(content);
  if (!parsed.ok) return null;
  const result = gradeAnswers(parsed.document, answers);
  return result.hasGradableBlocks ? result : null;
}

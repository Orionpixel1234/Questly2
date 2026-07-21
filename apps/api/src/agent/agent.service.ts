import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { AgentProgressDto } from './dto/agent-progress.dto';

@Injectable()
export class AgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressService: ProgressService,
  ) {}

  // Always logs the raw event first (real audit trail regardless of
  // outcome), then — only for "completed" — routes through the exact same
  // completeLesson() the in-app "Mark complete" button uses, so EXP and
  // Stardust follow identical rules no matter who triggered the completion.
  async logProgress(dto: AgentProgressDto) {
    const [user, lesson] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.user_id } }),
      this.prisma.lesson.findUnique({ where: { id: dto.lesson_id } }),
    ]);
    if (!user) throw new NotFoundException(`No user with id "${dto.user_id}"`);
    if (!lesson)
      throw new NotFoundException(`No lesson with id "${dto.lesson_id}"`);

    const status =
      dto.completion_status === 'completed' ? 'COMPLETED' : 'IN_PROGRESS';

    await this.prisma.agentActivityLog.create({
      data: {
        userId: dto.user_id,
        lessonId: dto.lesson_id,
        status,
        userResponses: toJsonInput(dto.user_responses),
        metadata: toJsonInput(dto.metadata),
        clientTimestamp: parseTimestamp(dto.timestamp),
      },
    });

    if (status !== 'COMPLETED') {
      return { logged: true, completion: null };
    }

    try {
      const completion = await this.progressService.completeLesson(
        dto.user_id,
        dto.lesson_id,
      );
      return { logged: true, completion };
    } catch (error) {
      // Already completed — the agent retried, or fired the webhook twice.
      // Not an error from the caller's point of view, just a no-op.
      if (error instanceof ConflictException) {
        return { logged: true, completion: null, alreadyCompleted: true };
      }
      // Lesson exists but isn't PUBLISHED — the log still succeeded (it's a
      // real record either way), there's just no EXP/Stardust to award.
      if (error instanceof NotFoundException) {
        return {
          logged: true,
          completion: null,
          reason: 'lesson not published',
        };
      }
      throw error;
    }
  }

  async status() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      service: 'questly-api',
      time: new Date().toISOString(),
    };
  }
}

function parseTimestamp(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (value as Prisma.InputJsonValue);
}

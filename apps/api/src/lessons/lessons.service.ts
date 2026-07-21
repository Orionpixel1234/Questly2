import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { RejectLessonDto } from './dto/reject-lesson.dto';

export interface LessonActor {
  userId: string;
  role: string;
}

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  create(authorId: string, dto: CreateLessonDto) {
    return this.prisma.lesson.create({
      data: { ...dto, status: 'DRAFT', authorId },
    });
  }

  findMine(authorId: string) {
    return this.prisma.lesson.findMany({
      where: { authorId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findPublished(subject?: string) {
    return this.prisma.lesson.findMany({
      where: { status: 'PUBLISHED', ...(subject ? { subject } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin review queue — every lesson currently awaiting a decision,
  // regardless of author.
  findPending() {
    return this.prisma.lesson.findMany({
      where: { status: 'PENDING_REVIEW' },
      orderBy: { updatedAt: 'asc' },
      include: { author: { select: { name: true, email: true } } },
    });
  }

  async findOne(id: string, actor: LessonActor) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (
      lesson.status !== 'PUBLISHED' &&
      !this.canManage(lesson.authorId, actor)
    ) {
      throw new ForbiddenException('This lesson is not published');
    }
    return lesson;
  }

  // Non-admin edits to a lesson that's already PUBLISHED or PENDING_REVIEW
  // pull it back to DRAFT — otherwise an author could sneak changes into an
  // approved lesson without another review pass. Admins are trusted to edit
  // in place (e.g. fixing a typo post-approval) without resetting status.
  async update(id: string, actor: LessonActor, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (!this.canManage(lesson.authorId, actor)) {
      throw new ForbiddenException('Not your lesson');
    }
    const needsResubmit =
      actor.role !== 'admin' &&
      (lesson.status === 'PUBLISHED' || lesson.status === 'PENDING_REVIEW');
    return this.prisma.lesson.update({
      where: { id },
      data: needsResubmit
        ? { ...dto, status: 'DRAFT', rejectionNote: null }
        : dto,
    });
  }

  async remove(id: string, actor: LessonActor): Promise<void> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (!this.canManage(lesson.authorId, actor)) {
      throw new ForbiddenException('Not your lesson');
    }
    await this.prisma.lesson.delete({ where: { id } });
  }

  // DRAFT or REJECTED -> PENDING_REVIEW. Owner (or admin) only.
  async submit(id: string, actor: LessonActor) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (!this.canManage(lesson.authorId, actor)) {
      throw new ForbiddenException('Not your lesson');
    }
    if (lesson.status !== 'DRAFT' && lesson.status !== 'REJECTED') {
      throw new BadRequestException(
        `Cannot submit a lesson that is ${lesson.status.toLowerCase()}`,
      );
    }
    return this.prisma.lesson.update({
      where: { id },
      data: { status: 'PENDING_REVIEW', rejectionNote: null },
    });
  }

  async approve(id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Lesson is not awaiting review');
    }
    return this.prisma.lesson.update({
      where: { id },
      data: { status: 'PUBLISHED', rejectionNote: null },
    });
  }

  async reject(id: string, dto: RejectLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Lesson is not awaiting review');
    }
    return this.prisma.lesson.update({
      where: { id },
      data: { status: 'REJECTED', rejectionNote: dto.note ?? null },
    });
  }

  private canManage(authorId: string, actor: LessonActor): boolean {
    return actor.role === 'admin' || actor.userId === authorId;
  }
}

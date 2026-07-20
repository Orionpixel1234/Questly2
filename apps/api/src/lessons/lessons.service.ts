import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

export interface LessonActor {
  userId: string;
  role: string;
}

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  create(authorId: string, dto: CreateLessonDto) {
    return this.prisma.lesson.create({
      data: { ...dto, published: dto.published ?? false, authorId },
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
      where: { published: true, ...(subject ? { subject } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actor: LessonActor) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (!lesson.published && !this.canManage(lesson.authorId, actor)) {
      throw new ForbiddenException('This lesson is not published');
    }
    return lesson;
  }

  async update(id: string, actor: LessonActor, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (!this.canManage(lesson.authorId, actor)) {
      throw new ForbiddenException('Not your lesson');
    }
    return this.prisma.lesson.update({ where: { id }, data: dto });
  }

  async remove(id: string, actor: LessonActor): Promise<void> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (!this.canManage(lesson.authorId, actor)) {
      throw new ForbiddenException('Not your lesson');
    }
    await this.prisma.lesson.delete({ where: { id } });
  }

  private canManage(authorId: string, actor: LessonActor): boolean {
    return actor.role === 'admin' || actor.userId === authorId;
  }
}

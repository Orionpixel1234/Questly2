import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';

export interface ClassActor {
  userId: string;
  role: string;
}

const ROSTER_STUDENT_SELECT = { id: true, name: true, email: true } as const;

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  create(educatorId: string, dto: CreateClassDto) {
    return this.prisma.class.create({ data: { ...dto, educatorId } });
  }

  findMine(educatorId: string) {
    return this.prisma.class.findMany({
      where: { educatorId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { enrollments: true } } },
    });
  }

  async findEnrolled(studentId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId },
      include: {
        class: {
          include: {
            educator: { select: { name: true } },
            _count: { select: { enrollments: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return enrollments.map((enrollment) => enrollment.class);
  }

  async roster(classId: string, actor: ClassActor) {
    const klass = await this.requireOwnedClass(classId, actor);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId: klass.id },
      include: { student: { select: ROSTER_STUDENT_SELECT } },
      orderBy: { createdAt: 'asc' },
    });
    return enrollments.map((enrollment) => enrollment.student);
  }

  async enroll(classId: string, actor: ClassActor, dto: EnrollStudentDto) {
    const klass = await this.requireOwnedClass(classId, actor);
    const student = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });
    if (!student) throw new NotFoundException('No user with that email');
    if (student.role.name !== 'student') {
      throw new ConflictException('Only students can be enrolled');
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: {
        classId_studentId: { classId: klass.id, studentId: student.id },
      },
    });
    if (existing) throw new ConflictException('Already enrolled');

    await this.prisma.enrollment.create({
      data: { classId: klass.id, studentId: student.id },
    });
    return { id: student.id, name: student.name, email: student.email };
  }

  async unenroll(
    classId: string,
    studentId: string,
    actor: ClassActor,
  ): Promise<void> {
    const klass = await this.requireOwnedClass(classId, actor);
    await this.prisma.enrollment.deleteMany({
      where: { classId: klass.id, studentId },
    });
  }

  private async requireOwnedClass(classId: string, actor: ClassActor) {
    const klass = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!klass) throw new NotFoundException('Class not found');
    if (actor.role !== 'admin' && klass.educatorId !== actor.userId) {
      throw new ForbiddenException('Not your class');
    }
    return klass;
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateCalendarEventDto) {
    return this.prisma.calendarEvent.create({
      data: {
        userId,
        title: dto.title,
        subject: dto.subject,
        classId: dto.classId,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
      },
    });
  }

  findMine(userId: string) {
    return this.prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: { startTime: 'asc' },
    });
  }

  async update(id: string, userId: string, dto: UpdateCalendarEventDto) {
    const event = await this.requireOwned(id, userId);
    return this.prisma.calendarEvent.update({
      where: { id: event.id },
      data: {
        ...dto,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      },
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const event = await this.requireOwned(id, userId);
    await this.prisma.calendarEvent.delete({ where: { id: event.id } });
  }

  private async requireOwned(id: string, userId: string) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Calendar event not found');
    if (event.userId !== userId)
      throw new ForbiddenException('Not your calendar event');
    return event;
  }
}

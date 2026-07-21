import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calendar/events')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  create(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: CreateCalendarEventDto,
  ) {
    return this.calendarService.create(req.user.userId, dto);
  }

  @Get()
  findMine(@Req() req: Request & { user: RequestUser }) {
    return this.calendarService.findMine(req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: Request & { user: RequestUser },
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.calendarService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request & { user: RequestUser }) {
    return this.calendarService.remove(id, req.user.userId);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@ApiTags('lessons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @UseGuards(RolesGuard)
  @Roles('author', 'admin')
  @Post()
  create(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: CreateLessonDto,
  ) {
    return this.lessonsService.create(req.user.userId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('author', 'admin')
  @Get('mine')
  findMine(@Req() req: Request & { user: RequestUser }) {
    return this.lessonsService.findMine(req.user.userId);
  }

  @Get()
  findPublished(@Query('subject') subject?: string) {
    return this.lessonsService.findPublished(subject);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.lessonsService.findOne(id, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles('author', 'admin')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: Request & { user: RequestUser },
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessonsService.update(id, req.user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('author', 'admin')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request & { user: RequestUser }) {
    return this.lessonsService.remove(id, req.user);
  }
}

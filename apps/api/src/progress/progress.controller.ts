import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@ApiTags('progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('me')
  findMine(@Req() req: Request & { user: RequestUser }) {
    return this.progressService.findMine(req.user.userId);
  }

  @Get('completed')
  completed(@Req() req: Request & { user: RequestUser }) {
    return this.progressService.completedLessonIds(req.user.userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('lessons/:lessonId/complete')
  completeLesson(
    @Param('lessonId') lessonId: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.progressService.completeLesson(req.user.userId, lessonId);
  }

  @Get('leaderboard')
  leaderboard() {
    return this.progressService.leaderboard();
  }
}

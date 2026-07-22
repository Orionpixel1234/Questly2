import {
  Body,
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
import type { AnswersPayload } from '@questly/lesson-dsl';
import { ProgressService } from './progress.service';
import { CompleteLessonDto } from './dto/complete-lesson.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
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
    @Body() dto: CompleteLessonDto,
  ) {
    return this.progressService.completeLesson(
      req.user.userId,
      lessonId,
      dto.answers as AnswersPayload | undefined,
    );
  }

  @Get('leaderboard')
  leaderboard() {
    return this.progressService.leaderboard();
  }

  @UseGuards(RolesGuard)
  @Roles('author', 'educator', 'admin')
  @Get('grading/pending')
  findPendingGrading(@Req() req: Request & { user: RequestUser }) {
    return this.progressService.findPendingGrading({
      userId: req.user.userId,
      role: req.user.role,
    });
  }

  @UseGuards(RolesGuard)
  @Roles('author', 'educator', 'admin')
  @HttpCode(HttpStatus.OK)
  @Post('grading/:completionId')
  gradeSubmission(
    @Param('completionId') completionId: string,
    @Req() req: Request & { user: RequestUser },
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.progressService.gradeSubmission(
      completionId,
      { userId: req.user.userId, role: req.user.role },
      dto,
    );
  }
}

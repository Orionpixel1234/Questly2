import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { GenerateLessonDto } from './dto/generate-lesson.dto';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('status')
  status() {
    return { configured: this.aiService.isConfigured };
  }

  @Post('chat')
  async chat(@Body() dto: ChatDto) {
    const reply = await this.aiService.chat(dto);
    return { reply };
  }

  @UseGuards(RolesGuard)
  @Roles('author', 'educator', 'admin')
  @Post('generate-lesson')
  generateLesson(@Body() dto: GenerateLessonDto) {
    return this.aiService.generateLesson(dto);
  }

  // Open to every role — every role plays the mini-games.
  @Post('generate-questions')
  generateQuestions(@Body() dto: GenerateQuestionsDto) {
    return this.aiService.generateQuestions(dto);
  }
}

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
}

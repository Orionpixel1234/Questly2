import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { AgentProgressDto } from './dto/agent-progress.dto';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';

// External-integration surface (e.g. a Zapier AI Agent). Deliberately its
// own controller/guard, separate from every user-facing route — this is a
// service credential (X-Api-Key), not a user session (JwtAuthGuard).
@ApiTags('agent')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('status')
  status() {
    return this.agentService.status();
  }

  @HttpCode(HttpStatus.OK)
  @Post('progress')
  logProgress(@Body() dto: AgentProgressDto) {
    return this.agentService.logProgress(dto);
  }
}

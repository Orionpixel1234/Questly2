import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [ProgressModule],
  providers: [AgentService],
  controllers: [AgentController],
})
export class AgentModule {}

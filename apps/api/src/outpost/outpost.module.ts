import { Module } from '@nestjs/common';
import { OutpostService } from './outpost.service';
import { OutpostController } from './outpost.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [OutpostService],
  controllers: [OutpostController],
  exports: [OutpostService],
})
export class OutpostModule {}

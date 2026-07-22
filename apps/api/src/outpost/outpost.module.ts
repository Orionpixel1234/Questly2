import { Module } from '@nestjs/common';
import { OutpostService } from './outpost.service';
import { OutpostController } from './outpost.controller';

@Module({
  providers: [OutpostService],
  controllers: [OutpostController],
  exports: [OutpostService],
})
export class OutpostModule {}

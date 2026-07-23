import { Module } from '@nestjs/common';
import { SpaceStationService } from './space-station.service';
import { SpaceStationController } from './space-station.controller';

@Module({
  providers: [SpaceStationService],
  controllers: [SpaceStationController],
  exports: [SpaceStationService],
})
export class SpaceStationModule {}

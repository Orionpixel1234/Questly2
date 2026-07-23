import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SpaceStationService } from './space-station.service';
import { CraftDto } from './dto/craft.dto';
import { PlaceDto } from './dto/place.dto';
import { CollectStationDto } from './dto/collect-station.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

// Open to every role — same "everyone plays" rule as /outpost and /game.
@ApiTags('space-station')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('space-station')
export class SpaceStationController {
  constructor(private readonly spaceStationService: SpaceStationService) {}

  @Get()
  getState(@Req() req: Request & { user: RequestUser }) {
    return this.spaceStationService.getState(req.user.userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('craft')
  craft(@Req() req: Request & { user: RequestUser }, @Body() dto: CraftDto) {
    return this.spaceStationService.craft(req.user.userId, dto.recipeKey);
  }

  @HttpCode(HttpStatus.OK)
  @Post('place')
  place(@Req() req: Request & { user: RequestUser }, @Body() dto: PlaceDto) {
    return this.spaceStationService.place(
      req.user.userId,
      dto.buildingKey,
      dto.x,
      dto.y,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('stations/collect')
  collectStation(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: CollectStationDto,
  ) {
    return this.spaceStationService.collectStation(
      req.user.userId,
      dto.x,
      dto.y,
      dto.score,
    );
  }
}

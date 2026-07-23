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
import { OutpostService } from './outpost.service';
import { CraftDto } from './dto/craft.dto';
import { PlaceDto } from './dto/place.dto';
import { CollectStationDto } from './dto/collect-station.dto';
import { AsteroidAnswerDto } from './dto/asteroid-answer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

// Open to every role — same "everyone plays" rule as /game.
@ApiTags('outpost')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('outpost')
export class OutpostController {
  constructor(private readonly outpostService: OutpostService) {}

  @Get()
  getState(@Req() req: Request & { user: RequestUser }) {
    return this.outpostService.getState(req.user.userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('craft')
  craft(@Req() req: Request & { user: RequestUser }, @Body() dto: CraftDto) {
    return this.outpostService.craft(req.user.userId, dto.recipeKey);
  }

  @HttpCode(HttpStatus.OK)
  @Post('place')
  place(@Req() req: Request & { user: RequestUser }, @Body() dto: PlaceDto) {
    return this.outpostService.place(
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
    return this.outpostService.collectStation(
      req.user.userId,
      dto.x,
      dto.y,
      dto.score,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('asteroid/start')
  startAsteroid(@Req() req: Request & { user: RequestUser }) {
    return this.outpostService.startAsteroidMining(req.user.userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('asteroid/answer')
  answerAsteroid(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: AsteroidAnswerDto,
  ) {
    return this.outpostService.answerAsteroidMining(
      req.user.userId,
      dto.attemptId,
      dto.answer,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('quests/:questKey/claim')
  claimQuest(
    @Req() req: Request & { user: RequestUser },
    @Param('questKey') questKey: string,
  ) {
    return this.outpostService.claimQuest(req.user.userId, questKey);
  }
}

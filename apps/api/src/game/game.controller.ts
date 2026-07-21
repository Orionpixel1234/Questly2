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
import { GameService } from './game.service';
import { AdjustStardustDto } from './dto/adjust-stardust.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@ApiTags('game')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  // Open to every role — the whole point is that anyone can play.
  @Get('map')
  map(@Req() req: Request & { user: RequestUser }) {
    return this.gameService.starMap(req.user.userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('upgrade')
  upgrade(@Req() req: Request & { user: RequestUser }) {
    return this.gameService.upgrade(req.user.userId);
  }

  @Get('leaderboard')
  leaderboard() {
    return this.gameService.leaderboard();
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('profiles')
  listProfiles() {
    return this.gameService.listProfiles();
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @Post('profiles/:userId/adjust')
  adjust(@Param('userId') userId: string, @Body() dto: AdjustStardustDto) {
    return this.gameService.adjustStardust(userId, dto.delta);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @Post('profiles/:userId/reset')
  reset(@Param('userId') userId: string) {
    return this.gameService.resetProfile(userId);
  }
}

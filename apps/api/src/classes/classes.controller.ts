import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

@ApiTags('classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @UseGuards(RolesGuard)
  @Roles('educator', 'admin')
  @Post()
  create(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: CreateClassDto,
  ) {
    return this.classesService.create(req.user.userId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('educator', 'admin')
  @Get('mine')
  findMine(@Req() req: Request & { user: RequestUser }) {
    return this.classesService.findMine(req.user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles('student')
  @Get('enrolled')
  findEnrolled(@Req() req: Request & { user: RequestUser }) {
    return this.classesService.findEnrolled(req.user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles('educator', 'admin')
  @Get(':id/roster')
  roster(@Param('id') id: string, @Req() req: Request & { user: RequestUser }) {
    return this.classesService.roster(id, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles('educator', 'admin')
  @Post(':id/roster')
  enroll(
    @Param('id') id: string,
    @Req() req: Request & { user: RequestUser },
    @Body() dto: EnrollStudentDto,
  ) {
    return this.classesService.enroll(id, req.user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('educator', 'admin')
  @Delete(':id/roster/:studentId')
  unenroll(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.classesService.unenroll(id, studentId, req.user);
  }
}

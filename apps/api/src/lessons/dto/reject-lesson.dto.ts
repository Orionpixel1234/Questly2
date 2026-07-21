import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RejectLessonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

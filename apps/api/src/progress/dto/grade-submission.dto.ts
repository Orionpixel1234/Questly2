import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, Min } from 'class-validator';

export class GradeSubmissionDto {
  @ApiProperty({ description: 'Points awarded across all OpenResponse blocks' })
  @IsInt()
  @Min(0)
  manualScore!: number;

  @ApiPropertyOptional({ description: 'Block index -> written feedback' })
  @IsOptional()
  @IsObject()
  feedback?: Record<string, string>;
}

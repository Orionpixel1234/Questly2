import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

// No `status` field here either — see CreateLessonDto for why.
export class UpdateLessonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'LessonML source — see LESSON_DSL.md' })
  @IsOptional()
  @IsString()
  content?: string;
}

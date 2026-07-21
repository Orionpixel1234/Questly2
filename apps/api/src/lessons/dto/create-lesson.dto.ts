import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

// No `published`/`status` field here on purpose — every new lesson starts
// DRAFT. Status only ever changes via the dedicated submit/approve/reject
// endpoints, so "published" can't be set by just posting a flag.
export class CreateLessonDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsString()
  subject!: string;

  @ApiPropertyOptional({ description: 'LessonML source — see LESSON_DSL.md' })
  @IsOptional()
  @IsString()
  content?: string;
}

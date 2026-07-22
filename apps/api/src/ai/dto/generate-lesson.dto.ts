import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class GenerateLessonDto {
  @ApiProperty({ description: 'What the lesson should cover' })
  @IsString()
  @MinLength(1)
  topic!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ example: '5th grade' })
  @IsOptional()
  @IsString()
  gradeLevel?: string;
}

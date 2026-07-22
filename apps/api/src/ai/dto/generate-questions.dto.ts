import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateQuestionsDto {
  @ApiProperty({ description: 'Study topic to generate Q&A pairs for' })
  @IsString()
  @MinLength(1)
  topic!: string;

  @ApiPropertyOptional({ minimum: 5, maximum: 75, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(75)
  count?: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AsteroidAnswerDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  attemptId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  answer!: string;
}

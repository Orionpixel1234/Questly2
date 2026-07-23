import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CraftDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  recipeKey!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CraftDto {
  @ApiProperty({ description: 'OutpostRecipe.key from @questly/shared-types' })
  @IsString()
  @MinLength(1)
  recipeKey!: string;
}

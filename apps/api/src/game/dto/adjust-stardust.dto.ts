import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AdjustStardustDto {
  @ApiProperty({ description: 'Positive to grant, negative to deduct' })
  @IsInt()
  delta!: number;
}

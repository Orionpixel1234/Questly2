import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';
import { OUTPOST_GRID_SIZE } from '@questly/shared-types';

export class PlaceDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  buildingKey!: string;

  @ApiProperty({ minimum: 0, maximum: OUTPOST_GRID_SIZE - 1 })
  @IsInt()
  @Min(0)
  @Max(OUTPOST_GRID_SIZE - 1)
  x!: number;

  @ApiProperty({ minimum: 0, maximum: OUTPOST_GRID_SIZE - 1 })
  @IsInt()
  @Min(0)
  @Max(OUTPOST_GRID_SIZE - 1)
  y!: number;
}

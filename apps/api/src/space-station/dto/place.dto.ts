import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';
import { SPACE_STATION_GRID_SIZE } from '@questly/shared-types';

export class PlaceDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  buildingKey!: string;

  @ApiProperty({ minimum: 0, maximum: SPACE_STATION_GRID_SIZE - 1 })
  @IsInt()
  @Min(0)
  @Max(SPACE_STATION_GRID_SIZE - 1)
  x!: number;

  @ApiProperty({ minimum: 0, maximum: SPACE_STATION_GRID_SIZE - 1 })
  @IsInt()
  @Min(0)
  @Max(SPACE_STATION_GRID_SIZE - 1)
  y!: number;
}

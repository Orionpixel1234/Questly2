import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { SPACE_STATION_GRID_SIZE } from '@questly/shared-types';

export class CollectStationDto {
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

  @ApiProperty({
    minimum: 0,
    maximum: 100,
    description: 'Mini-game accuracy score (0-100) — scales the payout.',
  })
  @IsInt()
  @Min(0)
  @Max(100)
  score!: number;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class BanUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

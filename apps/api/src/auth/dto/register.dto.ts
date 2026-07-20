import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { UserRole } from '@questly/shared-types';

const ROLES: UserRole[] = ['admin', 'author', 'student', 'educator'];
const GOAL_TYPES = ['studying', 'teaching'] as const;

export class GoalInputDto {
  @ApiProperty({ description: 'Free-text subject name, matches `subjects`' })
  @IsString()
  subject!: string;

  @ApiProperty({ description: 'Target EXP for this subject' })
  @IsInt()
  @Min(1)
  target!: number;
}

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: ROLES })
  @IsIn(ROLES)
  role!: UserRole;

  @ApiPropertyOptional({ enum: GOAL_TYPES })
  @IsOptional()
  @IsIn(GOAL_TYPES)
  goalType?: (typeof GOAL_TYPES)[number];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  degreeTrack?: string;

  @ApiPropertyOptional({ type: [GoalInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoalInputDto)
  goals?: GoalInputDto[];
}

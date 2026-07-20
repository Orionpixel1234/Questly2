import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { UserRole } from '@questly/shared-types';

const ROLES: UserRole[] = ['admin', 'author', 'student', 'educator'];

export class UpdateRoleDto {
  @ApiProperty({ enum: ROLES })
  @IsIn(ROLES)
  role!: UserRole;
}

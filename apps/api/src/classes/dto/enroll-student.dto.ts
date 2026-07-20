import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class EnrollStudentDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}

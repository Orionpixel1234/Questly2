import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

// snake_case is deliberate here, unlike every other DTO in this API — this
// one is the external contract a Zapier (or any other) agent posts against,
// and snake_case is the Zapier/webhook convention. Every other endpoint
// stays camelCase; this is the one intentional boundary exception.
export class AgentProgressDto {
  @ApiProperty({ description: 'Questly lesson id (Lesson.id)' })
  @IsString()
  lesson_id!: string;

  @ApiProperty({ description: 'Questly user id (User.id)' })
  @IsString()
  user_id!: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 — when the agent recorded this event',
  })
  @IsOptional()
  @IsString()
  timestamp?: string;

  @ApiProperty({ enum: ['in_progress', 'completed'] })
  @IsIn(['in_progress', 'completed'])
  completion_status!: 'in_progress' | 'completed';

  @ApiPropertyOptional({
    description: 'Free-form — whatever the agent captured from the user',
  })
  @IsOptional()
  user_responses?: unknown;

  @ApiPropertyOptional({
    description: 'Free-form — agent/run identifiers, etc.',
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

// Keyed by block index (see libs/lesson-dsl's grading.ts) — omitted
// entirely for lessons with no quiz blocks, same as today's plain
// "mark complete" click.
export class CompleteLessonDto {
  @ApiPropertyOptional({
    description: 'Block index -> answer, for lessons with quiz blocks',
  })
  @IsOptional()
  @IsObject()
  answers?: Record<string, unknown>;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ChatTurnDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsString()
  role!: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  content!: string;
}

export class ChatDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  message!: string;

  // Prior turns from this conversation, sent by the client (no server-side
  // chat history storage in v1 — see AiModule's doc comment).
  @ApiPropertyOptional({ type: [ChatTurnDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  history?: ChatTurnDto[];

  // Free-text context the frontend already has on screen (e.g. the current
  // lesson's title + a content excerpt) so Nova can answer "what is this
  // lesson about" without a separate retrieval step.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  context?: string;
}

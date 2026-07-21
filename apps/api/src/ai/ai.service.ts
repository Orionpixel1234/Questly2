import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER } from './ai.constants';
import type { AiProvider } from './ai-provider';
import type { ChatDto } from './dto/chat.dto';

const SYSTEM_PROMPT = `You are Nova, the built-in AI tutor for Questly, a learning platform covering
subjects from grade-school arithmetic to college-level coursework. Be encouraging, concise, and
accurate. If the student shares context about a specific lesson, ground your answer in it. If you
don't know something, say so rather than guessing.`;

@Injectable()
export class AiService {
  constructor(@Inject(AI_PROVIDER) private readonly provider: AiProvider) {}

  get isConfigured(): boolean {
    return this.provider.available;
  }

  async chat(dto: ChatDto): Promise<string> {
    const system = dto.context
      ? `${SYSTEM_PROMPT}\n\nCurrent context the student is looking at:\n${dto.context}`
      : SYSTEM_PROMPT;

    const turns = [
      ...(dto.history ?? []),
      { role: 'user' as const, content: dto.message },
    ];
    return this.provider.chat(turns, system);
  }
}

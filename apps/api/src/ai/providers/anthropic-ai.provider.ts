import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { AiProvider, ChatTurn } from '../ai-provider';

const MODEL = 'claude-opus-4-8';

@Injectable()
export class AnthropicAiProvider implements AiProvider {
  private readonly logger = new Logger(AnthropicAiProvider.name);
  private readonly client: Anthropic;
  readonly available = true;

  constructor() {
    // No apiKey option — the SDK resolves ANTHROPIC_API_KEY from the
    // environment itself; this class is only ever constructed when that's
    // confirmed present (see AiModule).
    this.client = new Anthropic();
  }

  async chat(turns: ChatTurn[], systemPrompt: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: turns.map((turn) => ({
          role: turn.role,
          content: turn.content,
        })),
      });

      if (response.stop_reason === 'refusal') {
        return "I can't help with that one.";
      }

      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text',
      );
      return (
        textBlock?.text ?? "I didn't get a text response back — try rephrasing?"
      );
    } catch (error) {
      this.logger.error('Anthropic API call failed', error);
      return 'Nova is having trouble reaching its brain right now — try again in a moment.';
    }
  }
}

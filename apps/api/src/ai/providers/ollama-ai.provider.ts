import { Injectable, Logger } from '@nestjs/common';
import type { AiProvider, ChatTurn } from '../ai-provider';

interface OllamaChatResponse {
  message?: { content?: string };
}

// A free, local alternative to AnthropicAiProvider — runs a small
// open-source model through Ollama (https://ollama.com) on the same
// machine as the API, no API key or billing involved. Implements the exact
// same AiProvider interface, so AiModule can swap it in without touching
// AiController/AiService or the frontend at all.
@Injectable()
export class OllamaAiProvider implements AiProvider {
  private readonly logger = new Logger(OllamaAiProvider.name);
  readonly available = true;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.baseUrl = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434';
    this.model = process.env['OLLAMA_MODEL'] ?? 'llama3.2';
  }

  async chat(turns: ChatTurn[], systemPrompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          // Ollama's default temperature (~0.8) is tuned for open-ended
          // chat; small local models like llama3.2 drift off-format far
          // more often at that setting when asked for exact structured
          // output (JSON question lists, LessonML). 0.4 cuts that drift
          // substantially while still reading naturally in plain chat.
          options: { temperature: 0.4 },
          messages: [
            { role: 'system', content: systemPrompt },
            ...turns.map((turn) => ({
              role: turn.role,
              content: turn.content,
            })),
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Ollama responded with ${response.status}: ${await response.text()}`,
        );
      }

      const data = (await response.json()) as OllamaChatResponse;
      return (
        data.message?.content ??
        "I didn't get a text response back — try rephrasing?"
      );
    } catch (error) {
      this.logger.error('Ollama call failed', error);
      return (
        "Nova (running locally via Ollama) couldn't be reached. Make sure Ollama is " +
        `running ("ollama serve") and that "${this.model}" is pulled ("ollama pull ${this.model}").`
      );
    }
  }
}

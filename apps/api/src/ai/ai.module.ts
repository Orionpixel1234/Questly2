import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AI_PROVIDER } from './ai.constants';
import { AnthropicAiProvider } from './providers/anthropic-ai.provider';
import { OllamaAiProvider } from './providers/ollama-ai.provider';
import { NullAiProvider } from './providers/null-ai.provider';

// Nova, the built-in AI assistant. Provider is pluggable (see ai-provider.ts)
// and picked once at boot:
//   - AI_PROVIDER=ollama forces the free/local Ollama provider
//   - AI_PROVIDER=anthropic forces Claude (fails over to Null if no key)
//   - unset: old behavior — Anthropic if ANTHROPIC_API_KEY is set, else Null
// So switching to a local model is one env var, no code change, and existing
// deployments that only ever set ANTHROPIC_API_KEY keep working unchanged.
// No server-side chat history in v1: the client resends recent turns via
// ChatDto.history, so there's no conversation-storage model yet.
@Module({
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: AI_PROVIDER,
      useFactory: () => {
        const choice = process.env['AI_PROVIDER']?.toLowerCase();
        if (choice === 'ollama') return new OllamaAiProvider();
        if (choice === 'anthropic') {
          return process.env['ANTHROPIC_API_KEY']
            ? new AnthropicAiProvider()
            : new NullAiProvider();
        }
        return process.env['ANTHROPIC_API_KEY']
          ? new AnthropicAiProvider()
          : new NullAiProvider();
      },
    },
  ],
})
export class AiModule {}

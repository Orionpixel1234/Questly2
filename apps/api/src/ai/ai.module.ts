import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AI_PROVIDER } from './ai.constants';
import { AnthropicAiProvider } from './providers/anthropic-ai.provider';
import { NullAiProvider } from './providers/null-ai.provider';

// Nova, the built-in AI assistant. Provider is picked once at boot based on
// whether ANTHROPIC_API_KEY is set — see providers/ for the pluggable
// interface this is built against (AiProvider in ai-provider.ts). No
// server-side chat history in v1: the client resends recent turns via
// ChatDto.history, so there's no conversation-storage model yet.
@Module({
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: AI_PROVIDER,
      useFactory: () =>
        process.env['ANTHROPIC_API_KEY']
          ? new AnthropicAiProvider()
          : new NullAiProvider(),
    },
  ],
})
export class AiModule {}

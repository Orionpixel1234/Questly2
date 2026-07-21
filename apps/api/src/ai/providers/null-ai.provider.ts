import { Injectable } from '@nestjs/common';
import type { AiProvider } from '../ai-provider';

// Used whenever ANTHROPIC_API_KEY isn't set — Nova stays wired end-to-end
// (route, guard, frontend widget all work) but says so plainly instead of
// the request 500ing or silently doing nothing. Implements AiProvider with
// no parameters — TS allows a method with fewer params than the interface
// declares, and both would otherwise be unused.
@Injectable()
export class NullAiProvider implements AiProvider {
  readonly available = false;

  chat(): Promise<string> {
    return Promise.resolve(
      "Nova isn't configured yet — ask an admin to set ANTHROPIC_API_KEY on the server.",
    );
  }
}

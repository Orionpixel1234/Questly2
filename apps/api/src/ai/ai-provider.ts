export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

// Pluggable so swapping the model/vendor later doesn't touch AiController or
// the frontend — only AiModule's provider wiring changes.
export interface AiProvider {
  readonly available: boolean;
  chat(turns: ChatTurn[], systemPrompt: string): Promise<string>;
}

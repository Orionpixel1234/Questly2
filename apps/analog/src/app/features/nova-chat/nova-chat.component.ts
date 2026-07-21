import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiApiService, type ChatTurn } from '../../core/api/ai-api.service';

// The "built-in AI, for all of your questions and needs" — a floating
// widget available from any authenticated panel, not tied to a specific
// route. See app.component.ts for why it's mounted only when signed in.
@Component({
  selector: 'app-nova-chat',
  imports: [FormsModule],
  template: `
    @if (open()) {
      <div class="nova-chat__panel panel panel--raised">
        <div class="nova-chat__header">
          <span class="nova-chat__title">✨ Nova</span>
          <button
            type="button"
            class="nova-chat__close"
            (click)="open.set(false)"
            aria-label="Close chat"
          >
            ×
          </button>
        </div>

        <div class="nova-chat__messages" #messagesEl>
          @if (turns().length === 0) {
            <p class="nova-chat__empty">
              Hi, I'm Nova. Ask me anything about what you're studying.
            </p>
          }
          @for (turn of turns(); track $index) {
            <div class="nova-chat__message nova-chat__message--{{ turn.role }}">
              {{ turn.content }}
            </div>
          }
          @if (sending()) {
            <div class="nova-chat__message nova-chat__message--assistant nova-chat__message--pending">
              …
            </div>
          }
        </div>

        <form class="nova-chat__form" (ngSubmit)="send()">
          <input
            type="text"
            [(ngModel)]="draft"
            name="draft"
            placeholder="Ask Nova…"
            [disabled]="sending()"
            autocomplete="off"
          />
          <button type="submit" class="btn btn-primary" [disabled]="sending() || !draft.trim()">
            Send
          </button>
        </form>
      </div>
    }

    <button
      type="button"
      class="nova-chat__toggle"
      (click)="open.set(!open())"
      [attr.aria-expanded]="open()"
      aria-label="Toggle Nova chat"
    >
      ✨
    </button>
  `,
  styleUrl: './nova-chat.component.css',
})
export class NovaChatComponent {
  private readonly aiApi = inject(AiApiService);
  private readonly messagesEl = viewChild<ElementRef<HTMLDivElement>>('messagesEl');

  protected readonly open = signal(false);
  protected readonly turns = signal<ChatTurn[]>([]);
  protected readonly sending = signal(false);
  protected draft = '';

  send(): void {
    const message = this.draft.trim();
    if (!message || this.sending()) return;

    const history = this.turns();
    this.turns.set([...history, { role: 'user', content: message }]);
    this.draft = '';
    this.sending.set(true);

    this.aiApi.chat(message, history).subscribe({
      next: ({ reply }) => {
        this.turns.update((current) => [...current, { role: 'assistant', content: reply }]);
        this.sending.set(false);
        this.scrollToBottom();
      },
      error: () => {
        this.turns.update((current) => [
          ...current,
          { role: 'assistant', content: "Couldn't reach Nova — try again in a moment." },
        ]);
        this.sending.set(false);
        this.scrollToBottom();
      },
    });
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    const el = this.messagesEl()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}

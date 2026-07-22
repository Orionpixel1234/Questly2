import { Component, OnDestroy, computed, input, output, signal } from '@angular/core';
import { GameShellComponent } from './game-shell.component';
import type { StudyQa } from './study-qa';

interface MemoryCard {
  id: string;
  pairId: number;
  kind: 'q' | 'a';
  text: string;
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildDeck(questions: StudyQa[]): MemoryCard[] {
  const pairs = questions.slice(0, 6);
  const cards: MemoryCard[] = [];
  pairs.forEach((pair, i) => {
    cards.push({ id: `q-${i}`, pairId: i, kind: 'q', text: pair.q });
    cards.push({ id: `a-${i}`, pairId: i, kind: 'a', text: pair.a });
  });
  return shuffle(cards);
}

@Component({
  selector: 'app-memory-match-game',
  imports: [GameShellComponent],
  template: `
    <app-game-shell title="Memory Match" [counter]="counter()" (exit)="exit.emit()">
      @if (done()) {
        <div class="quiz-result quiz-result--win">
          <h3>All matched!</h3>
          <p>Cleared in {{ elapsedLabel() }} · {{ moves() }} moves.</p>
          <button type="button" class="btn btn-primary" (click)="reset()">Play again</button>
        </div>
      } @else {
        <div class="memory-grid">
          @for (card of cards(); track card.id) {
            <button
              type="button"
              class="memory-card"
              [class.memory-card--hidden]="!isFlipped(card)"
              [class.memory-card--matched]="matched().has(card.pairId)"
              [class.memory-card--question]="isFlipped(card) && !matched().has(card.pairId) && card.kind === 'q'"
              [class.memory-card--answer]="isFlipped(card) && !matched().has(card.pairId) && card.kind === 'a'"
              (click)="flip(card)"
            >
              @if (isFlipped(card)) {
                {{ card.text }}
              }
            </button>
          }
        </div>
      }
    </app-game-shell>
  `,
  styleUrl: './mini-games.component.css',
})
export class MemoryMatchGameComponent implements OnDestroy {
  readonly questions = input.required<StudyQa[]>();
  readonly exit = output<void>();

  protected readonly cards = signal<MemoryCard[]>([]);
  protected readonly flippedIds = signal<string[]>([]);
  protected readonly matched = signal<Set<number>>(new Set());
  protected readonly moves = signal(0);
  protected readonly startedAt = signal(Date.now());
  protected readonly now = signal(Date.now());
  private locked = false;
  private tickHandle?: ReturnType<typeof setInterval>;

  protected readonly total = computed(() => Math.min(6, this.questions().length));
  protected readonly done = computed(() => this.matched().size === this.total());
  protected readonly elapsedLabel = computed(() => {
    const seconds = Math.floor((this.now() - this.startedAt()) / 1000);
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  });
  protected readonly counter = computed(
    () => `${this.elapsedLabel()} · Moves: ${this.moves()} · Matched ${this.matched().size}/${this.total()}`,
  );

  constructor() {
    this.reset();
  }

  ngOnDestroy(): void {
    clearInterval(this.tickHandle);
  }

  protected isFlipped(card: MemoryCard): boolean {
    return this.flippedIds().includes(card.id) || this.matched().has(card.pairId);
  }

  protected flip(card: MemoryCard): void {
    if (this.locked || this.matched().has(card.pairId) || this.flippedIds().includes(card.id)) return;
    if (this.flippedIds().length === 2) return;

    const next = [...this.flippedIds(), card.id];
    this.flippedIds.set(next);
    if (next.length !== 2) return;

    this.moves.update((m) => m + 1);
    const [aId, bId] = next;
    const flippedCards = this.cards().filter((c) => c.id === aId || c.id === bId);
    const a = flippedCards.find((c) => c.id === aId);
    const b = flippedCards.find((c) => c.id === bId);
    if (!a || !b) return;
    if (a.pairId === b.pairId && a.kind !== b.kind) {
      setTimeout(() => {
        this.matched.update((set) => new Set(set).add(a.pairId));
        this.flippedIds.set([]);
      }, 500);
    } else {
      this.locked = true;
      setTimeout(() => {
        this.flippedIds.set([]);
        this.locked = false;
      }, 900);
    }
  }

  protected reset(): void {
    this.cards.set(buildDeck(this.questions()));
    this.flippedIds.set([]);
    this.matched.set(new Set());
    this.moves.set(0);
    this.startedAt.set(Date.now());
    this.now.set(Date.now());
    this.locked = false;
    clearInterval(this.tickHandle);
    this.tickHandle = setInterval(() => {
      if (this.done()) return;
      this.now.set(Date.now());
    }, 250);
  }
}

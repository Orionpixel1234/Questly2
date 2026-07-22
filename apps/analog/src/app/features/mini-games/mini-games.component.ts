import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AiApiService } from '../../core/api/ai-api.service';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';
import { FlashcardGameComponent } from './flashcard-game.component';
import { MemoryMatchGameComponent } from './memory-match-game.component';
import { BombBlastGameComponent } from './bomb-blast-game.component';
import { JumpingJacksGameComponent } from './jumping-jacks-game.component';
import type { StudyQa } from './study-qa';

type GameKind = 'flashcards' | 'memory' | 'bomb' | 'jumping';

interface GameOption {
  kind: GameKind;
  title: string;
  desc: string;
}

const GAMES: GameOption[] = [
  { kind: 'flashcards', title: 'Flashcard Flip', desc: 'Classic flip-through study cards.' },
  { kind: 'memory', title: 'Memory Match', desc: 'Match questions to their answers.' },
  { kind: 'bomb', title: 'Bomb Blast', desc: 'Bank bombs on streaks, then demolish the wall.' },
  { kind: 'jumping', title: 'Jumping Jacks', desc: 'Earn jumps in 60s, then platform through 20 levels.' },
];

// Practice mini-games — deliberately separate from the Star Chart above:
// Star Chart *is* real lesson progress; these are Nova-generated drill
// questions on any topic you type in, for quick review rather than
// tracked coursework (no EXP/Stardust here).
@Component({
  selector: 'app-mini-games',
  imports: [
    ReactiveFormsModule,
    ErrorStateComponent,
    FlashcardGameComponent,
    MemoryMatchGameComponent,
    BombBlastGameComponent,
    JumpingJacksGameComponent,
  ],
  template: `
    @if (active(); as kind) {
      @switch (kind) {
        @case ('flashcards') {
          <app-flashcard-game [questions]="questions()" (exit)="active.set(null)" />
        }
        @case ('memory') {
          <app-memory-match-game [questions]="questions()" (exit)="active.set(null)" />
        }
        @case ('bomb') {
          <app-bomb-blast-game [questions]="questions()" (exit)="active.set(null)" />
        }
        @case ('jumping') {
          <app-jumping-jacks-game [questions]="questions()" (exit)="active.set(null)" />
        }
      }
    } @else {
      <div class="panel mini-games__topic-form">
        <label class="inline-form__field" style="flex: 1 1 16rem">
          <span>Study topic</span>
          <input
            type="text"
            [formControl]="topic"
            placeholder="e.g. Quadratic equations, Multiplying fractions"
            (keydown.enter)="loadQuestions()"
          />
        </label>
        <label class="inline-form__field" style="width: 8rem">
          <span># Questions</span>
          <input type="number" [formControl]="count" min="5" max="75" />
        </label>
        <button type="button" class="btn btn-primary" [disabled]="loading()" (click)="loadQuestions()">
          {{ loading() ? 'Generating…' : '✨ Generate questions' }}
        </button>
      </div>
      @if (error()) {
        <app-error-state [message]="error()!" [showRetry]="false" />
      }
      <p class="mini-games__card-desc">
        {{ questions().length > 0 ? questions().length + ' ready — pick a game!' : 'Choose between 5 and 75 questions.' }}
      </p>

      <div class="mini-games__grid">
        @for (game of games; track game.kind) {
          <button
            type="button"
            class="mini-games__card"
            [disabled]="questions().length < 4"
            (click)="active.set(game.kind)"
          >
            <h3 class="mini-games__card-title">{{ game.title }}</h3>
            <p class="mini-games__card-desc">{{ game.desc }}</p>
          </button>
        }
      </div>
    }
  `,
  // panel-page.css lives with the page components — pulled in here too
  // since Angular's emulated encapsulation scopes styles per-component.
  styleUrls: ['../../pages/panel-page.css', './mini-games.component.css'],
})
export class MiniGamesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly aiApi = inject(AiApiService);

  protected readonly games = GAMES;
  protected readonly topic = this.fb.nonNullable.control('');
  protected readonly count = this.fb.nonNullable.control(25);
  protected readonly questions = signal<StudyQa[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly active = signal<GameKind | null>(null);

  protected loadQuestions(): void {
    const topic = this.topic.value.trim();
    if (!topic) {
      this.error.set('Enter a topic first.');
      return;
    }
    const count = Math.max(5, Math.min(75, Math.round(this.count.value) || 25));
    this.loading.set(true);
    this.error.set(null);
    this.aiApi.generateQuestions(topic, count).subscribe({
      next: (result) => {
        this.loading.set(false);
        if (!result.questions.length) {
          this.error.set('No questions generated — try a different topic.');
          return;
        }
        this.questions.set(result.questions);
      },
      error: (err: { error?: { message?: string } }) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Could not generate questions right now.');
      },
    });
  }
}

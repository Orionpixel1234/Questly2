import { Component, inject, output, signal } from '@angular/core';
import { OutpostApiService } from '../../core/api/outpost-api.service';

type Phase = 'loading' | 'question' | 'result' | 'error';

// The Asteroid Belt: mining that needs no crafted building, no placed
// station, and no prior lesson — a brand-new account can do this the
// moment they sign in. "Mining" is answering one Nova-generated question;
// the correct answer never reaches the client (see
// OutpostService.startAsteroidMining), so it can't be read off the
// network tab.
@Component({
  selector: 'app-asteroid-belt',
  template: `
    <div class="station-game" role="dialog" aria-modal="true" aria-label="Asteroid Belt">
      <div class="station-game__header">
        <h3>🪨 Asteroid Belt</h3>
        <button type="button" class="btn btn-secondary" (click)="exit.emit()">Exit</button>
      </div>

      @switch (phase()) {
        @case ('loading') {
          <p class="station-game__hint">Scanning for a mineable fragment…</p>
        }
        @case ('question') {
          <p class="station-game__hint">Answer correctly to crack the ice out of the rock.</p>
          <p class="asteroid-belt__question">{{ question() }}</p>
          <form class="asteroid-belt__form" (submit)="submit($event)">
            <input
              type="text"
              class="asteroid-belt__input"
              [value]="answer()"
              (input)="answer.set($any($event.target).value)"
              placeholder="Your answer…"
              autocomplete="off"
              [disabled]="submitting()"
            />
            <button type="submit" class="btn btn-primary" [disabled]="submitting() || !answer().trim()">
              {{ submitting() ? 'Checking…' : 'Mine' }}
            </button>
          </form>
        }
        @case ('result') {
          <div class="station-game__summary">
            @if (lastCorrect()) {
              <p class="station-game__score">+{{ lastAwarded() }} Ice</p>
              <p class="station-game__hint">Nice — that fragment cracked clean.</p>
            } @else {
              <p class="station-game__score">Not quite</p>
              <p class="station-game__hint">Correct answer: {{ lastCorrectAnswer() }}</p>
            }
            <button type="button" class="btn btn-primary" (click)="startRound()">
              Mine another fragment
            </button>
          </div>
        }
        @case ('error') {
          <p class="station-game__hint">{{ errorMessage() }}</p>
          <button type="button" class="btn btn-primary" (click)="startRound()">Try again</button>
        }
      }
    </div>
  `,
  styleUrls: ['./station-minigame.component.css', './asteroid-belt.component.css'],
})
export class AsteroidBeltComponent {
  private readonly outpostApi = inject(OutpostApiService);

  readonly exit = output<void>();

  protected readonly phase = signal<Phase>('loading');
  protected readonly question = signal('');
  protected readonly answer = signal('');
  protected readonly submitting = signal(false);
  protected readonly lastCorrect = signal(false);
  protected readonly lastAwarded = signal(0);
  protected readonly lastCorrectAnswer = signal('');
  protected readonly errorMessage = signal('');

  private attemptId = '';

  constructor() {
    this.startRound();
  }

  protected startRound(): void {
    this.phase.set('loading');
    this.answer.set('');
    this.outpostApi.startAsteroidMining().subscribe({
      next: (result) => {
        this.attemptId = result.attemptId;
        this.question.set(result.question);
        this.phase.set('question');
      },
      error: (err: { error?: { message?: string } }) => {
        this.errorMessage.set(
          err.error?.message ?? 'Could not reach the asteroid belt — try again.',
        );
        this.phase.set('error');
      },
    });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const value = this.answer().trim();
    if (!value || this.submitting()) return;
    this.submitting.set(true);
    this.outpostApi.answerAsteroidMining(this.attemptId, value).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.lastCorrect.set(result.correct);
        this.lastAwarded.set(result.awarded ?? 0);
        this.lastCorrectAnswer.set(result.correctAnswer ?? '');
        this.phase.set('result');
      },
      error: (err: { error?: { message?: string } }) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.error?.message ?? 'Could not check that answer — try again.',
        );
        this.phase.set('error');
      },
    });
  }
}

import { Component, computed, input, output, signal } from '@angular/core';
import { GameShellComponent } from './game-shell.component';
import type { StudyQa } from './study-qa';

@Component({
  selector: 'app-flashcard-game',
  imports: [GameShellComponent],
  template: `
    <app-game-shell title="Flashcard Flip" [counter]="counter()" (exit)="exit.emit()">
      <div class="flashcard-wrap">
        <div
          class="flashcard"
          role="button"
          tabindex="0"
          [attr.aria-label]="flipped() ? 'Showing answer, activate to show question' : 'Showing question, activate to reveal answer'"
          (click)="flipped.set(!flipped())"
          (keydown.enter)="flipped.set(!flipped())"
          (keydown.space)="toggleFromKeyboard($event)"
        >
          <div class="flashcard__inner" [class.flashcard__inner--flipped]="flipped()">
            <div class="flashcard__face">
              <span class="flashcard__label">Question</span>
              <span class="flashcard__text">{{ current().q }}</span>
              <span class="flashcard__label">Tap card to reveal answer</span>
            </div>
            <div class="flashcard__face flashcard__face--back">
              <span class="flashcard__label">Answer</span>
              <span class="flashcard__text">{{ current().a }}</span>
            </div>
          </div>
        </div>
        <div class="flashcard-actions">
          <button type="button" class="btn btn-secondary" (click)="prev()">&larr; Prev</button>
          <button type="button" class="btn btn-secondary" (click)="flipped.set(!flipped())">
            {{ flipped() ? 'Show question' : 'Show answer' }}
          </button>
          <button type="button" class="btn btn-primary" (click)="next()">Next &rarr;</button>
        </div>
      </div>
    </app-game-shell>
  `,
  styleUrl: './mini-games.component.css',
})
export class FlashcardGameComponent {
  readonly questions = input.required<StudyQa[]>();
  readonly exit = output<void>();

  protected readonly index = signal(0);
  protected readonly flipped = signal(false);

  protected readonly current = computed(() => this.questions()[this.index()]);
  protected readonly counter = computed(
    () => `${this.index() + 1} / ${this.questions().length}`,
  );

  protected next(): void {
    this.flipped.set(false);
    this.index.update((i) => (i + 1) % this.questions().length);
  }

  protected prev(): void {
    this.flipped.set(false);
    this.index.update((i) => (i - 1 + this.questions().length) % this.questions().length);
  }

  protected toggleFromKeyboard(event: Event): void {
    event.preventDefault();
    this.flipped.set(!this.flipped());
  }
}

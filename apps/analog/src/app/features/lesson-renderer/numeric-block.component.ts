import { Component, input, output } from '@angular/core';
import type { AnswerFeedback, NumericBlock } from '@questly/lesson-dsl';

@Component({
  selector: 'app-numeric-block',
  template: `
    <div class="quiz-block">
      <p class="quiz-block__question">{{ block().question }}</p>
      <input
        type="number"
        class="quiz-block__input"
        [value]="answer() ?? ''"
        [disabled]="disabled()"
        placeholder="Your answer"
        (input)="onInput($any($event.target).value)"
      />
      @if (feedback(); as fb) {
        <p
          class="quiz-block__feedback"
          [class.quiz-block__feedback--correct]="fb.correct === true"
          [class.quiz-block__feedback--incorrect]="fb.correct === false"
        >
          {{ fb.correct ? 'Correct' : 'Incorrect' }} — {{ fb.pointsAwarded }}/{{ fb.pointsPossible }} points
        </p>
      } @else {
        <p class="quiz-block__points">{{ block().points }} points</p>
      }
    </div>
  `,
  styleUrl: './quiz-block.component.css',
})
export class NumericBlockComponent {
  readonly block = input.required<NumericBlock>();
  readonly answer = input<number>();
  readonly feedback = input<AnswerFeedback>();
  readonly disabled = input(false);
  readonly answerChange = output<number>();

  protected onInput(value: string): void {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && value.trim() !== '') {
      this.answerChange.emit(parsed);
    }
  }
}

import { Component, input, output } from '@angular/core';
import type { AnswerFeedback, TrueFalseBlock } from '@questly/lesson-dsl';

@Component({
  selector: 'app-truefalse-block',
  template: `
    <div class="quiz-block">
      <p class="quiz-block__question">{{ block().question }}</p>
      <div class="quiz-block__truefalse">
        <label
          class="quiz-block__option"
          [class.quiz-block__option--selected]="answer() === true"
          [class.quiz-block__option--correct]="!!feedback() && block().correct === true"
          [class.quiz-block__option--incorrect]="!!feedback() && answer() === true && block().correct !== true"
        >
          <input
            type="radio"
            [name]="groupName"
            [checked]="answer() === true"
            [disabled]="disabled()"
            (change)="answerChange.emit(true)"
          />
          True
        </label>
        <label
          class="quiz-block__option"
          [class.quiz-block__option--selected]="answer() === false"
          [class.quiz-block__option--correct]="!!feedback() && block().correct === false"
          [class.quiz-block__option--incorrect]="!!feedback() && answer() === false && block().correct !== false"
        >
          <input
            type="radio"
            [name]="groupName"
            [checked]="answer() === false"
            [disabled]="disabled()"
            (change)="answerChange.emit(false)"
          />
          False
        </label>
      </div>
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
export class TrueFalseBlockComponent {
  readonly block = input.required<TrueFalseBlock>();
  readonly answer = input<boolean>();
  readonly feedback = input<AnswerFeedback>();
  readonly disabled = input(false);
  readonly answerChange = output<boolean>();

  protected readonly groupName = `tf-${Math.random().toString(36).slice(2)}`;
}

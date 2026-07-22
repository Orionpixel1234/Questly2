import { Component, input, output } from '@angular/core';
import type { AnswerFeedback, McqBlock } from '@questly/lesson-dsl';
import { InlineContentComponent } from './inline-content.component';

@Component({
  selector: 'app-mcq-block',
  imports: [InlineContentComponent],
  template: `
    <div class="quiz-block">
      <p class="quiz-block__question">{{ block().question }}</p>
      <div class="quiz-block__options" role="radiogroup">
        @for (option of block().options; track $index) {
          <label
            class="quiz-block__option"
            [class.quiz-block__option--selected]="answer() === $index"
            [class.quiz-block__option--correct]="!!feedback() && $index === block().correct"
            [class.quiz-block__option--incorrect]="
              !!feedback() && answer() === $index && $index !== block().correct
            "
          >
            <input
              type="radio"
              [name]="groupName"
              [checked]="answer() === $index"
              [disabled]="disabled()"
              (change)="answerChange.emit($index)"
            />
            <app-inline-content [nodes]="option.children" />
          </label>
        }
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
export class McqBlockComponent {
  readonly block = input.required<McqBlock>();
  readonly answer = input<number>();
  readonly feedback = input<AnswerFeedback>();
  readonly disabled = input(false);
  readonly answerChange = output<number>();

  protected readonly groupName = `mcq-${Math.random().toString(36).slice(2)}`;
}

import { Component, input, output } from '@angular/core';
import type { AnswerFeedback, CheckboxBlock } from '@questly/lesson-dsl';
import { InlineContentComponent } from './inline-content.component';

@Component({
  selector: 'app-checkbox-block',
  imports: [InlineContentComponent],
  template: `
    <div class="quiz-block">
      <p class="quiz-block__question">{{ block().question }}</p>
      <div class="quiz-block__options">
        @for (option of block().options; track $index) {
          <label
            class="quiz-block__option"
            [class.quiz-block__option--selected]="selected($index)"
            [class.quiz-block__option--correct]="!!feedback() && block().correct.includes($index)"
            [class.quiz-block__option--incorrect]="
              !!feedback() && selected($index) && !block().correct.includes($index)
            "
          >
            <input
              type="checkbox"
              [checked]="selected($index)"
              [disabled]="disabled()"
              (change)="toggle($index)"
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
        <p class="quiz-block__points">{{ block().points }} points — select all that apply</p>
      }
    </div>
  `,
  styleUrl: './quiz-block.component.css',
})
export class CheckboxBlockComponent {
  readonly block = input.required<CheckboxBlock>();
  readonly answer = input<number[]>();
  readonly feedback = input<AnswerFeedback>();
  readonly disabled = input(false);
  readonly answerChange = output<number[]>();

  protected selected(index: number): boolean {
    return (this.answer() ?? []).includes(index);
  }

  protected toggle(index: number): void {
    const current = this.answer() ?? [];
    const next = current.includes(index)
      ? current.filter((i) => i !== index)
      : [...current, index];
    this.answerChange.emit(next);
  }
}

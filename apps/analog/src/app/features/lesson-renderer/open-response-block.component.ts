import { Component, input, output } from '@angular/core';
import type { AnswerFeedback, OpenResponseBlock } from '@questly/lesson-dsl';

// Never auto-graded — feedback() (when present) always has correct===null,
// so this shows a "Submitted, pending review" state rather than
// correct/incorrect (see grading.ts).
@Component({
  selector: 'app-open-response-block',
  template: `
    <div class="quiz-block">
      <p class="quiz-block__question">{{ block().question }}</p>
      <textarea
        class="quiz-block__input quiz-block__input--wide"
        [value]="answer() ?? ''"
        [disabled]="disabled()"
        placeholder="Write your response…"
        (input)="answerChange.emit($any($event.target).value)"
      ></textarea>
      @if (feedback()) {
        <p class="quiz-block__feedback quiz-block__feedback--pending">
          Submitted — pending review ({{ block().points }} points)
        </p>
      } @else {
        <p class="quiz-block__points">{{ block().points }} points — manually graded</p>
      }
    </div>
  `,
  styleUrl: './quiz-block.component.css',
})
export class OpenResponseBlockComponent {
  readonly block = input.required<OpenResponseBlock>();
  readonly answer = input<string>();
  readonly feedback = input<AnswerFeedback>();
  readonly disabled = input(false);
  readonly answerChange = output<string>();
}

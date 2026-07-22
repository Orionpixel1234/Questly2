import { Component, computed, input, output } from '@angular/core';
import { parseLesson } from '@questly/lesson-dsl';
import type { AnswerFeedback, AnswerValue, AnswersPayload } from '@questly/lesson-dsl';
import { LessonBlockComponent } from './lesson-block.component';

@Component({
  selector: 'app-lesson-renderer',
  imports: [LessonBlockComponent],
  template: `
    @let result = parsed();
    @if (result.ok) {
      @if (result.document.blocks.length === 0) {
        <p class="lesson-renderer__empty">This lesson has no content yet.</p>
      } @else {
        @for (block of result.document.blocks; track $index) {
          <app-lesson-block
            [block]="block"
            [answer]="answers()[$index]"
            [feedback]="feedbackFor($index)"
            [disabled]="disabled()"
            (answerChange)="answerChange.emit({ blockIndex: $index, value: $event })"
          />
        }
      }
    } @else {
      <div class="lesson-renderer__error" role="alert">
        <p class="lesson-renderer__error-title">Couldn't render this lesson</p>
        <p class="lesson-renderer__error-detail">
          Line {{ result.error.line }}, column {{ result.error.column }}:
          {{ result.error.message }}
        </p>
      </div>
    }
  `,
  styleUrl: './lesson-renderer.component.css',
})
export class LessonRendererComponent {
  readonly source = input.required<string>();
  // Quiz-block answer capture — all optional, so plain read-only lesson
  // preview (author editor, public non-interactive view) needs none of this.
  readonly answers = input<AnswersPayload>({});
  readonly feedback = input<AnswerFeedback[] | null>(null);
  readonly disabled = input(false);
  readonly answerChange = output<{ blockIndex: number; value: AnswerValue }>();

  readonly parsed = computed(() => parseLesson(this.source()));

  protected feedbackFor(blockIndex: number): AnswerFeedback | undefined {
    return this.feedback()?.find((f) => f.blockIndex === blockIndex);
  }
}

import { Component, computed, input } from '@angular/core';
import { parseLesson } from '@questly/lesson-dsl';
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
          <app-lesson-block [block]="block" />
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

  readonly parsed = computed(() => parseLesson(this.source()));
}

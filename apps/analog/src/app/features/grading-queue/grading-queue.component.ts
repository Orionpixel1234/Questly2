import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  ProgressApiService,
  type PendingGradingItem,
} from '../../core/api/progress-api.service';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';

interface Draft {
  score: number;
  feedback: Record<number, string>;
}

// Manual grading for OpenResponse blocks (see LESSON_DSL.md's Quiz blocks
// section) — shared by Author/Educator panels (each sees only their own
// lessons' submissions, enforced server-side) and the Admin panel (sees all).
@Component({
  selector: 'app-grading-queue',
  imports: [LoadingStateComponent, ErrorStateComponent, DatePipe],
  template: `
    <section class="panel panel-page__section">
      <h2 class="panel-page__heading">Grading queue</h2>
      @if (error()) {
        <app-error-state [message]="error()!" (retry)="refresh()" />
      } @else if (loading()) {
        <app-loading-state label="Loading submissions…" />
      } @else if (items().length) {
        <div class="card-list">
          @for (item of items(); track item.completionId) {
            <div class="panel--raised grading-queue__item">
              <h3>{{ item.lessonTitle }}</h3>
              <p class="grading-queue__meta">
                {{ item.studentName }} ({{ item.studentEmail }}) · submitted
                {{ item.submittedAt | date: 'short' }}
              </p>

              @for (q of item.openQuestions; track q.blockIndex) {
                <div class="grading-queue__question">
                  <p class="grading-queue__question-text">{{ q.question }}</p>
                  <p class="grading-queue__answer">{{ q.answer || '(no answer)' }}</p>
                  <input
                    type="text"
                    class="grading-queue__feedback-input"
                    placeholder="Feedback for this question (optional)"
                    [value]="draftFor(item).feedback[q.blockIndex] ?? ''"
                    (input)="setFeedback(item, q.blockIndex, $any($event.target).value)"
                  />
                </div>
              }

              <div class="grading-queue__score">
                <label class="inline-form__field">
                  <span>Score (out of {{ item.manualTotal }})</span>
                  <input
                    type="number"
                    min="0"
                    [max]="item.manualTotal"
                    [value]="draftFor(item).score"
                    (input)="setScore(item, $any($event.target).valueAsNumber)"
                  />
                </label>
                <button type="button" class="btn btn-primary" (click)="submitGrade(item)">
                  Save grade
                </button>
              </div>
            </div>
          }
        </div>
      } @else {
        <p class="panel-page__empty">Nothing waiting on grading.</p>
      }
    </section>
  `,
  // panel-page.css lives with the page components — pulled in here too
  // since Angular's emulated encapsulation scopes styles per-component (see
  // LessonEditorComponent for the same pattern).
  styleUrls: ['../../pages/panel-page.css', './grading-queue.component.css'],
})
export class GradingQueueComponent {
  private readonly progressApi = inject(ProgressApiService);

  protected readonly items = signal<PendingGradingItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  private readonly drafts = signal<Record<string, Draft>>({});

  constructor() {
    this.refresh();
  }

  protected refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.progressApi.pendingGrading().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the grading queue.');
        this.loading.set(false);
      },
    });
  }

  protected draftFor(item: PendingGradingItem): Draft {
    return this.drafts()[item.completionId] ?? { score: 0, feedback: {} };
  }

  protected setScore(item: PendingGradingItem, value: number): void {
    if (!Number.isFinite(value)) return;
    this.drafts.update((d) => ({
      ...d,
      [item.completionId]: { ...this.draftFor(item), score: value },
    }));
  }

  protected setFeedback(item: PendingGradingItem, blockIndex: number, value: string): void {
    this.drafts.update((d) => ({
      ...d,
      [item.completionId]: {
        ...this.draftFor(item),
        feedback: { ...this.draftFor(item).feedback, [blockIndex]: value },
      },
    }));
  }

  protected submitGrade(item: PendingGradingItem): void {
    const draft = this.draftFor(item);
    this.progressApi
      .gradeSubmission(item.completionId, draft.score, draft.feedback)
      .subscribe(() => this.refresh());
  }
}

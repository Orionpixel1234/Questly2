import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { defineRouteMeta, injectActivatedRoute } from '@analogjs/router';
import { EXP_PER_LESSON, REPLAY_EXP_PER_LESSON, type Lesson } from '@questly/shared-types';
import { gradeAnswers, isGradableBlock, parseLesson } from '@questly/lesson-dsl';
import type { AnswerFeedback, AnswersPayload, AnswerValue } from '@questly/lesson-dsl';
import { authGuard } from '../../core/guards/auth.guard';
import { LessonsApiService } from '../../core/api/lessons-api.service';
import {
  ProgressApiService,
  type CompleteLessonGrading,
} from '../../core/api/progress-api.service';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';
import { LessonRendererComponent } from '../../features/lesson-renderer/lesson-renderer.component';
import { CallModeComponent } from '../../features/call-mode/call-mode.component';

// No roleGuard/`data: { role }` here — any signed-in user (student browsing,
// author/educator previewing a link) can view a lesson; the backend itself
// still enforces that unpublished lessons are owner/admin-only.
export const routeMeta = defineRouteMeta({
  canActivate: [authGuard],
});

@Component({
  selector: 'app-lesson-detail-page',
  imports: [
    RouterLink,
    LoadingStateComponent,
    ErrorStateComponent,
    LessonRendererComponent,
    CallModeComponent,
  ],
  template: `
    <div class="panel-page">
      @if (loading()) {
        <app-loading-state label="Loading lesson…" />
      } @else if (error(); as message) {
        <app-error-state [message]="message" (retry)="load()" />
      } @else if (lesson(); as lesson) {
        <article class="panel panel--raised lesson-detail">
          <a routerLink="/student" class="lesson-detail__back">&larr; Back</a>

          <div class="lesson-detail__header">
            <div>
              <span class="page-stub__eyebrow">{{ lesson.subject }}</span>
              <h1 class="page-stub__title">{{ lesson.title }}</h1>
            </div>
            <div class="lesson-detail__header-actions">
              <button type="button" class="btn btn-secondary" (click)="callModeActive.set(true)">
                🎧 Listen
              </button>
              @if (completed()) {
                <span class="badge badge--accent">
                  Completed{{ lastAwarded() !== null ? ' · +' + lastAwarded() + ' EXP' : '' }}
                </span>
                <button type="button" class="btn btn-secondary" (click)="startReplay()">
                  ↻ Replay (+{{ replayExpPerLesson }} EXP)
                </button>
              } @else {
                <button
                  type="button"
                  class="btn btn-primary"
                  [disabled]="completing()"
                  (click)="markComplete(lesson.id)"
                >
                  {{
                    completing()
                      ? 'Saving…'
                      : (hasQuiz() ? 'Submit answers' : 'Mark complete') +
                        ' (+' + (everCompleted() ? replayExpPerLesson : expPerLesson) + ' EXP)'
                  }}
                </button>
              }
            </div>
          </div>

          @if (callModeActive()) {
            <app-call-mode
              [source]="lesson.content"
              [title]="lesson.title"
              (closed)="callModeActive.set(false)"
            />
          }
          @if (completeError()) {
            <app-error-state [message]="completeError()!" [showRetry]="false" />
          }
          @if (gradingSummary(); as g) {
            <div class="panel lesson-detail__grading-summary">
              <p>
                Auto-graded score: <strong>{{ g.autoScore }}/{{ g.autoTotal }}</strong>
              </p>
              @if (g.pendingManualGrading) {
                <p class="lesson-detail__grading-pending">
                  {{ g.manualTotal }} points pending manual review from your instructor.
                </p>
              }
            </div>
          }

          <p class="lesson-detail__description">{{ lesson.description }}</p>
          <div class="lesson-detail__content">
            <app-lesson-renderer
              [source]="lesson.content"
              [answers]="answers()"
              [feedback]="submittedFeedback()"
              [disabled]="completed()"
              (answerChange)="onAnswerChange($event)"
            />
          </div>
        </article>
      }
    </div>
  `,
  styleUrls: ['../page-stub.css', '../panel-page.css', './lesson-detail.page.css'],
})
export default class LessonDetailPageComponent {
  private readonly route = injectActivatedRoute();
  private readonly lessonsApi = inject(LessonsApiService);
  private readonly progressApi = inject(ProgressApiService);

  protected readonly expPerLesson = EXP_PER_LESSON;
  protected readonly replayExpPerLesson = REPLAY_EXP_PER_LESSON;
  protected readonly lesson = signal<Lesson | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly completed = signal(false);
  // Distinct from `completed` — that flips back to false while replaying so
  // the submit form re-renders, but the button copy (+10 EXP vs +50 EXP)
  // still needs to know this isn't a first attempt.
  protected readonly everCompleted = signal(false);
  protected readonly lastAwarded = signal<number | null>(null);
  protected readonly completing = signal(false);
  protected readonly completeError = signal<string | null>(null);
  protected readonly callModeActive = signal(false);

  protected readonly answers = signal<AnswersPayload>({});
  protected readonly submittedFeedback = signal<AnswerFeedback[] | null>(null);
  protected readonly gradingSummary = signal<CompleteLessonGrading | null>(null);

  private readonly parsedDocument = computed(() => {
    const source = this.lesson()?.content;
    if (!source) return null;
    const result = parseLesson(source);
    return result.ok ? result.document : null;
  });

  protected readonly hasQuiz = computed(
    () => this.parsedDocument()?.blocks.some(isGradableBlock) ?? false,
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('No lesson id in the URL.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.lessonsApi.getOne(id).subscribe({
      next: (lesson) => {
        this.lesson.set(lesson);
        this.loading.set(false);
        this.progressApi.completed().subscribe((ids) => {
          const done = ids.includes(id);
          this.completed.set(done);
          this.everCompleted.set(done);
        });
      },
      error: () => {
        this.error.set('Could not load this lesson.');
        this.loading.set(false);
      },
    });
  }

  protected onAnswerChange(event: { blockIndex: number; value: AnswerValue }): void {
    this.answers.update((current) => ({ ...current, [event.blockIndex]: event.value }));
  }

  protected markComplete(lessonId: string): void {
    this.completing.set(true);
    this.completeError.set(null);
    const answers = this.hasQuiz() ? this.answers() : undefined;
    this.progressApi.completeLesson(lessonId, answers).subscribe({
      next: (result) => {
        this.completed.set(true);
        this.everCompleted.set(true);
        this.lastAwarded.set(result.expAwarded);
        this.completing.set(false);
        this.gradingSummary.set(result.grading);
        // Same pure gradeAnswers() the backend used to compute the
        // authoritative score — re-run here purely to render per-question
        // correct/incorrect state (see LESSON_DSL.md's Quiz blocks section).
        const document = this.parsedDocument();
        if (document && answers) {
          this.submittedFeedback.set(gradeAnswers(document, answers).feedback);
        }
      },
      error: (err: { error?: { message?: string } }) => {
        this.completeError.set(
          err.error?.message ?? 'Could not mark this lesson complete.',
        );
        this.completing.set(false);
      },
    });
  }

  protected startReplay(): void {
    this.completed.set(false);
    this.answers.set({});
    this.submittedFeedback.set(null);
    this.gradingSummary.set(null);
    this.completeError.set(null);
  }
}

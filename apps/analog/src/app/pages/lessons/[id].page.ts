import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { defineRouteMeta, injectActivatedRoute } from '@analogjs/router';
import { EXP_PER_LESSON, type Lesson } from '@questly/shared-types';
import { authGuard } from '../../core/guards/auth.guard';
import { LessonsApiService } from '../../core/api/lessons-api.service';
import { ProgressApiService } from '../../core/api/progress-api.service';
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
                <span class="badge badge--accent">Completed</span>
              } @else {
                <button
                  type="button"
                  class="btn btn-primary"
                  [disabled]="completing()"
                  (click)="markComplete(lesson.id)"
                >
                  {{ completing() ? 'Saving…' : 'Mark complete (+' + expPerLesson + ' EXP)' }}
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

          <p class="lesson-detail__description">{{ lesson.description }}</p>
          <div class="lesson-detail__content">
            <app-lesson-renderer [source]="lesson.content" />
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
  protected readonly lesson = signal<Lesson | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly completed = signal(false);
  protected readonly completing = signal(false);
  protected readonly completeError = signal<string | null>(null);
  protected readonly callModeActive = signal(false);

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
        this.progressApi
          .completed()
          .subscribe((ids) => this.completed.set(ids.includes(id)));
      },
      error: () => {
        this.error.set('Could not load this lesson.');
        this.loading.set(false);
      },
    });
  }

  protected markComplete(lessonId: string): void {
    this.completing.set(true);
    this.completeError.set(null);
    this.progressApi.completeLesson(lessonId).subscribe({
      next: () => {
        this.completed.set(true);
        this.completing.set(false);
      },
      error: () => {
        this.completeError.set('Could not mark this lesson complete.');
        this.completing.set(false);
      },
    });
  }
}

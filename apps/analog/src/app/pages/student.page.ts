import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { defineRouteMeta } from '@analogjs/router';
import type { ClassSummary, Lesson } from '@questly/shared-types';
import { authGuard } from '../core/guards/auth.guard';
import { roleGuard } from '../core/guards/role.guard';
import { ClassesApiService } from '../core/api/classes-api.service';
import { LessonsApiService } from '../core/api/lessons-api.service';
import { ProgressFacade } from '../state/progress/progress.facade';
import type { SubjectProgress } from '../state/progress/progress.model';
import { UserFacade } from '../state/user/user.facade';
import { LoadingStateComponent } from '../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../shared/error-state/error-state.component';
import { LeaderboardComponent } from '../features/leaderboard/leaderboard.component';

export const routeMeta = defineRouteMeta({
  canActivate: [authGuard, roleGuard],
  data: { role: 'student' },
});

@Component({
  selector: 'app-student-page',
  imports: [RouterLink, LoadingStateComponent, ErrorStateComponent, LeaderboardComponent],
  template: `
    <div class="panel-page">
      <section class="panel page-stub">
        <span class="page-stub__eyebrow">Student panel</span>
        <h1 class="page-stub__title">Your progress</h1>

        @if (progress.status() === 'loading') {
          <app-loading-state label="Loading progress…" />
        } @else if (progress.subjects().length) {
          <div class="card-list">
            @for (entry of progress.subjects(); track entry.subject) {
              <div class="card-list__item panel--raised">
                <div class="card-list__item-body" style="flex: 1">
                  <h3>{{ entry.subject }} <span class="badge badge--accent">Lv. {{ entry.level }}</span></h3>
                  <div class="progress-bar">
                    <div
                      class="progress-bar__fill"
                      [style.width.%]="progressPercent(entry)"
                    ></div>
                  </div>
                  <p>{{ entry.exp }} / {{ entry.target }} EXP</p>
                </div>
              </div>
            }
          </div>
        } @else {
          <p class="page-stub__body">
            No goals set yet — subjects chosen at signup will show progress here.
          </p>
        }
      </section>

      <section class="panel panel-page__section">
        <h2 class="panel-page__heading">Your classes</h2>
        @if (classesError()) {
          <app-error-state [message]="classesError()!" (retry)="loadClasses()" />
        } @else if (classes().length) {
          <div class="card-list">
            @for (klass of classes(); track klass.id) {
              <div class="card-list__item">
                <div class="card-list__item-body">
                  <h3>{{ klass.name }}</h3>
                  <p>{{ klass.subject }} · taught by {{ klass.educator?.name }}</p>
                </div>
              </div>
            }
          </div>
        } @else {
          <p class="panel-page__empty">Not enrolled in any classes yet.</p>
        }
      </section>

      <section class="panel panel-page__section">
        <h2 class="panel-page__heading">Lessons for you</h2>
        @if (lessonsError()) {
          <app-error-state [message]="lessonsError()!" (retry)="loadLessons()" />
        } @else if (matchingLessons().length) {
          <div class="card-list">
            @for (lesson of matchingLessons(); track lesson.id) {
              <a class="card-list__item" [routerLink]="['/lessons', lesson.id]">
                <div class="card-list__item-body">
                  <h3>{{ lesson.title }}</h3>
                  <p>{{ lesson.description }}</p>
                </div>
                <span class="badge">{{ lesson.subject }}</span>
              </a>
            }
          </div>
        } @else {
          <p class="panel-page__empty">
            No published lessons for your subjects yet.
          </p>
        }
      </section>

      <app-leaderboard />
    </div>
  `,
  styleUrls: ['./page-stub.css', './panel-page.css'],
})
export default class StudentPageComponent {
  protected readonly progress = inject(ProgressFacade);
  protected readonly user = inject(UserFacade);
  private readonly classesApi = inject(ClassesApiService);
  private readonly lessonsApi = inject(LessonsApiService);

  protected readonly classes = signal<ClassSummary[]>([]);
  protected readonly classesError = signal<string | null>(null);
  protected readonly lessons = signal<Lesson[]>([]);
  protected readonly lessonsError = signal<string | null>(null);

  constructor() {
    this.progress.loadProgress();
    this.user.loadProfile();
    this.loadClasses();
    this.loadLessons();
  }

  protected loadClasses(): void {
    this.classesError.set(null);
    this.classesApi.enrolled().subscribe({
      next: (classes) => this.classes.set(classes),
      error: () => this.classesError.set('Could not load your classes.'),
    });
  }

  protected loadLessons(): void {
    this.lessonsError.set(null);
    this.lessonsApi.published().subscribe({
      next: (lessons) => this.lessons.set(lessons),
      error: () => this.lessonsError.set('Could not load lessons.'),
    });
  }

  protected progressPercent(entry: SubjectProgress): number {
    return entry.target > 0
      ? Math.min(100, Math.round((entry.exp / entry.target) * 100))
      : 0;
  }

  protected matchingLessons(): Lesson[] {
    const subjects = this.user.profile()?.subjects ?? [];
    if (!subjects.length) return this.lessons();
    return this.lessons().filter((lesson) => subjects.includes(lesson.subject));
  }
}

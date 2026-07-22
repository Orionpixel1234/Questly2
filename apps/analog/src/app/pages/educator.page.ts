import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { defineRouteMeta } from '@analogjs/router';
import type { ClassSummary, RosterStudent } from '@questly/shared-types';
import { authGuard } from '../core/guards/auth.guard';
import { roleGuard } from '../core/guards/role.guard';
import { ClassesApiService } from '../core/api/classes-api.service';
import { LoadingStateComponent } from '../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../shared/error-state/error-state.component';
import { LeaderboardComponent } from '../features/leaderboard/leaderboard.component';
import { LessonEditorComponent } from '../features/lesson-editor/lesson-editor.component';
import { GradingQueueComponent } from '../features/grading-queue/grading-queue.component';

export const routeMeta = defineRouteMeta({
  canActivate: [authGuard, roleGuard],
  data: { role: 'educator' },
});

@Component({
  selector: 'app-educator-page',
  imports: [
    ReactiveFormsModule,
    LoadingStateComponent,
    ErrorStateComponent,
    LeaderboardComponent,
    LessonEditorComponent,
    GradingQueueComponent,
  ],
  template: `
    <div class="panel-page">
      <section class="panel panel-page__section">
        <h1 class="page-stub__title" style="margin-bottom: 0">New class</h1>
        <form [formGroup]="classForm" (ngSubmit)="createClass()" class="inline-form">
          <label class="inline-form__field" style="flex: 1 1 12rem">
            <span>Name</span>
            <input type="text" formControlName="name" />
          </label>
          <label class="inline-form__field" style="flex: 1 1 8rem">
            <span>Subject</span>
            <input type="text" formControlName="subject" />
          </label>
          <button type="submit" class="btn btn-primary" [disabled]="classForm.invalid">
            Create class
          </button>
        </form>
      </section>

      <section class="panel panel-page__section">
        <h2 class="panel-page__heading">Your classes</h2>
        @if (classesError()) {
          <app-error-state [message]="classesError()!" (retry)="refreshClasses()" />
        } @else if (loadingClasses()) {
          <app-loading-state label="Loading classes…" />
        } @else if (classes().length) {
          <div class="card-list">
            @for (klass of classes(); track klass.id) {
              <div class="card-list__item">
                <div class="card-list__item-body">
                  <h3>{{ klass.name }}</h3>
                  <p>{{ klass.subject }} · {{ klass._count?.enrollments ?? 0 }} enrolled</p>
                </div>
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="selectClass(klass)"
                >
                  {{ selectedClass()?.id === klass.id ? 'Hide roster' : 'View roster' }}
                </button>
              </div>
            }
          </div>
        } @else {
          <p class="panel-page__empty">No classes yet — create one above.</p>
        }
      </section>

      @if (selectedClass(); as klass) {
        <section class="panel panel-page__section">
          <h2 class="panel-page__heading">Roster — {{ klass.name }}</h2>

          <form [formGroup]="enrollForm" (ngSubmit)="enrollStudent()" class="inline-form">
            <label class="inline-form__field" style="flex: 1 1 16rem">
              <span>Student email</span>
              <input type="email" formControlName="email" />
            </label>
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="enrollForm.invalid"
            >
              Enroll
            </button>
          </form>
          @if (rosterError()) {
            <app-error-state [message]="rosterError()!" [showRetry]="false" />
          }

          @if (roster().length) {
            <div class="card-list">
              @for (student of roster(); track student.id) {
                <div class="card-list__item">
                  <div class="card-list__item-body">
                    <h3>{{ student.name }}</h3>
                    <p>{{ student.email }}</p>
                  </div>
                  <button
                    type="button"
                    class="btn btn-secondary"
                    (click)="unenrollStudent(student.id)"
                  >
                    Remove
                  </button>
                </div>
              }
            </div>
          } @else {
            <p class="panel-page__empty">No students enrolled yet.</p>
          }
        </section>
      }

      <app-lesson-editor />
      <app-grading-queue />

      <app-leaderboard />
    </div>
  `,
  styleUrls: ['./page-stub.css', './panel-page.css'],
})
export default class EducatorPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly classesApi = inject(ClassesApiService);

  protected readonly classes = signal<ClassSummary[]>([]);
  protected readonly loadingClasses = signal(true);
  protected readonly classesError = signal<string | null>(null);
  protected readonly selectedClass = signal<ClassSummary | null>(null);
  protected readonly roster = signal<RosterStudent[]>([]);
  protected readonly rosterError = signal<string | null>(null);

  protected readonly classForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    subject: ['', Validators.required],
  });

  protected readonly enrollForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    this.refreshClasses();
  }

  protected refreshClasses(): void {
    this.loadingClasses.set(true);
    this.classesError.set(null);
    this.classesApi.mine().subscribe({
      next: (classes) => {
        this.classes.set(classes);
        this.loadingClasses.set(false);
      },
      error: () => {
        this.classesError.set('Could not load your classes.');
        this.loadingClasses.set(false);
      },
    });
  }

  protected createClass(): void {
    if (this.classForm.invalid) return;
    this.classesApi.create(this.classForm.getRawValue()).subscribe(() => {
      this.classForm.reset({ name: '', subject: '' });
      this.refreshClasses();
    });
  }

  protected selectClass(klass: ClassSummary): void {
    if (this.selectedClass()?.id === klass.id) {
      this.selectedClass.set(null);
      return;
    }
    this.selectedClass.set(klass);
    this.rosterError.set(null);
    this.loadRoster(klass.id);
  }

  private loadRoster(classId: string): void {
    this.classesApi.roster(classId).subscribe((roster) => this.roster.set(roster));
  }

  protected enrollStudent(): void {
    const klass = this.selectedClass();
    if (!klass || this.enrollForm.invalid) return;
    this.rosterError.set(null);

    this.classesApi.enroll(klass.id, this.enrollForm.getRawValue().email).subscribe({
      next: () => {
        this.enrollForm.reset({ email: '' });
        this.loadRoster(klass.id);
        this.refreshClasses();
      },
      error: (error: HttpErrorResponse) => {
        const message: unknown = error.error?.message;
        this.rosterError.set(
          typeof message === 'string' ? message : 'Could not enroll student.',
        );
      },
    });
  }

  protected unenrollStudent(studentId: string): void {
    const klass = this.selectedClass();
    if (!klass) return;
    this.classesApi.unenroll(klass.id, studentId).subscribe(() => {
      this.loadRoster(klass.id);
      this.refreshClasses();
    });
  }
}

import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { defineRouteMeta } from '@analogjs/router';
import type { Lesson } from '@questly/shared-types';
import { authGuard } from '../core/guards/auth.guard';
import { roleGuard } from '../core/guards/role.guard';
import { LessonsApiService } from '../core/api/lessons-api.service';
import { LoadingStateComponent } from '../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../shared/error-state/error-state.component';
import { LessonRendererComponent } from '../features/lesson-renderer/lesson-renderer.component';

export const routeMeta = defineRouteMeta({
  canActivate: [authGuard, roleGuard],
  data: { role: 'author' },
});

@Component({
  selector: 'app-author-page',
  imports: [
    ReactiveFormsModule,
    LoadingStateComponent,
    ErrorStateComponent,
    LessonRendererComponent,
  ],
  template: `
    <div class="panel-page">
      <section class="panel panel-page__section">
        <h1 class="page-stub__title" style="margin-bottom: 0">
          {{ editingId() ? 'Edit lesson' : 'New lesson' }}
        </h1>
        <form [formGroup]="form" (ngSubmit)="submit()" class="inline-form">
          <label class="inline-form__field" style="flex: 1 1 12rem">
            <span>Title</span>
            <input type="text" formControlName="title" />
          </label>
          <label class="inline-form__field" style="flex: 1 1 8rem">
            <span>Subject</span>
            <input type="text" formControlName="subject" />
          </label>
          <label class="inline-form__field" style="flex: 1 1 100%">
            <span>Description</span>
            <textarea formControlName="description"></textarea>
          </label>
          <label class="inline-form__field inline-form__checkbox">
            <input type="checkbox" formControlName="published" />
            <span>Published</span>
          </label>
          <div class="author-page__editor">
            <label class="inline-form__field">
              <span>Content (LessonML — see LESSON_DSL.md)</span>
              <textarea
                formControlName="content"
                class="author-page__content-input"
                spellcheck="false"
              ></textarea>
            </label>
            <div class="author-page__preview panel">
              <span class="author-page__preview-label">Live preview</span>
              <app-lesson-renderer [source]="contentPreview()" />
            </div>
          </div>
          <div class="author-page__actions">
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid">
              {{ editingId() ? 'Save changes' : 'Create lesson' }}
            </button>
            @if (editingId()) {
              <button type="button" class="btn btn-secondary" (click)="cancelEdit()">
                Cancel
              </button>
            }
          </div>
        </form>
        @if (createError()) {
          <app-error-state [message]="createError()!" [showRetry]="false" />
        }
      </section>

      <section class="panel panel-page__section">
        <h2 class="panel-page__heading">Your lessons</h2>
        @if (loadError()) {
          <app-error-state [message]="loadError()!" (retry)="refresh()" />
        } @else if (loading()) {
          <app-loading-state label="Loading lessons…" />
        } @else if (lessons().length) {
          <div class="card-list">
            @for (lesson of lessons(); track lesson.id) {
              <div class="card-list__item">
                <div class="card-list__item-body">
                  <h3>{{ lesson.title }}</h3>
                  <p>{{ lesson.description }}</p>
                </div>
                <div class="card-list__item-actions">
                  <span class="badge" [class.badge--accent]="lesson.published">
                    {{ lesson.published ? 'Published' : 'Draft' }}
                  </span>
                  <button type="button" class="btn btn-secondary" (click)="edit(lesson)">
                    Edit
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary"
                    (click)="togglePublished(lesson)"
                  >
                    {{ lesson.published ? 'Unpublish' : 'Publish' }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary"
                    (click)="deleteLesson(lesson.id)"
                  >
                    Delete
                  </button>
                </div>
              </div>
            }
          </div>
        } @else {
          <p class="panel-page__empty">No lessons yet — create your first above.</p>
        }
      </section>
    </div>
  `,
  styleUrls: ['./page-stub.css', './panel-page.css', './author.page.css'],
})
export default class AuthorPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly lessonsApi = inject(LessonsApiService);

  protected readonly lessons = signal<Lesson[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly createError = signal<string | null>(null);
  protected readonly editingId = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    subject: ['', Validators.required],
    description: ['', Validators.required],
    content: [''],
    published: [false],
  });

  protected readonly contentPreview = toSignal(this.form.controls.content.valueChanges, {
    initialValue: '',
  });

  constructor() {
    this.refresh();
  }

  protected refresh(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.lessonsApi.mine().subscribe({
      next: (lessons) => {
        this.lessons.set(lessons);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load your lessons.');
        this.loading.set(false);
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid) return;
    this.createError.set(null);
    const payload = this.form.getRawValue();
    const id = this.editingId();

    const request = id ? this.lessonsApi.update(id, payload) : this.lessonsApi.create(payload);
    request.subscribe({
      next: () => {
        this.resetForm();
        this.refresh();
      },
      error: () => this.createError.set(id ? 'Could not save changes.' : 'Could not create lesson.'),
    });
  }

  protected edit(lesson: Lesson): void {
    this.editingId.set(lesson.id);
    this.form.setValue({
      title: lesson.title,
      subject: lesson.subject,
      description: lesson.description,
      content: lesson.content,
      published: lesson.published,
    });
  }

  protected cancelEdit(): void {
    this.resetForm();
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.form.reset({
      title: '',
      subject: '',
      description: '',
      content: '',
      published: false,
    });
  }

  protected togglePublished(lesson: Lesson): void {
    this.lessonsApi
      .update(lesson.id, { published: !lesson.published })
      .subscribe(() => this.refresh());
  }

  protected deleteLesson(id: string): void {
    this.lessonsApi.remove(id).subscribe(() => this.refresh());
  }
}

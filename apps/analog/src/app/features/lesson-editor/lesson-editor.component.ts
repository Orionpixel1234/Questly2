import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Lesson } from '@questly/shared-types';
import { LessonsApiService } from '../../core/api/lessons-api.service';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';
import { LessonRendererComponent } from '../lesson-renderer/lesson-renderer.component';

const STATUS_LABEL: Record<Lesson['status'], string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending review',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected',
};

// Lesson authoring, shared by the Author and Educator panels — both roles
// write lessons the same way and submit them into the same admin review
// queue (see LESSON_DSL.md and the lessons.service review workflow).
@Component({
  selector: 'app-lesson-editor',
  imports: [
    ReactiveFormsModule,
    LoadingStateComponent,
    ErrorStateComponent,
    LessonRendererComponent,
  ],
  template: `
    <section class="panel panel-page__section">
      <h2 class="panel-page__heading">
        {{ editingId() ? 'Edit lesson' : 'New lesson' }}
      </h2>
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
        <div class="lesson-editor__editor">
          <label class="inline-form__field">
            <span>Content (LessonML — see LESSON_DSL.md)</span>
            <textarea
              formControlName="content"
              class="lesson-editor__content-input"
              spellcheck="false"
            ></textarea>
          </label>
          <div class="lesson-editor__preview panel">
            <span class="lesson-editor__preview-label">Live preview</span>
            <app-lesson-renderer [source]="contentPreview()" />
          </div>
        </div>
        <div class="lesson-editor__actions">
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
      @if (formError()) {
        <app-error-state [message]="formError()!" [showRetry]="false" />
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
                @if (lesson.status === 'REJECTED' && lesson.rejectionNote) {
                  <p class="lesson-editor__rejection">
                    Reviewer note: {{ lesson.rejectionNote }}
                  </p>
                }
              </div>
              <div class="card-list__item-actions">
                <span class="badge" [class.badge--accent]="lesson.status === 'PUBLISHED'">
                  {{ statusLabel(lesson) }}
                </span>
                <button type="button" class="btn btn-secondary" (click)="edit(lesson)">
                  Edit
                </button>
                @if (lesson.status === 'DRAFT' || lesson.status === 'REJECTED') {
                  <button
                    type="button"
                    class="btn btn-secondary"
                    (click)="submitForReview(lesson)"
                  >
                    Submit for review
                  </button>
                }
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
  `,
  // panel-page.css lives with the page components — pulled in here too
  // since Angular's emulated encapsulation scopes styles per-component and
  // doesn't cascade a parent page's styleUrls into a child component.
  styleUrls: ['../../pages/panel-page.css', './lesson-editor.component.css'],
})
export class LessonEditorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly lessonsApi = inject(LessonsApiService);

  protected readonly lessons = signal<Lesson[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly editingId = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    subject: ['', Validators.required],
    description: ['', Validators.required],
    content: [''],
  });

  protected readonly contentPreview = toSignal(this.form.controls.content.valueChanges, {
    initialValue: '',
  });

  constructor() {
    this.refresh();
  }

  protected statusLabel(lesson: Lesson): string {
    return STATUS_LABEL[lesson.status];
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
    this.formError.set(null);
    const payload = this.form.getRawValue();
    const id = this.editingId();

    const request = id ? this.lessonsApi.update(id, payload) : this.lessonsApi.create(payload);
    request.subscribe({
      next: () => {
        this.resetForm();
        this.refresh();
      },
      error: () => this.formError.set(id ? 'Could not save changes.' : 'Could not create lesson.'),
    });
  }

  protected edit(lesson: Lesson): void {
    this.editingId.set(lesson.id);
    this.form.setValue({
      title: lesson.title,
      subject: lesson.subject,
      description: lesson.description,
      content: lesson.content,
    });
  }

  protected cancelEdit(): void {
    this.resetForm();
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.form.reset({ title: '', subject: '', description: '', content: '' });
  }

  protected submitForReview(lesson: Lesson): void {
    this.lessonsApi.submit(lesson.id).subscribe(() => this.refresh());
  }

  protected deleteLesson(id: string): void {
    this.lessonsApi.remove(id).subscribe(() => this.refresh());
  }
}

import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { GoalType, UserRole } from '@questly/shared-types';
import { AuthFacade } from '../state/auth/auth.facade';
import { ErrorStateComponent } from '../shared/error-state/error-state.component';

const PANEL_ROUTE_BY_ROLE: Record<UserRole, string> = {
  admin: '/admin',
  author: '/author',
  student: '/student',
  educator: '/educator',
};

const SUBJECT_OPTIONS = ['Math', 'Science', 'Coding', 'Humanities', 'Art'];

type Step = 'credentials' | 'questionnaire';

@Component({
  selector: 'app-signup-page',
  imports: [ReactiveFormsModule, RouterLink, ErrorStateComponent],
  template: `
    <section class="panel page-stub auth-form">
      <span class="page-stub__eyebrow">Create account</span>
      <h1 class="page-stub__title">Join Questly</h1>

      @if (step() === 'credentials') {
        <p class="auth-form__step-label">Step 1 of 2 — Credentials</p>
        <form
          [formGroup]="credentialsForm"
          (ngSubmit)="continueToQuestionnaire()"
          class="auth-form__fields"
        >
          <label class="auth-form__field">
            <span>Name</span>
            <input type="text" formControlName="name" autocomplete="name" />
          </label>
          <label class="auth-form__field">
            <span>Email</span>
            <input type="email" formControlName="email" autocomplete="email" />
          </label>
          <label class="auth-form__field">
            <span>Password (min. 8 characters)</span>
            <input
              type="password"
              formControlName="password"
              autocomplete="new-password"
            />
          </label>

          <button type="submit" class="btn btn-primary" [disabled]="credentialsForm.invalid">
            Continue
          </button>
        </form>
      } @else {
        <p class="auth-form__step-label">Step 2 of 2 — About you</p>
        <form [formGroup]="questionnaireForm" (ngSubmit)="submit()" class="auth-form__fields">
          <div class="auth-form__field">
            <span>Are you studying or teaching?</span>
            <div class="auth-form__choice-group">
              <button
                type="button"
                class="btn"
                [class.btn-primary]="questionnaireForm.controls.goalType.value === 'studying'"
                [class.btn-secondary]="questionnaireForm.controls.goalType.value !== 'studying'"
                (click)="questionnaireForm.controls.goalType.setValue('studying')"
              >
                Studying
              </button>
              <button
                type="button"
                class="btn"
                [class.btn-primary]="questionnaireForm.controls.goalType.value === 'teaching'"
                [class.btn-secondary]="questionnaireForm.controls.goalType.value !== 'teaching'"
                (click)="questionnaireForm.controls.goalType.setValue('teaching')"
              >
                Teaching
              </button>
            </div>
          </div>

          <div class="auth-form__field">
            <span>What subjects interest you?</span>
            <div class="auth-form__chip-group">
              @for (subject of subjectOptions; track subject) {
                <button
                  type="button"
                  class="btn auth-form__chip"
                  [class.btn-primary]="isSubjectSelected(subject)"
                  [class.btn-secondary]="!isSubjectSelected(subject)"
                  (click)="toggleSubject(subject)"
                >
                  {{ subject }}
                </button>
              }
            </div>
          </div>

          <label class="auth-form__field">
            <span>Degree / track (optional)</span>
            <input type="text" formControlName="degreeTrack" />
          </label>

          @if (auth.status() === 'error' && auth.error()) {
            <app-error-state [message]="auth.error()!" [showRetry]="false" />
          }

          <div class="auth-form__actions">
            <button type="button" class="btn btn-secondary" (click)="step.set('credentials')">
              Back
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="questionnaireForm.invalid || auth.status() === 'loading'"
            >
              {{ auth.status() === 'loading' ? 'Creating account…' : 'Create account' }}
            </button>
          </div>
        </form>
      }

      <p class="auth-form__switch">
        Already have an account? <a routerLink="/login">Sign in</a>
      </p>
    </section>
  `,
  styleUrl: './auth-form.css',
})
export default class SignupPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthFacade);

  protected readonly step = signal<Step>('credentials');
  protected readonly subjectOptions = SUBJECT_OPTIONS;

  protected readonly credentialsForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected readonly questionnaireForm = this.fb.nonNullable.group({
    goalType: this.fb.nonNullable.control<GoalType>('studying', Validators.required),
    subjects: this.fb.nonNullable.control<string[]>([]),
    degreeTrack: [''],
  });

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (user) void this.router.navigateByUrl(PANEL_ROUTE_BY_ROLE[user.role]);
    });
  }

  protected continueToQuestionnaire(): void {
    if (this.credentialsForm.invalid) return;
    this.step.set('questionnaire');
  }

  protected isSubjectSelected(subject: string): boolean {
    return this.questionnaireForm.controls.subjects.value.includes(subject);
  }

  protected toggleSubject(subject: string): void {
    const current = this.questionnaireForm.controls.subjects.value;
    const next = current.includes(subject)
      ? current.filter((s) => s !== subject)
      : [...current, subject];
    this.questionnaireForm.controls.subjects.setValue(next);
  }

  protected submit(): void {
    if (this.credentialsForm.invalid || this.questionnaireForm.invalid) return;

    const credentials = this.credentialsForm.getRawValue();
    const questionnaire = this.questionnaireForm.getRawValue();
    const role: UserRole = questionnaire.goalType === 'teaching' ? 'educator' : 'student';

    this.auth.register({
      ...credentials,
      role,
      goalType: questionnaire.goalType,
      subjects: questionnaire.subjects,
      degreeTrack: questionnaire.degreeTrack || undefined,
    });
  }
}

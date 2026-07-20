import { Component, afterNextRender, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { defineRouteMeta } from '@analogjs/router';
import { authGuard } from '../core/guards/auth.guard';
import { API_BASE_URL } from '../core/api-base-url.token';
import { UserFacade } from '../state/user/user.facade';
import { LoadingStateComponent } from '../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../shared/error-state/error-state.component';

export const routeMeta = defineRouteMeta({
  canActivate: [authGuard],
});

@Component({
  selector: 'app-account-page',
  imports: [ReactiveFormsModule, LoadingStateComponent, ErrorStateComponent],
  template: `
    <section class="panel page-stub account-page">
      <span class="page-stub__eyebrow">Account</span>
      <h1 class="page-stub__title">Settings</h1>

      @if (user.status() === 'loading' && !user.profile()) {
        <app-loading-state label="Loading profile…" />
      } @else if (user.profile(); as profile) {
        <div class="account-page__section">
          <h2 class="account-page__heading">Profile</h2>
          <dl class="account-page__facts">
            <dt>Email</dt>
            <dd>{{ profile.email }}</dd>
            <dt>Role</dt>
            <dd>{{ profile.role }}</dd>
            <dt>Subjects</dt>
            <dd>{{ profile.subjects.length ? profile.subjects.join(', ') : '—' }}</dd>
          </dl>

          <form [formGroup]="nameForm" (ngSubmit)="saveName()" class="auth-form__fields">
            <label class="auth-form__field">
              <span>Name</span>
              <input type="text" formControlName="name" />
            </label>
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="nameForm.invalid || user.status() === 'loading'"
            >
              Save name
            </button>
          </form>
        </div>

        <div class="account-page__section">
          <h2 class="account-page__heading">Change password</h2>
          <form
            [formGroup]="passwordForm"
            (ngSubmit)="changePassword()"
            class="auth-form__fields"
          >
            <label class="auth-form__field">
              <span>Current password</span>
              <input
                type="password"
                formControlName="currentPassword"
                autocomplete="current-password"
              />
            </label>
            <label class="auth-form__field">
              <span>New password (min. 8 characters)</span>
              <input
                type="password"
                formControlName="newPassword"
                autocomplete="new-password"
              />
            </label>

            @if (passwordError()) {
              <app-error-state [message]="passwordError()!" [showRetry]="false" />
            }
            @if (passwordSuccess()) {
              <p class="account-page__success">Password updated.</p>
            }

            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="passwordForm.invalid || passwordSubmitting()"
            >
              {{ passwordSubmitting() ? 'Updating…' : 'Change password' }}
            </button>
          </form>
        </div>
      } @else if (user.status() === 'error') {
        <app-error-state
          [message]="user.error() ?? 'Could not load your profile.'"
          (retry)="user.loadProfile()"
        />
      }
    </section>
  `,
  styleUrls: ['./page-stub.css', './auth-form.css', './account.page.css'],
})
export default class AccountPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  protected readonly user = inject(UserFacade);

  protected readonly nameForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
  });

  protected readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected readonly passwordSubmitting = signal(false);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly passwordSuccess = signal(false);

  constructor() {
    this.user.loadProfile();
    afterNextRender(() => {
      const profile = this.user.profile();
      if (profile) this.nameForm.patchValue({ name: profile.name });
    });
  }

  protected saveName(): void {
    if (this.nameForm.invalid) return;
    this.user.updateProfile({ name: this.nameForm.getRawValue().name });
  }

  protected changePassword(): void {
    if (this.passwordForm.invalid) return;
    this.passwordSubmitting.set(true);
    this.passwordError.set(null);
    this.passwordSuccess.set(false);

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.http
      .patch(
        `${this.apiBaseUrl}/auth/password`,
        { currentPassword, newPassword },
        { withCredentials: true },
      )
      .subscribe({
        next: () => {
          this.passwordSubmitting.set(false);
          this.passwordSuccess.set(true);
          this.passwordForm.reset();
        },
        error: (error: HttpErrorResponse) => {
          this.passwordSubmitting.set(false);
          const message: unknown = error.error?.message;
          this.passwordError.set(
            typeof message === 'string' ? message : 'Could not change password.',
          );
        },
      });
  }
}

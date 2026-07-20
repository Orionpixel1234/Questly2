import { Component, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { UserRole } from '@questly/shared-types';
import { AuthFacade } from '../state/auth/auth.facade';
import { ErrorStateComponent } from '../shared/error-state/error-state.component';

const PANEL_ROUTE_BY_ROLE: Record<UserRole, string> = {
  admin: '/admin',
  author: '/author',
  student: '/student',
  educator: '/educator',
};

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, ErrorStateComponent],
  template: `
    <section class="panel page-stub auth-form">
      <span class="page-stub__eyebrow">Sign in</span>
      <h1 class="page-stub__title">Welcome back</h1>

      <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form__fields">
        <label class="auth-form__field">
          <span>Email</span>
          <input type="email" formControlName="email" autocomplete="email" />
        </label>
        <label class="auth-form__field">
          <span>Password</span>
          <input
            type="password"
            formControlName="password"
            autocomplete="current-password"
          />
        </label>

        @if (auth.status() === 'error' && auth.error()) {
          <app-error-state [message]="auth.error()!" [showRetry]="false" />
        }

        <button
          type="submit"
          class="btn btn-primary"
          [disabled]="form.invalid || auth.status() === 'loading'"
        >
          {{ auth.status() === 'loading' ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="auth-form__switch">
        New to Questly? <a routerLink="/signup">Create an account</a>
      </p>
    </section>
  `,
  styleUrl: './auth-form.css',
})
export default class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthFacade);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (user) void this.router.navigateByUrl(PANEL_ROUTE_BY_ROLE[user.role]);
    });
  }

  protected submit(): void {
    if (this.form.invalid) return;
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password);
  }
}

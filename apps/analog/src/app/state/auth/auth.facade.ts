import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AuthActions, RegisterPayload } from './auth.actions';
import { authFeature } from './auth.feature';

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly store = inject(Store);

  readonly status = this.store.selectSignal(authFeature.selectStatus);
  readonly user = this.store.selectSignal(authFeature.selectUser);
  readonly accessToken = this.store.selectSignal(authFeature.selectAccessToken);
  readonly error = this.store.selectSignal(authFeature.selectError);
  readonly isAuthenticated = this.store.selectSignal(
    authFeature.selectIsAuthenticated,
  );

  login(email: string, password: string): void {
    this.store.dispatch(AuthActions.login({ email, password }));
  }

  register(payload: RegisterPayload): void {
    this.store.dispatch(AuthActions.register(payload));
  }

  refreshToken(): void {
    this.store.dispatch(AuthActions.refreshToken());
  }

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}

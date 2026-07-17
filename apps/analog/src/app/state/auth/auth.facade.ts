import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AuthActions } from './auth.actions';
import { authFeature } from './auth.feature';

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly store = inject(Store);

  readonly status = this.store.selectSignal(authFeature.selectStatus);
  readonly userId = this.store.selectSignal(authFeature.selectUserId);
  readonly error = this.store.selectSignal(authFeature.selectError);
  readonly isAuthenticated = this.store.selectSignal(
    authFeature.selectIsAuthenticated,
  );

  login(email: string, password: string): void {
    this.store.dispatch(AuthActions.login({ email, password }));
  }

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}

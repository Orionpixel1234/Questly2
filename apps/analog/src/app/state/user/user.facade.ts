import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { UserActions } from './user.actions';
import { userFeature } from './user.feature';
import type { UserProfile } from './user.model';

@Injectable({ providedIn: 'root' })
export class UserFacade {
  private readonly store = inject(Store);

  readonly profile = this.store.selectSignal(userFeature.selectProfile);
  readonly status = this.store.selectSignal(userFeature.selectStatus);
  readonly error = this.store.selectSignal(userFeature.selectError);

  loadProfile(): void {
    this.store.dispatch(UserActions.loadProfile());
  }

  updateProfile(changes: Partial<UserProfile>): void {
    this.store.dispatch(UserActions.updateProfile({ changes }));
  }

  clearProfile(): void {
    this.store.dispatch(UserActions.clearProfile());
  }
}

import { createFeature, createReducer, on } from '@ngrx/store';
import { UserActions } from './user.actions';
import type { UserProfile } from './user.model';

export type { UserProfile, UserRole } from './user.model';

export type UserStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface UserState {
  profile: UserProfile | null;
  status: UserStatus;
  error: string | null;
}

export const initialUserState: UserState = {
  profile: null,
  status: 'idle',
  error: null,
};

export const userFeature = createFeature({
  name: 'user',
  reducer: createReducer(
    initialUserState,
    on(
      UserActions.loadProfile,
      (state): UserState => ({ ...state, status: 'loading', error: null }),
    ),
    on(
      UserActions.loadProfileSuccess,
      (state, { profile }): UserState => ({
        ...state,
        status: 'loaded',
        profile,
        error: null,
      }),
    ),
    on(
      UserActions.loadProfileFailure,
      (state, { error }): UserState => ({ ...state, status: 'error', error }),
    ),
    on(
      UserActions.updateProfile,
      (state, { changes }): UserState => ({
        ...state,
        profile: state.profile ? { ...state.profile, ...changes } : null,
      }),
    ),
    on(UserActions.clearProfile, (): UserState => initialUserState),
  ),
});

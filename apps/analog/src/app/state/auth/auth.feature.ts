import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import type { AuthUser } from '@questly/shared-types';
import { AuthActions } from './auth.actions';

// 'idle' = no check attempted yet (guards wait past this).
// 'unauthenticated' = checked (refresh failed, or explicit logout) and
// confirmed not logged in — distinct from 'idle' so an async route guard
// waiting for "the initial check has resolved" doesn't hang forever.
export type AuthStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'error';

export interface AuthState {
  status: AuthStatus;
  // Access token lives in memory only — never persisted. The refresh token
  // is an httpOnly cookie the browser handles automatically; this is what
  // Phase 0's localStorage-based persistToken$ effect has been replaced by.
  accessToken: string | null;
  user: AuthUser | null;
  error: string | null;
}

export const initialAuthState: AuthState = {
  status: 'idle',
  accessToken: null,
  user: null,
  error: null,
};

const unauthenticatedState: AuthState = {
  status: 'unauthenticated',
  accessToken: null,
  user: null,
  error: null,
};

export const authFeature = createFeature({
  name: 'auth',
  reducer: createReducer(
    initialAuthState,
    on(
      AuthActions.login,
      AuthActions.register,
      (state): AuthState => ({ ...state, status: 'loading', error: null }),
    ),
    on(
      AuthActions.loginSuccess,
      AuthActions.registerSuccess,
      AuthActions.refreshTokenSuccess,
      (state, { accessToken, user }): AuthState => ({
        ...state,
        status: 'authenticated',
        accessToken,
        user,
        error: null,
      }),
    ),
    on(
      AuthActions.loginFailure,
      AuthActions.registerFailure,
      (state, { error }): AuthState => ({
        ...state,
        status: 'error',
        accessToken: null,
        user: null,
        error,
      }),
    ),
    on(AuthActions.refreshTokenFailure, (): AuthState => unauthenticatedState),
    on(AuthActions.logout, (): AuthState => unauthenticatedState),
  ),
  extraSelectors: ({ selectStatus }) => ({
    selectIsAuthenticated: createSelector(
      selectStatus,
      (status) => status === 'authenticated',
    ),
    // True once the initial silent-refresh check has settled either way —
    // what async route guards wait on instead of racing the in-memory token.
    selectAuthResolved: createSelector(
      selectStatus,
      (status) => status !== 'idle' && status !== 'loading',
    ),
  }),
});

export type { AuthUser };

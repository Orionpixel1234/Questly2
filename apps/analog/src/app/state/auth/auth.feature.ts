import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { AuthActions } from './auth.actions';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

export interface AuthState {
  status: AuthStatus;
  userId: string | null;
  token: string | null;
  error: string | null;
}

export const initialAuthState: AuthState = {
  status: 'idle',
  userId: null,
  token: null,
  error: null,
};

export const authFeature = createFeature({
  name: 'auth',
  reducer: createReducer(
    initialAuthState,
    on(
      AuthActions.login,
      (state): AuthState => ({ ...state, status: 'loading', error: null }),
    ),
    on(
      AuthActions.loginSuccess,
      (state, { userId, token }): AuthState => ({
        ...state,
        status: 'authenticated',
        userId,
        token,
        error: null,
      }),
    ),
    on(
      AuthActions.loginFailure,
      (state, { error }): AuthState => ({
        ...state,
        status: 'error',
        error,
      }),
    ),
    on(AuthActions.logout, (): AuthState => initialAuthState),
  ),
  extraSelectors: ({ selectStatus }) => ({
    selectIsAuthenticated: createSelector(
      selectStatus,
      (status) => status === 'authenticated',
    ),
  }),
});

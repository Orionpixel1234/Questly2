import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of, tap } from 'rxjs';
import type { AuthUser } from '@questly/shared-types';
import { AuthActions } from './auth.actions';
import { API_BASE_URL } from '../../core/api-base-url.token';

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(({ email, password }) =>
        this.http
          .post<AuthResponse>(
            `${this.apiBaseUrl}/auth/login`,
            { email, password },
            { withCredentials: true },
          )
          .pipe(
            map(({ accessToken, user }) =>
              AuthActions.loginSuccess({ accessToken, user }),
            ),
            catchError((error: HttpErrorResponse) =>
              of(AuthActions.loginFailure({ error: extractErrorMessage(error) })),
            ),
          ),
      ),
    ),
  );

  register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.register),
      exhaustMap((action) => {
        const { email, password, name, role, goalType, subjects, degreeTrack, goals } =
          action;
        const payload = {
          email,
          password,
          name,
          role,
          goalType,
          subjects,
          degreeTrack,
          goals,
        };
        return this.http
          .post<AuthResponse>(`${this.apiBaseUrl}/auth/register`, payload, {
            withCredentials: true,
          })
          .pipe(
            map(({ accessToken, user }) =>
              AuthActions.registerSuccess({ accessToken, user }),
            ),
            catchError((error: HttpErrorResponse) =>
              of(AuthActions.registerFailure({ error: extractErrorMessage(error) })),
            ),
          );
      }),
    ),
  );

  refreshToken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.refreshToken),
      exhaustMap(() =>
        this.http
          .post<AuthResponse>(
            `${this.apiBaseUrl}/auth/refresh`,
            {},
            { withCredentials: true },
          )
          .pipe(
            map(({ accessToken, user }) =>
              AuthActions.refreshTokenSuccess({ accessToken, user }),
            ),
            catchError(() => of(AuthActions.refreshTokenFailure())),
          ),
      ),
    ),
  );

  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logout),
        tap(() => {
          this.http
            .post(`${this.apiBaseUrl}/auth/logout`, {}, { withCredentials: true })
            .subscribe();
        }),
      ),
    { dispatch: false },
  );
}

function extractErrorMessage(error: HttpErrorResponse): string {
  const message: unknown = error.error?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return 'Something went wrong. Please try again.';
}

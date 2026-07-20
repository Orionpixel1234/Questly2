import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of } from 'rxjs';
import { UserActions } from './user.actions';
import type { UserProfile } from './user.model';
import { API_BASE_URL } from '../../core/api-base-url.token';

@Injectable()
export class UserEffects {
  private readonly actions$ = inject(Actions);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  loadProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.loadProfile),
      exhaustMap(() =>
        this.http
          .get<UserProfile>(`${this.apiBaseUrl}/users/me`, {
            withCredentials: true,
          })
          .pipe(
            map((profile) => UserActions.loadProfileSuccess({ profile })),
            catchError((error: HttpErrorResponse) =>
              of(UserActions.loadProfileFailure({ error: extractErrorMessage(error) })),
            ),
          ),
      ),
    ),
  );

  updateProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.updateProfile),
      exhaustMap(({ changes }) =>
        this.http
          .patch<UserProfile>(`${this.apiBaseUrl}/users/me`, changes, {
            withCredentials: true,
          })
          .pipe(
            map((profile) => UserActions.updateProfileSuccess({ profile })),
            catchError((error: HttpErrorResponse) =>
              of(UserActions.updateProfileFailure({ error: extractErrorMessage(error) })),
            ),
          ),
      ),
    ),
  );
}

function extractErrorMessage(error: HttpErrorResponse): string {
  const message: unknown = error.error?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return 'Something went wrong. Please try again.';
}

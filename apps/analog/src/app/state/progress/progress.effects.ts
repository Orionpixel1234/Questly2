import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of } from 'rxjs';
import { ProgressActions } from './progress.actions';
import type { SubjectProgress } from './progress.model';
import { API_BASE_URL } from '../../core/api-base-url.token';

@Injectable()
export class ProgressEffects {
  private readonly actions$ = inject(Actions);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  loadProgress$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProgressActions.loadProgress),
      exhaustMap(() =>
        this.http
          .get<SubjectProgress[]>(`${this.apiBaseUrl}/progress/me`, {
            withCredentials: true,
          })
          .pipe(
            map((progress) => ProgressActions.loadProgressSuccess({ progress })),
            catchError((error: HttpErrorResponse) =>
              of(
                ProgressActions.loadProgressFailure({
                  error: extractErrorMessage(error),
                }),
              ),
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

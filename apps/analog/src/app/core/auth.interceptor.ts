import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { catchError, switchMap, take, throwError } from 'rxjs';
import { authFeature } from '../state/auth/auth.feature';
import { AuthActions } from '../state/auth/auth.actions';

// Module-scope, not per-call: if several requests 401 around the same
// moment (the common case — a page fires off several API calls at once,
// and the access token happens to have expired since the last navigation),
// they should share one refresh instead of each triggering their own.
let refreshInFlight = false;

// The access token is short-lived (15m) and nothing proactively renews it
// mid-session — previously the only refresh points were app boot and route
// guard activation, so staying on one page past 15m silently broke every
// API call with a raw "Unauthorized" until the next navigation. This
// catches that 401, refreshes once via the existing AuthEffects.refreshToken$
// (reusing its HTTP-call logic rather than duplicating it here), and
// transparently retries the original request with the new token.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);
  const actions$ = inject(Actions);
  const token = store.selectSignal(authFeature.selectAccessToken)();
  const authedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      const isAuthCall =
        req.url.endsWith('/auth/refresh') || req.url.endsWith('/auth/login');
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        isAuthCall
      ) {
        return throwError(() => error);
      }

      if (!refreshInFlight) {
        refreshInFlight = true;
        store.dispatch(AuthActions.refreshToken());
      }

      return actions$.pipe(
        ofType(AuthActions.refreshTokenSuccess, AuthActions.refreshTokenFailure),
        take(1),
        switchMap((result) => {
          refreshInFlight = false;
          if (result.type !== AuthActions.refreshTokenSuccess.type) {
            return throwError(() => error);
          }
          return next(
            req.clone({
              setHeaders: { Authorization: `Bearer ${result.accessToken}` },
            }),
          );
        }),
      );
    }),
  );
};

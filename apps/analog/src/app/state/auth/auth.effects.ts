import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap } from 'rxjs';
import { AuthActions } from './auth.actions';

const STORAGE_KEY = 'questly-auth-token';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  persistToken$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginSuccess),
        tap(({ token }) => {
          if (this.isBrowser) localStorage.setItem(STORAGE_KEY, token);
        }),
      ),
    { dispatch: false },
  );

  clearTokenOnLogout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logout),
        tap(() => {
          if (this.isBrowser) localStorage.removeItem(STORAGE_KEY);
        }),
      ),
    { dispatch: false },
  );
}

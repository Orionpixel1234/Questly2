import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, take } from 'rxjs';
import { AuthActions } from '../../state/auth/auth.actions';
import { authFeature } from '../../state/auth/auth.feature';

// Self-initiating: don't assume something else (e.g. AppComponent) already
// kicked off the silent-refresh check. SSR runs guards too, and
// afterNextRender (what AppComponent uses) never fires on the server, so a
// guard that only *waited* on selectAuthResolved would hang forever there.
export const authGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  if (store.selectSignal(authFeature.selectStatus)() === 'idle') {
    store.dispatch(AuthActions.refreshToken());
  }

  return store.select(authFeature.selectAuthResolved).pipe(
    filter(Boolean),
    take(1),
    map(() =>
      store.selectSignal(authFeature.selectIsAuthenticated)()
        ? true
        : router.createUrlTree(['/login']),
    ),
  );
};

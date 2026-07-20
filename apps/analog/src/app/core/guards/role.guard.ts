import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, take } from 'rxjs';
import type { UserRole } from '@questly/shared-types';
import { AuthActions } from '../../state/auth/auth.actions';
import { authFeature } from '../../state/auth/auth.feature';

const PANEL_ROUTE_BY_ROLE: Record<UserRole, string> = {
  admin: '/admin',
  author: '/author',
  student: '/student',
  educator: '/educator',
};

// Redirects to the user's OWN panel on a role mismatch, rather than just
// blocking — an educator hitting /admin lands on /educator, not a 403 page.
// Self-initiating for the same SSR reason as authGuard — see its comment.
export const roleGuard: CanActivateFn = (route) => {
  const store = inject(Store);
  const router = inject(Router);
  const requiredRole = route.data['role'] as UserRole | undefined;

  if (store.selectSignal(authFeature.selectStatus)() === 'idle') {
    store.dispatch(AuthActions.refreshToken());
  }

  return store.select(authFeature.selectAuthResolved).pipe(
    filter(Boolean),
    take(1),
    map(() => {
      const user = store.selectSignal(authFeature.selectUser)();
      if (!user) return router.createUrlTree(['/login']);
      if (!requiredRole || user.role === requiredRole) return true;
      return router.createUrlTree([PANEL_ROUTE_BY_ROLE[user.role]]);
    }),
  );
};

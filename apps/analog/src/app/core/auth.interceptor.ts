import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { authFeature } from '../state/auth/auth.feature';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(Store).selectSignal(authFeature.selectAccessToken)();
  if (!token) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

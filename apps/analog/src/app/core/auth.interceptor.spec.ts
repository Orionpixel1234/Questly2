import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Store, provideStore, provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import type { AuthUser } from '@questly/shared-types';
import { authInterceptor } from './auth.interceptor';
import { authFeature } from '../state/auth/auth.feature';
import { AuthActions } from '../state/auth/auth.actions';

const USER: AuthUser = {
  id: 'u1',
  email: 'demo@questly.dev',
  name: 'Demo',
  role: 'student',
};

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let store: Store;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideStore(),
        provideState(authFeature),
        provideEffects([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(Store);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('attaches the current access token to outgoing requests', () => {
    store.dispatch(
      AuthActions.loginSuccess({ accessToken: 'token-1', user: USER }),
    );

    http.get('/api/v1/progress/me').subscribe();

    const req = httpMock.expectOne('/api/v1/progress/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
    req.flush({});
  });

  it('on a 401, refreshes the token and transparently retries with the new one', () => {
    store.dispatch(
      AuthActions.loginSuccess({ accessToken: 'stale-token', user: USER }),
    );

    let result: unknown;
    http.get('/api/v1/progress/me').subscribe((res) => (result = res));

    const first = httpMock.expectOne('/api/v1/progress/me');
    expect(first.request.headers.get('Authorization')).toBe(
      'Bearer stale-token',
    );
    first.flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    // Simulates AuthEffects.refreshToken$ resolving — the interceptor
    // reacts to the resulting action, it doesn't make the HTTP call itself.
    store.dispatch(
      AuthActions.refreshTokenSuccess({
        accessToken: 'fresh-token',
        user: USER,
      }),
    );

    const retried = httpMock.expectOne('/api/v1/progress/me');
    expect(retried.request.headers.get('Authorization')).toBe(
      'Bearer fresh-token',
    );
    retried.flush({ ok: true });

    expect(result).toEqual({ ok: true });
  });

  it('propagates the original 401 if the refresh itself fails', () => {
    store.dispatch(
      AuthActions.loginSuccess({ accessToken: 'stale-token', user: USER }),
    );

    let error: unknown;
    http.get('/api/v1/progress/me').subscribe({
      error: (err) => (error = err),
    });

    const first = httpMock.expectOne('/api/v1/progress/me');
    first.flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    store.dispatch(AuthActions.refreshTokenFailure());

    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(401);
  });

  it('does not intercept 401s from the refresh call itself (no infinite loop)', () => {
    let error: unknown;
    http.post('/api/v1/auth/refresh', {}).subscribe({
      error: (err) => (error = err),
    });

    const req = httpMock.expectOne('/api/v1/auth/refresh');
    req.flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    // No retry request should ever be made for this URL.
    httpMock.expectNone('/api/v1/auth/refresh');
    expect(error).toBeInstanceOf(HttpErrorResponse);
  });
});

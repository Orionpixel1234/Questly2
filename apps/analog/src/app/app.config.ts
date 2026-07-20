import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideFileRouter, requestContextInterceptor } from '@analogjs/router';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { authFeature } from './state/auth/auth.feature';
import { AuthEffects } from './state/auth/auth.effects';
import { userFeature } from './state/user/user.feature';
import { UserEffects } from './state/user/user.effects';
import { progressFeature } from './state/progress/progress.feature';
import { ProgressEffects } from './state/progress/progress.effects';
import { uiFeature } from './state/ui/ui.feature';
import { authInterceptor } from './core/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideFileRouter(),
    provideClientHydration(),
    provideHttpClient(
      withFetch(),
      withInterceptors([requestContextInterceptor, authInterceptor]),
    ),

    provideStore(),
    provideState(authFeature),
    provideState(userFeature),
    provideState(progressFeature),
    provideState(uiFeature),
    provideEffects([AuthEffects, UserEffects, ProgressEffects]),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
  ],
};

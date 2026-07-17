import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    Login: props<{ email: string; password: string }>(),
    'Login Success': props<{ userId: string; token: string }>(),
    'Login Failure': props<{ error: string }>(),
    Logout: emptyProps(),
  },
});

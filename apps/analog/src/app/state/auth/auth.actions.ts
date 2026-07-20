import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { AuthUser, GoalType, SubjectGoal } from '@questly/shared-types';

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  role: AuthUser['role'];
  goalType?: GoalType;
  subjects?: string[];
  degreeTrack?: string;
  goals?: SubjectGoal[];
}

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    Login: props<{ email: string; password: string }>(),
    'Login Success': props<{ accessToken: string; user: AuthUser }>(),
    'Login Failure': props<{ error: string }>(),

    Register: props<RegisterPayload>(),
    'Register Success': props<{ accessToken: string; user: AuthUser }>(),
    'Register Failure': props<{ error: string }>(),

    'Refresh Token': emptyProps(),
    'Refresh Token Success': props<{ accessToken: string; user: AuthUser }>(),
    'Refresh Token Failure': emptyProps(),

    Logout: emptyProps(),
  },
});

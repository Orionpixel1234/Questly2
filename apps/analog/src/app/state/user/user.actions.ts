import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { UserProfile } from './user.model';

export const UserActions = createActionGroup({
  source: 'User',
  events: {
    'Load Profile': emptyProps(),
    'Load Profile Success': props<{ profile: UserProfile }>(),
    'Load Profile Failure': props<{ error: string }>(),
    'Update Profile': props<{ changes: Partial<UserProfile> }>(),
    'Update Profile Success': props<{ profile: UserProfile }>(),
    'Update Profile Failure': props<{ error: string }>(),
    'Clear Profile': emptyProps(),
  },
});

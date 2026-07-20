import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { SubjectProgress } from './progress.model';

export const ProgressActions = createActionGroup({
  source: 'Progress',
  events: {
    'Load Progress': emptyProps(),
    'Load Progress Success': props<{ progress: SubjectProgress[] }>(),
    'Load Progress Failure': props<{ error: string }>(),
  },
});

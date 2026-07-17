import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const UiActions = createActionGroup({
  source: 'UI',
  events: {
    'Toggle Sidebar': emptyProps(),
    'Set Sidebar Collapsed': props<{ collapsed: boolean }>(),
    'Set Global Loading': props<{ loading: boolean }>(),
  },
});

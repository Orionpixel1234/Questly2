import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createFeature, createReducer, on } from '@ngrx/store';
import { ProgressActions } from './progress.actions';
import type { SubjectProgress } from './progress.model';

export type { SubjectProgress } from './progress.model';

export type ProgressStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface ProgressState extends EntityState<SubjectProgress> {
  status: ProgressStatus;
  error: string | null;
}

export const progressAdapter = createEntityAdapter<SubjectProgress>({
  selectId: (progress) => progress.subject,
});

export const initialProgressState: ProgressState =
  progressAdapter.getInitialState({
    status: 'idle',
    error: null,
  });

export const progressFeature = createFeature({
  name: 'progress',
  reducer: createReducer(
    initialProgressState,
    on(
      ProgressActions.loadProgress,
      (state): ProgressState => ({ ...state, status: 'loading', error: null }),
    ),
    on(ProgressActions.loadProgressSuccess, (state, { progress }): ProgressState =>
      progressAdapter.setAll(progress, { ...state, status: 'loaded', error: null }),
    ),
    on(
      ProgressActions.loadProgressFailure,
      (state, { error }): ProgressState => ({ ...state, status: 'error', error }),
    ),
  ),
  extraSelectors: ({ selectProgressState }) => {
    const { selectAll, selectTotal } = progressAdapter.getSelectors(
      selectProgressState,
    );
    return { selectAllProgress: selectAll, selectTotalProgress: selectTotal };
  },
});

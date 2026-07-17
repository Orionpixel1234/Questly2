import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { ProgressActions } from './progress.actions';
import { progressFeature } from './progress.feature';

@Injectable({ providedIn: 'root' })
export class ProgressFacade {
  private readonly store = inject(Store);

  readonly subjects = this.store.selectSignal(progressFeature.selectAllProgress);
  readonly total = this.store.selectSignal(progressFeature.selectTotalProgress);
  readonly status = this.store.selectSignal(progressFeature.selectStatus);
  readonly error = this.store.selectSignal(progressFeature.selectError);

  loadProgress(): void {
    this.store.dispatch(ProgressActions.loadProgress());
  }

  addExp(subjectId: string, amount: number): void {
    this.store.dispatch(ProgressActions.addExp({ subjectId, amount }));
  }

  setGoal(subjectId: string, goal: number): void {
    this.store.dispatch(ProgressActions.setGoal({ subjectId, goal }));
  }
}

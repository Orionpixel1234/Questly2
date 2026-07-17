import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { UiActions } from './ui.actions';
import { uiFeature } from './ui.feature';

@Injectable({ providedIn: 'root' })
export class UiFacade {
  private readonly store = inject(Store);

  readonly sidebarCollapsed = this.store.selectSignal(
    uiFeature.selectSidebarCollapsed,
  );
  readonly globalLoading = this.store.selectSignal(uiFeature.selectGlobalLoading);

  toggleSidebar(): void {
    this.store.dispatch(UiActions.toggleSidebar());
  }

  setGlobalLoading(loading: boolean): void {
    this.store.dispatch(UiActions.setGlobalLoading({ loading }));
  }
}

import { createFeature, createReducer, on } from '@ngrx/store';
import { UiActions } from './ui.actions';

export interface UiState {
  sidebarCollapsed: boolean;
  globalLoading: boolean;
}

export const initialUiState: UiState = {
  sidebarCollapsed: false,
  globalLoading: false,
};

export const uiFeature = createFeature({
  name: 'ui',
  reducer: createReducer(
    initialUiState,
    on(
      UiActions.toggleSidebar,
      (state): UiState => ({
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed,
      }),
    ),
    on(
      UiActions.setSidebarCollapsed,
      (state, { collapsed }): UiState => ({ ...state, sidebarCollapsed: collapsed }),
    ),
    on(
      UiActions.setGlobalLoading,
      (state, { loading }): UiState => ({ ...state, globalLoading: loading }),
    ),
  ),
});

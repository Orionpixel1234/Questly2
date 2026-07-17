import type { AuthState } from './auth/auth.feature';
import type { ProgressState } from './progress/progress.feature';
import type { UiState } from './ui/ui.feature';
import type { UserState } from './user/user.feature';

// Each slice is registered independently via provideState() in app.config.ts;
// this type exists purely so call sites can name the whole tree.
export interface AppState {
  auth: AuthState;
  user: UserState;
  progress: ProgressState;
  ui: UiState;
}

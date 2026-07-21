import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { UserRole } from '@questly/shared-types';
import { AuthFacade } from '../../state/auth/auth.facade';
import { ProgressFacade } from '../../state/progress/progress.facade';
import { UiFacade } from '../../state/ui/ui.facade';

const PANEL_ROUTE_BY_ROLE: Record<UserRole, string> = {
  admin: '/admin',
  author: '/author',
  student: '/student',
  educator: '/educator',
};

// The "neat little sidebar tracking your progress" from the product brief —
// visible only when signed in, shows live per-subject EXP against goals.
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink],
  template: `
    @if (auth.isAuthenticated()) {
      <aside class="sidebar" [class.sidebar--collapsed]="ui.sidebarCollapsed()">
        <button
          type="button"
          class="sidebar__toggle"
          (click)="ui.toggleSidebar()"
          [attr.aria-expanded]="!ui.sidebarCollapsed()"
          aria-label="Toggle sidebar"
        >
          {{ ui.sidebarCollapsed() ? '»' : '«' }}
        </button>

        @if (!ui.sidebarCollapsed()) {
          <div class="sidebar__body">
            <div class="sidebar__links">
              <a class="sidebar__panel-link btn btn-secondary" [routerLink]="panelRoute()">
                My panel
              </a>
              <a class="sidebar__panel-link btn btn-secondary" routerLink="/calendar">
                Calendar
              </a>
              <a class="sidebar__panel-link btn btn-secondary" routerLink="/game">
                Game
              </a>
            </div>

            <div class="sidebar__section">
              <span class="sidebar__section-title">Your progress</span>
              @if (progress.subjects().length === 0) {
                <p class="sidebar__empty">No goals set yet.</p>
              } @else {
                <div class="sidebar__goals">
                  @for (goal of progress.subjects(); track goal.subject) {
                    <div class="sidebar__goal">
                      <div class="sidebar__goal-header">
                        <span>{{ goal.subject }}</span>
                        <span class="sidebar__goal-level">Lv. {{ goal.level }}</span>
                      </div>
                      <div class="progress-bar">
                        <div
                          class="progress-bar__fill"
                          [style.width.%]="percent(goal.exp, goal.target)"
                        ></div>
                      </div>
                      <span class="sidebar__goal-exp">{{ goal.exp }} / {{ goal.target }} EXP</span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      </aside>
    }
  `,
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  protected readonly auth = inject(AuthFacade);
  protected readonly progress = inject(ProgressFacade);
  protected readonly ui = inject(UiFacade);

  protected readonly panelRoute = computed(() => {
    const role = this.auth.user()?.role;
    return role ? PANEL_ROUTE_BY_ROLE[role] : '/';
  });

  constructor() {
    this.progress.loadProgress();
  }

  protected percent(exp: number, target: number): number {
    return target > 0 ? Math.min(100, Math.round((exp / target) * 100)) : 0;
  }
}

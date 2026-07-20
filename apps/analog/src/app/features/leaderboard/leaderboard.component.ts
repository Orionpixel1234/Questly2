import { Component, inject, signal } from '@angular/core';
import type { LeaderboardEntry } from '@questly/shared-types';
import { ProgressApiService } from '../../core/api/progress-api.service';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';

// The "built in game to help motivate Educators and Students alike" from
// the product brief — total EXP across all subjects, top 20.
@Component({
  selector: 'app-leaderboard',
  imports: [LoadingStateComponent, ErrorStateComponent],
  template: `
    <div class="panel panel-page__section">
      <h2 class="panel-page__heading">Leaderboard</h2>
      @if (loading()) {
        <app-loading-state label="Loading leaderboard…" />
      } @else if (error()) {
        <app-error-state [message]="error()!" (retry)="load()" />
      } @else if (entries().length === 0) {
        <p class="panel-page__empty">No EXP earned yet — complete a lesson to appear here.</p>
      } @else {
        <ol class="leaderboard__list">
          @for (entry of entries(); track entry.userId; let i = $index) {
            <li class="leaderboard__row">
              <span class="leaderboard__rank">#{{ i + 1 }}</span>
              <span class="leaderboard__name">{{ entry.name }}</span>
              <span class="badge badge--accent">Lv. {{ entry.level }}</span>
              <span class="leaderboard__exp">{{ entry.totalExp }} EXP</span>
            </li>
          }
        </ol>
      }
    </div>
  `,
  styleUrl: './leaderboard.component.css',
})
export class LeaderboardComponent {
  private readonly progressApi = inject(ProgressApiService);

  protected readonly entries = signal<LeaderboardEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.progressApi.leaderboard().subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the leaderboard.');
        this.loading.set(false);
      },
    });
  }
}

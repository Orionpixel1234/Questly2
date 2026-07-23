import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { defineRouteMeta } from '@analogjs/router';
import { SHIP_TIERS } from '@questly/shared-types';
import type { GameLeaderboardEntry, StarMap } from '@questly/shared-types';
import { authGuard } from '../core/guards/auth.guard';
import { GameApiService } from '../core/api/game-api.service';
import { LoadingStateComponent } from '../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../shared/error-state/error-state.component';
import { MiniGamesComponent } from '../features/mini-games/mini-games.component';
import { OutpostComponent } from '../features/outpost/outpost.component';
import { AsteroidBeltComponent } from '../features/outpost/asteroid-belt.component';
import { SpaceStationComponent } from '../features/space-station/space-station.component';
import { GameMapComponent, type GameMapLandmark } from '../features/game-map/game-map.component';

type PanelKind =
  | 'hangar'
  | 'outpost'
  | 'station'
  | 'leaderboard'
  | 'minigames'
  | 'system'
  | 'asteroid'
  | null;

// No roleGuard — every role plays the same game. Star Chart nodes are
// claimed by completing real lessons (GameService derives the map live from
// LessonCompletion) — no separate grind there. The Outpost's stations are
// actual click-to-play mini-games (see StationMinigameComponent) layered on
// top of lesson-earned resources.
//
// Entry point is GameMapComponent: an avatar you drive around with
// WASD/arrows and walk up to landmarks, rather than a stack of page
// sections. Each landmark opens the exact same panel/logic that used to sit
// inline on the page — nothing about Hangar/Outpost/Explorers/Practice
// games changed, only how you get to them.
export const routeMeta = defineRouteMeta({
  canActivate: [authGuard],
});

@Component({
  selector: 'app-game-page',
  imports: [
    RouterLink,
    LoadingStateComponent,
    ErrorStateComponent,
    MiniGamesComponent,
    OutpostComponent,
    AsteroidBeltComponent,
    SpaceStationComponent,
    GameMapComponent,
  ],
  template: `
    <div class="panel-page">
      <section class="panel page-stub">
        <span class="page-stub__eyebrow">The game</span>
        <h1 class="page-stub__title">Star Chart</h1>
        <p class="page-stub__body">
          Drive your ship around the map with WASD or the arrow keys and walk up to a landmark
          to enter it. Every subject you have lessons in is a system — completing a real lesson
          claims its node and pays out Stardust, the same as always.
        </p>
      </section>

      @if (loadError()) {
        <app-error-state [message]="loadError()!" (retry)="load()" />
      } @else if (loading()) {
        <app-loading-state label="Charting the galaxy…" />
      } @else if (map(); as m) {
        <section class="panel panel-page__section">
          <app-game-map [landmarks]="landmarks()" (enter)="onEnter($event)" />
        </section>

        @if (activePanel() === 'asteroid') {
          <app-asteroid-belt (exit)="closePanel()" />
        } @else if (activePanel(); as panel) {
          <div class="game-page__panel-overlay">
            <div class="game-page__panel">
              <button type="button" class="btn btn-secondary game-page__panel-back" (click)="closePanel()">
                ← Back to map
              </button>

              @if (panel === 'hangar') {
                <h2 class="panel-page__heading">Hangar</h2>
                <p class="panel-page__empty" style="margin: 0 0 var(--space-3)">
                  {{ m.profile.stardust }} Stardust available
                </p>
                <div class="game-page__hangar">
                  @for (tier of shipTiers; track tier.tier) {
                    <div
                      class="stat-card game-page__tier"
                      [class.game-page__tier--owned]="tier.tier <= m.profile.shipTier"
                      [class.game-page__tier--next]="tier.tier === m.profile.shipTier + 1"
                    >
                      <span class="stat-card__label">Tier {{ tier.tier }}</span>
                      <span class="stat-card__value" style="font-size: var(--text-lg)">
                        {{ tier.name }}
                      </span>
                      @if (tier.tier <= m.profile.shipTier) {
                        <span class="badge badge--accent">Owned</span>
                      } @else if (tier.tier === m.profile.shipTier + 1) {
                        <button
                          type="button"
                          class="btn btn-primary"
                          [disabled]="m.profile.stardust < tier.cost"
                          (click)="upgrade()"
                        >
                          Upgrade — {{ tier.cost }} stardust
                        </button>
                      } @else {
                        <span class="stat-card__hint">{{ tier.cost }} stardust</span>
                      }
                    </div>
                  }
                </div>
                @if (upgradeError()) {
                  <app-error-state [message]="upgradeError()!" [showRetry]="false" />
                }
              } @else if (panel === 'system') {
                @for (system of m.systems; track system.subject) {
                  @if (system.subject === activeSystemSubject()) {
                    <h2 class="panel-page__heading">{{ system.subject }}</h2>
                    <div class="game-page__nodes">
                      @for (node of system.nodes; track node.lessonId) {
                        <a
                          class="game-page__node"
                          [class.game-page__node--claimed]="node.claimed"
                          [routerLink]="['/lessons', node.lessonId]"
                        >
                          {{ node.claimed ? '✓' : '○' }} {{ node.title }}
                        </a>
                      }
                    </div>
                  }
                }
              } @else if (panel === 'outpost') {
                <h2 class="panel-page__heading">Outpost</h2>
                <p class="panel-page__empty" style="margin: 0 0 var(--space-3)">
                  Lessons pay out resources by subject — craft them into buildings and place them
                  on your grid. Once placed, click a building to play its station mini-game for a
                  direct, skill-scaled top-up on a cooldown.
                </p>
                <app-outpost />
              } @else if (panel === 'station') {
                <h2 class="panel-page__heading">Space Station</h2>
                <p class="panel-page__empty" style="margin: 0 0 var(--space-3)">
                  A second base, same resource economy as the Outpost — orbital/tech buildings
                  instead of ground ones. Ice (from the Asteroid Belt) is what most of these cost.
                </p>
                <app-space-station />
              } @else if (panel === 'leaderboard') {
                <h2 class="panel-page__heading">Explorers</h2>
                @if (leaderboard().length) {
                  <div style="overflow-x: auto">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Stardust</th>
                          <th>Ship tier</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (entry of leaderboard(); track entry.userId) {
                          <tr>
                            <td>{{ entry.name }}</td>
                            <td>{{ entry.stardust }}</td>
                            <td>{{ shipName(entry.shipTier) }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <p class="panel-page__empty">No explorers yet — be the first to earn stardust.</p>
                }
              } @else if (panel === 'minigames') {
                <h2 class="panel-page__heading">Practice games</h2>
                <p class="panel-page__empty" style="margin: 0 0 var(--space-3)">
                  Quick drills on any topic — type one in and Nova writes the questions. No EXP or
                  Stardust here, just practice.
                </p>
                <app-mini-games />
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styleUrls: ['./page-stub.css', './panel-page.css', './game.page.css'],
})
export default class GamePageComponent {
  private readonly gameApi = inject(GameApiService);

  protected readonly shipTiers = SHIP_TIERS;
  protected readonly map = signal<StarMap | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly upgradeError = signal<string | null>(null);
  protected readonly leaderboard = signal<GameLeaderboardEntry[]>([]);

  protected readonly activePanel = signal<PanelKind>(null);
  protected readonly activeSystemSubject = signal<string | null>(null);

  protected readonly shipNameByTier = computed(() =>
    new Map(this.shipTiers.map((t) => [t.tier, t.name])),
  );

  protected readonly landmarks = computed<GameMapLandmark[]>(() => {
    const m = this.map();
    if (!m) return [];
    const systems = m.systems;
    const systemLandmarks: GameMapLandmark[] = systems.map((system, i) => {
      const n = Math.max(systems.length, 1);
      const claimed = system.nodes.filter((node) => node.claimed).length;
      return {
        id: `system-${system.subject}`,
        label: system.subject,
        icon: '🪐',
        x: n === 1 ? 50 : 20 + (60 * i) / Math.max(n - 1, 1),
        y: i % 2 === 0 ? 42 : 58,
        kind: 'system',
        subject: system.subject,
        badge: `${claimed}/${system.nodes.length}`,
      };
    });
    return [
      { id: 'hangar', label: 'Hangar', icon: '🛰️', x: 10, y: 15, kind: 'hangar' },
      { id: 'outpost', label: 'Outpost', icon: '🏗️', x: 10, y: 85, kind: 'outpost' },
      { id: 'leaderboard', label: 'Explorers', icon: '🏆', x: 90, y: 15, kind: 'leaderboard' },
      { id: 'minigames', label: 'Practice', icon: '🎮', x: 90, y: 85, kind: 'minigames' },
      // No crafting, no lesson required — reachable from the very first
      // login, so a brand-new account always has something to do here.
      { id: 'asteroid', label: 'Asteroid Belt', icon: '🪨', x: 50, y: 12, kind: 'asteroid' },
      { id: 'station', label: 'Space Station', icon: '🛰️', x: 50, y: 88, kind: 'station' },
      ...systemLandmarks,
    ];
  });

  constructor() {
    this.load();
    this.loadLeaderboard();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.gameApi.map().subscribe({
      next: (map) => {
        this.map.set(map);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load the star chart.');
        this.loading.set(false);
      },
    });
  }

  protected loadLeaderboard(): void {
    this.gameApi.leaderboard().subscribe((entries) => this.leaderboard.set(entries));
  }

  protected shipName(tier: number): string {
    return this.shipNameByTier().get(tier) ?? `Tier ${tier}`;
  }

  protected upgrade(): void {
    this.upgradeError.set(null);
    this.gameApi.upgrade().subscribe({
      next: () => {
        this.load();
        this.loadLeaderboard();
      },
      error: () => this.upgradeError.set('Could not upgrade — not enough stardust.'),
    });
  }

  protected onEnter(landmark: GameMapLandmark): void {
    if (landmark.kind === 'system') {
      this.activeSystemSubject.set(landmark.subject ?? null);
      this.activePanel.set('system');
    } else {
      this.activePanel.set(landmark.kind);
    }
  }

  protected closePanel(): void {
    this.activePanel.set(null);
    this.activeSystemSubject.set(null);
  }
}

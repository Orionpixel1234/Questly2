import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import {
  OUTPOST_GRID_SIZE,
  OUTPOST_RECIPES,
  RESOURCE_LABEL,
  RESOURCE_TYPES,
  stationFor,
  type OutpostQuest,
  type OutpostRecipe,
  type OutpostState,
  type QuestProgress,
  type ResourceType,
  type StationConfig,
} from '@questly/shared-types';
import { OutpostApiService } from '../../core/api/outpost-api.service';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';
import { StationMinigameComponent } from './station-minigame.component';

const BUILDING_ICON: Record<string, string> = {
  SOLAR_ARRAY: '☀️',
  ALLOY_FOUNDRY: '⚒️',
  BIO_DOME: '🌱',
  DATA_RELAY: '📡',
  FUEL_DEPOT: '⛽',
  COMMAND_CENTER: '🏛️',
};

interface GridCell {
  x: number;
  y: number;
  buildingKey: string | null;
  lastCollectedAt: string | null;
}

interface ActiveStation {
  x: number;
  y: number;
  config: StationConfig;
}

// Mining/crafting/building/quests. Lessons remain the primary way to earn
// resources (ProgressService.completeLesson), but every placed building is
// also a "station": click it to play a short timing mini-game on a cooldown
// for a direct, skill-scaled top-up — real gameplay layered on top of study.
@Component({
  selector: 'app-outpost',
  imports: [LoadingStateComponent, ErrorStateComponent, StationMinigameComponent],
  template: `
    @if (loadError()) {
      <app-error-state [message]="loadError()!" (retry)="refresh()" />
    } @else if (loading()) {
      <app-loading-state label="Scanning the outpost…" />
    } @else if (state(); as s) {
      <div class="outpost__resources">
        @for (resource of resourceTypes; track resource) {
          <div class="stat-card">
            <span class="stat-card__value">{{ s.resources[resource] }}</span>
            <span class="stat-card__label">{{ resourceLabel(resource) }}</span>
          </div>
        }
      </div>

      <h3 class="outpost__subheading">Craft</h3>
      <div class="outpost__recipes">
        @for (recipe of recipes; track recipe.key) {
          <div class="outpost__recipe-card">
            <span class="outpost__recipe-icon">{{ icon(recipe.key) }}</span>
            <div class="outpost__recipe-body">
              <h4>{{ recipe.name }}</h4>
              <p class="outpost__recipe-desc">{{ recipe.description }}</p>
              <p class="outpost__cost">{{ costLabel(recipe) }}</p>
            </div>
            <button
              type="button"
              class="btn btn-secondary"
              [disabled]="!canAfford(recipe) || crafting()"
              (click)="craft(recipe.key)"
            >
              Craft
            </button>
          </div>
        }
      </div>
      @if (craftError()) {
        <app-error-state [message]="craftError()!" [showRetry]="false" />
      }

      <h3 class="outpost__subheading">Stock</h3>
      @if (stockEntries().length) {
        <div class="outpost__stock">
          @for (entry of stockEntries(); track entry.buildingKey) {
            <div class="outpost__stock-item">
              <span>{{ icon(entry.buildingKey) }} {{ nameFor(entry.buildingKey) }} × {{ entry.stock }}</span>
              <button
                type="button"
                class="btn btn-secondary"
                [class.btn-primary]="placing() === entry.buildingKey"
                (click)="togglePlacing(entry.buildingKey)"
              >
                {{ placing() === entry.buildingKey ? 'Click a grid cell…' : 'Place' }}
              </button>
            </div>
          }
        </div>
      } @else {
        <p class="panel-page__empty">Nothing crafted yet — craft something above.</p>
      }

      <h3 class="outpost__subheading">Outpost grid</h3>
      <p class="panel-page__empty" style="margin: 0 0 var(--space-3)">
        Placed buildings are stations — click one to play its mini-game for a resource top-up.
      </p>
      <div
        class="outpost__grid"
        [style.grid-template-columns]="'repeat(' + gridSize + ', minmax(0,1fr))'"
      >
        @for (cell of gridCells(); track cell.x + '-' + cell.y) {
          <button
            type="button"
            class="outpost__cell"
            [class.outpost__cell--occupied]="!!cell.buildingKey"
            [class.outpost__cell--targetable]="!cell.buildingKey && !!placing()"
            [class.outpost__cell--ready]="!!cell.buildingKey && !placing() && cooldownRemaining(cell) === 0"
            [disabled]="cell.buildingKey ? (!!placing() || cooldownRemaining(cell) > 0) : !placing()"
            [attr.aria-label]="
              cell.buildingKey
                ? nameFor(cell.buildingKey) +
                  (cooldownRemaining(cell) > 0 ? ' — cooling down ' + cooldownRemaining(cell) + 's' : ' — ready')
                : 'Empty cell ' + cell.x + ', ' + cell.y
            "
            [attr.title]="
              cell.buildingKey && cooldownRemaining(cell) > 0
                ? 'Ready in ' + cooldownRemaining(cell) + 's'
                : null
            "
            (click)="cell.buildingKey ? openStation(cell) : place(cell.x, cell.y)"
          >
            {{ cell.buildingKey ? icon(cell.buildingKey) : '' }}
            @if (cell.buildingKey && cooldownRemaining(cell) > 0) {
              <span class="outpost__cell-cooldown">{{ cooldownRemaining(cell) }}s</span>
            }
          </button>
        }
      </div>
      @if (placeError()) {
        <app-error-state [message]="placeError()!" [showRetry]="false" />
      }
      @if (collectMessage()) {
        <p class="outpost__collect-toast">{{ collectMessage() }}</p>
      }
      @if (collectError()) {
        <app-error-state [message]="collectError()!" [showRetry]="false" />
      }

      <h3 class="outpost__subheading">Quests</h3>
      @if (claimError()) {
        <app-error-state [message]="claimError()!" [showRetry]="false" />
      }
      <div class="outpost__quests">
        @for (q of s.quests; track q.quest.key) {
          <div class="panel--raised outpost__quest">
            <div class="outpost__quest-body">
              <h4>{{ q.quest.title }}</h4>
              <p class="outpost__recipe-desc">{{ q.quest.description }}</p>
              <div class="progress-bar">
                <div class="progress-bar__fill" [style.width.%]="questPercent(q)"></div>
              </div>
              <span class="stat-card__hint">{{ q.current }}/{{ q.target }}</span>
            </div>
            @if (q.claimed) {
              <span class="badge badge--accent">Claimed</span>
            } @else if (q.complete) {
              <button type="button" class="btn btn-primary" (click)="claim(q.quest.key)">
                Claim {{ rewardLabel(q.quest) }}
              </button>
            } @else {
              <span class="badge">In progress</span>
            }
          </div>
        }
      </div>
    }
    @if (activeStation(); as station) {
      <app-station-minigame
        [station]="station.config"
        [icon]="icon(station.config.buildingKey)"
        (finished)="collectStation(station.x, station.y, $event)"
        (cancelled)="activeStation.set(null)"
      />
    }
  `,
  styleUrls: ['../../pages/panel-page.css', './outpost.component.css'],
})
export class OutpostComponent implements OnDestroy {
  private readonly outpostApi = inject(OutpostApiService);

  protected readonly resourceTypes = RESOURCE_TYPES;
  protected readonly recipes = OUTPOST_RECIPES;
  protected readonly gridSize = OUTPOST_GRID_SIZE;

  protected readonly state = signal<OutpostState | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly craftError = signal<string | null>(null);
  protected readonly placeError = signal<string | null>(null);
  protected readonly claimError = signal<string | null>(null);
  protected readonly collectError = signal<string | null>(null);
  protected readonly collectMessage = signal<string | null>(null);
  protected readonly crafting = signal(false);
  protected readonly placing = signal<string | null>(null);
  protected readonly activeStation = signal<ActiveStation | null>(null);
  private readonly now = signal(Date.now());
  private readonly tickHandle = setInterval(() => this.now.set(Date.now()), 1000);

  protected readonly stockEntries = computed(
    () => this.state()?.stock.filter((s) => s.stock > 0) ?? [],
  );

  protected readonly gridCells = computed<GridCell[]>(() => {
    const grid = new Map(
      (this.state()?.grid ?? []).map((g) => [`${g.x}-${g.y}`, g]),
    );
    const cells: GridCell[] = [];
    for (let y = 0; y < OUTPOST_GRID_SIZE; y++) {
      for (let x = 0; x < OUTPOST_GRID_SIZE; x++) {
        const found = grid.get(`${x}-${y}`);
        cells.push({
          x,
          y,
          buildingKey: found?.buildingKey ?? null,
          lastCollectedAt: found?.lastCollectedAt ?? null,
        });
      }
    }
    return cells;
  });

  constructor() {
    this.refresh();
  }

  ngOnDestroy(): void {
    clearInterval(this.tickHandle);
  }

  protected refresh(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.outpostApi.getState().subscribe({
      next: (state) => {
        this.state.set(state);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load the outpost.');
        this.loading.set(false);
      },
    });
  }

  protected icon(buildingKey: string): string {
    return BUILDING_ICON[buildingKey] ?? '❔';
  }

  protected nameFor(buildingKey: string): string {
    return OUTPOST_RECIPES.find((r) => r.key === buildingKey)?.name ?? buildingKey;
  }

  protected resourceLabel(resource: ResourceType): string {
    return RESOURCE_LABEL[resource];
  }

  protected costLabel(recipe: OutpostRecipe): string {
    return Object.entries(recipe.cost)
      .map(([resource, amount]) => `${amount} ${RESOURCE_LABEL[resource as ResourceType]}`)
      .join(' + ');
  }

  protected canAfford(recipe: OutpostRecipe): boolean {
    const resources = this.state()?.resources;
    if (!resources) return false;
    return Object.entries(recipe.cost).every(
      ([resource, amount]) => resources[resource as ResourceType] >= (amount ?? 0),
    );
  }

  protected craft(recipeKey: string): void {
    this.crafting.set(true);
    this.craftError.set(null);
    this.outpostApi.craft(recipeKey).subscribe({
      next: (state) => {
        this.state.set(state);
        this.crafting.set(false);
      },
      error: (err: { error?: { message?: string } }) => {
        this.craftError.set(err.error?.message ?? 'Could not craft that.');
        this.crafting.set(false);
      },
    });
  }

  protected togglePlacing(buildingKey: string): void {
    this.placeError.set(null);
    this.placing.set(this.placing() === buildingKey ? null : buildingKey);
  }

  protected place(x: number, y: number): void {
    const buildingKey = this.placing();
    if (!buildingKey) return;
    this.placeError.set(null);
    this.outpostApi.place(buildingKey, x, y).subscribe({
      next: (state) => {
        this.state.set(state);
        this.placing.set(null);
      },
      error: (err: { error?: { message?: string } }) => {
        this.placeError.set(err.error?.message ?? 'Could not place there.');
      },
    });
  }

  protected cooldownRemaining(cell: GridCell): number {
    if (!cell.buildingKey || !cell.lastCollectedAt) return 0;
    const config = stationFor(cell.buildingKey);
    if (!config) return 0;
    const readyAt = new Date(cell.lastCollectedAt).getTime() + config.cooldownSeconds * 1000;
    return Math.max(0, Math.ceil((readyAt - this.now()) / 1000));
  }

  protected openStation(cell: GridCell): void {
    if (!cell.buildingKey || this.cooldownRemaining(cell) > 0) return;
    const config = stationFor(cell.buildingKey);
    if (!config) return;
    this.collectError.set(null);
    this.collectMessage.set(null);
    this.activeStation.set({ x: cell.x, y: cell.y, config });
  }

  protected collectStation(x: number, y: number, score: number): void {
    this.outpostApi.collectStation(x, y, score).subscribe({
      next: (result) => {
        this.state.set(result);
        this.activeStation.set(null);
        this.collectMessage.set(
          `+${result.collected.map((c) => `${c.amount} ${RESOURCE_LABEL[c.resource]}`).join(', ')}`,
        );
      },
      error: (err: { error?: { message?: string } }) => {
        this.collectError.set(err.error?.message ?? 'Could not collect from that station.');
        this.activeStation.set(null);
      },
    });
  }

  protected questPercent(quest: QuestProgress): number {
    return quest.target > 0 ? Math.min(100, Math.round((quest.current / quest.target) * 100)) : 0;
  }

  protected rewardLabel(quest: OutpostQuest): string {
    const reward = quest.reward;
    if (reward.stardust) return `${reward.stardust} Stardust`;
    if (reward.resource && reward.resourceAmount) {
      return `${reward.resourceAmount} ${RESOURCE_LABEL[reward.resource]}`;
    }
    return '';
  }

  protected claim(questKey: string): void {
    this.claimError.set(null);
    this.outpostApi.claimQuest(questKey).subscribe({
      next: (state) => this.state.set(state),
      error: (err: { error?: { message?: string } }) => {
        this.claimError.set(err.error?.message ?? 'Could not claim that quest.');
      },
    });
  }
}

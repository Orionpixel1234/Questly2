import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import {
  AUTOMATION_INTERVAL_MINUTES,
  AUTOMATION_YIELD_PER_TICK,
  RESOURCE_LABEL,
  RESOURCE_TYPES,
  SPACE_STATION_GRID_SIZE,
  SPACE_STATION_RECIPES,
  spaceStationStationFor,
  type ResourceType,
  type SpaceStationRecipe,
  type SpaceStationState,
  type StationConfig,
} from '@questly/shared-types';
import { SpaceStationApiService } from '../../core/api/space-station-api.service';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';
import { StationMinigameComponent } from '../outpost/station-minigame.component';

const BUILDING_ICON: Record<string, string> = {
  COMMS_ARRAY: '📡',
  CRYO_BAY: '🧊',
  SHIELD_GENERATOR: '🛡️',
  OBSERVATION_DECK: '🔭',
  DOCKING_RING: '🚀',
  COMMAND_BRIDGE: '🎛️',
};

interface GridCell {
  x: number;
  y: number;
  buildingKey: string | null;
  lastCollectedAt: string | null;
  lastAutomationAt: string | null;
}

interface ActiveStation {
  x: number;
  y: number;
  config: StationConfig;
}

// A second, independent base from the Outpost — same crafting/place/station
// mechanics (see OutpostComponent), but its own grid, its own building
// catalog (orbital/tech themed rather than ground/resource), and no quests
// of its own. Resources are the same shared economy as the Outpost — Ice,
// mined at the Asteroid Belt, is what most of this base's recipes spend.
@Component({
  selector: 'app-space-station',
  imports: [LoadingStateComponent, ErrorStateComponent, StationMinigameComponent],
  template: `
    @if (loadError()) {
      <app-error-state [message]="loadError()!" (retry)="refresh()" />
    } @else if (loading()) {
      <app-loading-state label="Docking with the station…" />
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

      <h3 class="outpost__subheading">Station grid</h3>
      <p class="panel-page__empty" style="margin: 0 0 var(--space-3)">
        Same as the Outpost: placed buildings are stations you can click to play for a top-up.
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
                  (cooldownRemaining(cell) > 0 ? ' — cooling down ' + cooldownRemaining(cell) + 's' : ' — ready') +
                  ' — ' + automationLabel(cell)
                : 'Empty cell ' + cell.x + ', ' + cell.y
            "
            [attr.title]="cell.buildingKey ? automationLabel(cell) : null"
            (click)="cell.buildingKey ? openStation(cell) : place(cell.x, cell.y)"
          >
            {{ cell.buildingKey ? icon(cell.buildingKey) : '' }}
            @if (cell.buildingKey) {
              <span class="outpost__cell-automation" aria-hidden="true">⚙</span>
            }
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
  styleUrls: ['../../pages/panel-page.css', '../outpost/outpost.component.css'],
})
export class SpaceStationComponent implements OnDestroy {
  private readonly stationApi = inject(SpaceStationApiService);

  protected readonly recipes = SPACE_STATION_RECIPES;
  protected readonly gridSize = SPACE_STATION_GRID_SIZE;
  protected readonly resourceTypes = RESOURCE_TYPES;

  protected readonly state = signal<SpaceStationState | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly craftError = signal<string | null>(null);
  protected readonly placeError = signal<string | null>(null);
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
    for (let y = 0; y < SPACE_STATION_GRID_SIZE; y++) {
      for (let x = 0; x < SPACE_STATION_GRID_SIZE; x++) {
        const found = grid.get(`${x}-${y}`);
        cells.push({
          x,
          y,
          buildingKey: found?.buildingKey ?? null,
          lastCollectedAt: found?.lastCollectedAt ?? null,
          lastAutomationAt: found?.lastAutomationAt ?? null,
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
    this.stationApi.getState().subscribe({
      next: (state) => {
        this.state.set(state);
        this.loading.set(false);
        const auto = this.describeAutomation(state.automationCollected);
        if (auto) this.collectMessage.set(auto);
      },
      error: () => {
        this.loadError.set('Could not load the space station.');
        this.loading.set(false);
      },
    });
  }

  protected icon(buildingKey: string): string {
    return BUILDING_ICON[buildingKey] ?? '❔';
  }

  protected nameFor(buildingKey: string): string {
    return (
      SPACE_STATION_RECIPES.find((r) => r.key === buildingKey)?.name ??
      buildingKey
    );
  }

  protected resourceLabel(resource: ResourceType): string {
    return RESOURCE_LABEL[resource];
  }

  protected costLabel(recipe: SpaceStationRecipe): string {
    return Object.entries(recipe.cost)
      .map(([resource, amount]) => `${amount} ${RESOURCE_LABEL[resource as ResourceType]}`)
      .join(' + ');
  }

  protected canAfford(recipe: SpaceStationRecipe): boolean {
    const resources = this.state()?.resources;
    if (!resources) return false;
    return Object.entries(recipe.cost).every(
      ([resource, amount]) => resources[resource as ResourceType] >= (amount ?? 0),
    );
  }

  protected craft(recipeKey: string): void {
    this.crafting.set(true);
    this.craftError.set(null);
    this.stationApi.craft(recipeKey).subscribe({
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
    this.stationApi.place(buildingKey, x, y).subscribe({
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
    const config = spaceStationStationFor(cell.buildingKey);
    if (!config) return 0;
    const readyAt = new Date(cell.lastCollectedAt).getTime() + config.cooldownSeconds * 1000;
    return Math.max(0, Math.ceil((readyAt - this.now()) / 1000));
  }

  protected openStation(cell: GridCell): void {
    if (!cell.buildingKey || this.cooldownRemaining(cell) > 0) return;
    const config = spaceStationStationFor(cell.buildingKey);
    if (!config) return;
    this.collectError.set(null);
    this.collectMessage.set(null);
    this.activeStation.set({ x: cell.x, y: cell.y, config });
  }

  protected collectStation(x: number, y: number, score: number): void {
    this.stationApi.collectStation(x, y, score).subscribe({
      next: (result) => {
        this.state.set(result);
        this.activeStation.set(null);
        const stationMsg = `+${result.collected.map((c) => `${c.amount} ${RESOURCE_LABEL[c.resource]}`).join(', ')}`;
        const autoMsg = this.describeAutomation(result.automationCollected);
        this.collectMessage.set(autoMsg ? `${stationMsg} · ${autoMsg}` : stationMsg);
      },
      error: (err: { error?: { message?: string } }) => {
        this.collectError.set(err.error?.message ?? 'Could not collect from that station.');
        this.activeStation.set(null);
      },
    });
  }

  private describeAutomation(
    collected: { resource: ResourceType; amount: number }[],
  ): string | null {
    if (!collected.length) return null;
    return `⚙ Automated: +${collected.map((c) => `${c.amount} ${RESOURCE_LABEL[c.resource]}`).join(', ')}`;
  }

  protected automationLabel(cell: GridCell): string {
    if (!cell.buildingKey) return '';
    const config = spaceStationStationFor(cell.buildingKey);
    if (!config) return '';
    const resourceLabel =
      config.resource === 'ALL' ? 'all resources' : RESOURCE_LABEL[config.resource];
    const remaining = this.automationRemaining(cell);
    return `Automated: +${AUTOMATION_YIELD_PER_TICK} ${resourceLabel} every ${AUTOMATION_INTERVAL_MINUTES}m — next in ${this.formatDuration(remaining)}`;
  }

  private automationRemaining(cell: GridCell): number {
    if (!cell.lastAutomationAt) return 0;
    const intervalMs = AUTOMATION_INTERVAL_MINUTES * 60_000;
    const nextTickAt = new Date(cell.lastAutomationAt).getTime() + intervalMs;
    return Math.max(0, Math.ceil((nextTickAt - this.now()) / 1000));
  }

  private formatDuration(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
}

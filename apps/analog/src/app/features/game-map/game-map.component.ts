import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

export interface GameMapLandmark {
  id: string;
  label: string;
  icon: string;
  x: number; // percent position on the map, 0-100
  y: number;
  kind:
    | 'hangar'
    | 'outpost'
    | 'station'
    | 'leaderboard'
    | 'minigames'
    | 'system'
    | 'asteroid';
  subject?: string;
  badge?: string;
}

const SPEED_PCT_PER_SEC = 30;
const INTERACT_RADIUS_PCT = 9;
const MOVE_KEYS = new Set([
  'w',
  'a',
  's',
  'd',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
]);

// The RPG-style front door to /game: drive an avatar around a map with
// WASD/arrow keys and walk up to landmarks instead of clicking through a
// stack of page sections. Landmarks are real DOM buttons (positioned
// absolutely, not canvas-drawn) so they stay keyboard/click/screen-reader
// accessible; only the avatar's per-frame movement runs outside Angular's
// zone — same rAF-outside-zone technique as StationMinigameComponent — so
// walking around triggers zero app-wide change detection.
@Component({
  selector: 'app-game-map',
  template: `
    <div
      #mapEl
      class="game-map"
      tabindex="0"
      role="application"
      aria-label="Game map — WASD or arrow keys to move, Enter to interact with a nearby landmark"
      (keydown)="onKeyDown($event)"
      (keyup)="onKeyUp($event)"
    >
      @for (landmark of landmarks(); track landmark.id) {
        <button
          type="button"
          class="game-map__landmark"
          [class.game-map__landmark--near]="nearby()?.id === landmark.id"
          [style.left.%]="landmark.x"
          [style.top.%]="landmark.y"
          (click)="enter.emit(landmark)"
        >
          <span class="game-map__landmark-icon" aria-hidden="true">{{ landmark.icon }}</span>
          <span class="game-map__landmark-label">{{ landmark.label }}</span>
          @if (landmark.badge) {
            <span class="game-map__landmark-badge">{{ landmark.badge }}</span>
          }
        </button>
      }

      <div #avatar class="game-map__avatar" style="left: 50%; top: 50%" aria-hidden="true">
        🚀
      </div>

      @if (nearby(); as n) {
        <p class="game-map__prompt">Press <kbd>Enter</kbd> to enter {{ n.label }}</p>
      } @else {
        <p class="game-map__prompt game-map__prompt--hint">WASD / arrow keys to move</p>
      }
    </div>
  `,
  styleUrl: './game-map.component.css',
})
export class GameMapComponent implements OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly mapEl = viewChild<ElementRef<HTMLDivElement>>('mapEl');
  private readonly avatarEl = viewChild<ElementRef<HTMLDivElement>>('avatar');

  readonly landmarks = input<GameMapLandmark[]>([]);
  readonly enter = output<GameMapLandmark>();

  protected readonly nearby = signal<GameMapLandmark | null>(null);

  private readonly pressed = new Set<string>();
  private x = 50;
  private y = 50;
  private lastT = 0;
  private raf?: number;

  constructor() {
    afterNextRender(() => this.mapEl()?.nativeElement.focus());
    this.zone.runOutsideAngular(() => {
      this.raf = requestAnimationFrame(this.tick);
    });
  }

  ngOnDestroy(): void {
    if (this.raf !== undefined) cancelAnimationFrame(this.raf);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    if (MOVE_KEYS.has(key)) {
      this.pressed.add(key);
      event.preventDefault();
    } else if (key === 'enter' || key === ' ') {
      const n = this.nearby();
      if (n) this.enter.emit(n);
      event.preventDefault();
    }
  }

  protected onKeyUp(event: KeyboardEvent): void {
    this.pressed.delete(event.key.toLowerCase());
  }

  private readonly tick = (t: number): void => {
    if (!this.lastT) this.lastT = t;
    const dt = Math.min(0.05, (t - this.lastT) / 1000);
    this.lastT = t;

    let dx = 0;
    let dy = 0;
    if (this.pressed.has('w') || this.pressed.has('arrowup')) dy -= 1;
    if (this.pressed.has('s') || this.pressed.has('arrowdown')) dy += 1;
    if (this.pressed.has('a') || this.pressed.has('arrowleft')) dx -= 1;
    if (this.pressed.has('d') || this.pressed.has('arrowright')) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.x = Math.max(3, Math.min(97, this.x + dx * SPEED_PCT_PER_SEC * dt));
      this.y = Math.max(6, Math.min(94, this.y + dy * SPEED_PCT_PER_SEC * dt));

      const avatar = this.avatarEl()?.nativeElement;
      if (avatar) {
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        avatar.style.left = `${this.x}%`;
        avatar.style.top = `${this.y}%`;
        avatar.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
      }

      this.checkNearby();
    }

    this.raf = requestAnimationFrame(this.tick);
  };

  private checkNearby(): void {
    let closest: GameMapLandmark | null = null;
    let closestDist = INTERACT_RADIUS_PCT;
    for (const landmark of this.landmarks()) {
      const dist = Math.hypot(landmark.x - this.x, landmark.y - this.y);
      if (dist < closestDist) {
        closest = landmark;
        closestDist = dist;
      }
    }
    if (closest?.id !== this.nearby()?.id) {
      this.zone.run(() => this.nearby.set(closest));
    }
  }
}

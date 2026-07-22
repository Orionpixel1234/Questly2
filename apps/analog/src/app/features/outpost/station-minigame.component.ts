import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RESOURCE_LABEL, type StationConfig } from '@questly/shared-types';

const ROUNDS = 5;
// Each round is faster and the target zone narrower than the last — a real
// skill curve, not a single lucky click.
const PERIOD_MS = [1600, 1400, 1200, 1000, 850];
const HALF_WIDTH = [20, 16, 13, 10, 8];

interface RoundResult {
  score: number;
}

// The interactive half of a "station": a marker sweeps a track and the
// player locks it in as close to the target zone as they can, five rounds,
// getting harder each time. The average accuracy becomes the score that
// OutpostComponent sends to /outpost/stations/collect to scale the payout.
//
// The marker's position updates via requestAnimationFrame at ~60fps, but
// zone.js patches rAF by default — left as a signal binding, that would
// trigger a full app-wide change detection tick every frame. The loop runs
// via NgZone.runOutsideAngular() and writes the marker's position straight
// to the DOM instead, so animating it costs nothing outside this component.
@Component({
  selector: 'app-station-minigame',
  template: `
    <div class="station-game" role="dialog" aria-modal="true" [attr.aria-label]="station().label">
      <div class="station-game__header">
        <h3>{{ icon() }} {{ station().label }}</h3>
        <button type="button" class="btn btn-secondary" (click)="cancelled.emit()">Exit</button>
      </div>

      @if (phase() === 'play') {
        <p class="station-game__hint">
          Round {{ round() }}/{{ totalRounds }} — click Lock In when the marker crosses the zone.
        </p>
        <div class="station-game__track">
          <div class="station-game__zone" [style.left.%]="zoneStart()" [style.width.%]="zoneWidth()"></div>
          <div #marker class="station-game__marker" style="left: 0%"></div>
        </div>
        <button type="button" class="btn btn-primary station-game__lock" (click)="lockIn()">
          Lock In
        </button>
      } @else {
        <div class="station-game__summary">
          <p class="station-game__score">{{ finalScore() }}% accuracy</p>
          <p class="station-game__hint">{{ payoutHint() }}</p>
          <button type="button" class="btn btn-primary" (click)="collect()">
            Collect {{ resourceLabel() }}
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './station-minigame.component.css',
})
export class StationMinigameComponent implements OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly markerEl = viewChild<ElementRef<HTMLDivElement>>('marker');

  readonly station = input.required<StationConfig>();
  readonly icon = input<string>('🛰️');
  readonly finished = output<number>();
  readonly cancelled = output<void>();

  protected readonly totalRounds = ROUNDS;
  protected readonly phase = signal<'play' | 'done'>('play');
  protected readonly round = signal(1);
  protected readonly zoneStart = signal(40);
  protected readonly zoneWidth = signal(HALF_WIDTH[0] * 2);
  protected readonly finalScore = signal(0);

  private results: RoundResult[] = [];
  private raf?: number;
  private startTime = 0;
  private currentPosition = 0;

  constructor() {
    this.zone.runOutsideAngular(() => this.beginRound());
  }

  ngOnDestroy(): void {
    if (this.raf !== undefined) cancelAnimationFrame(this.raf);
  }

  private beginRound(): void {
    const i = this.round() - 1;
    const halfWidth = HALF_WIDTH[Math.min(i, HALF_WIDTH.length - 1)];
    const center = 20 + Math.random() * 60;
    this.zoneStart.set(Math.max(0, center - halfWidth));
    this.zoneWidth.set(halfWidth * 2);
    this.startTime = 0;
    if (this.raf !== undefined) cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.tick);
  }

  private readonly tick = (t: number): void => {
    if (!this.startTime) this.startTime = t;
    const period = PERIOD_MS[Math.min(this.round() - 1, PERIOD_MS.length - 1)];
    const elapsed = (t - this.startTime) % period;
    const phase = elapsed / period;
    const pos = phase < 0.5 ? phase * 2 * 100 : (1 - phase) * 2 * 100;
    this.currentPosition = pos;
    const marker = this.markerEl()?.nativeElement;
    if (marker) marker.style.left = `${pos}%`;
    this.raf = requestAnimationFrame(this.tick);
  };

  protected lockIn(): void {
    if (this.raf !== undefined) cancelAnimationFrame(this.raf);
    const zoneCenter = this.zoneStart() + this.zoneWidth() / 2;
    const halfWidth = this.zoneWidth() / 2;
    const distance = Math.abs(this.currentPosition - zoneCenter);
    const score = Math.max(0, Math.round(100 * (1 - distance / (halfWidth * 1.5))));
    this.results.push({ score: Math.min(100, score) });

    if (this.round() >= ROUNDS) {
      const avg = Math.round(
        this.results.reduce((sum, r) => sum + r.score, 0) / this.results.length,
      );
      this.finalScore.set(avg);
      this.phase.set('done');
    } else {
      this.round.update((r) => r + 1);
      this.zone.runOutsideAngular(() => this.beginRound());
    }
  }

  protected resourceLabel(): string {
    const resource = this.station().resource;
    return resource === 'ALL' ? 'resources' : RESOURCE_LABEL[resource];
  }

  protected payoutHint(): string {
    const score = this.finalScore();
    if (score >= 85) return 'Excellent run — near-max payout.';
    if (score >= 60) return 'Solid run — good payout.';
    if (score >= 30) return 'Decent run — modest payout.';
    return 'Rough run — still something for the effort.';
  }

  protected collect(): void {
    this.finished.emit(this.finalScore());
  }
}

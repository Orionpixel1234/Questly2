import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { compileExpression } from '@questly/lesson-dsl';

const SAMPLES = 400;
const PADDING = 32;

@Component({
  selector: 'app-math-graph-block',
  template: `
    @if (compileError(); as message) {
      <p class="math-graph-block__error">Invalid function "{{ fn() }}": {{ message }}</p>
    } @else {
      <canvas #canvas class="math-graph-block" width="640" height="360"></canvas>
    }
  `,
  styleUrl: './math-graph-block.component.css',
})
export class MathGraphBlockComponent {
  readonly fn = input.required<string>();
  readonly xmin = input(-10);
  readonly xmax = input(10);

  private readonly canvasRef =
    viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly compiled = computed(() => {
    try {
      return { fn: compileExpression(this.fn()), error: null };
    } catch (e) {
      return { fn: null, error: e instanceof Error ? e.message : 'Parse error' };
    }
  });

  readonly compileError = computed(() => this.compiled().error);

  constructor() {
    // Re-renders whenever the canvas becomes available (first render) or
    // the compiled function / range signals change (e.g. the author editing
    // the live preview) — no polling, just signal reactivity.
    effect(() => {
      this.canvasRef();
      this.compiled();
      this.xmin();
      this.xmax();
      this.render();
    });
  }

  private render(): void {
    const canvas = this.canvasRef()?.nativeElement;
    const fn = this.compiled().fn;
    if (!canvas || !fn) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const styles = getComputedStyle(document.documentElement);
    const gridColor = styles.getPropertyValue('--color-border').trim() || '#333';
    const axisColor = styles.getPropertyValue('--color-text-muted').trim() || '#888';
    const lineColor = styles.getPropertyValue('--color-accent').trim() || '#4ea1ff';

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const xmin = this.xmin();
    const xmax = this.xmax();
    const plotWidth = width - PADDING * 2;
    const plotHeight = height - PADDING * 2;

    const points: { x: number; y: number }[] = [];
    let yMin = Infinity;
    let yMax = -Infinity;
    for (let i = 0; i <= SAMPLES; i++) {
      const x = xmin + ((xmax - xmin) * i) / SAMPLES;
      const y = fn(x);
      if (Number.isFinite(y)) {
        points.push({ x, y });
        if (y < yMin) yMin = y;
        if (y > yMax) yMax = y;
      } else {
        points.push({ x, y: NaN });
      }
    }
    if (!Number.isFinite(yMin) || !Number.isFinite(yMax)) return;
    if (yMin === yMax) {
      yMin -= 1;
      yMax += 1;
    }
    const yPad = (yMax - yMin) * 0.1;
    yMin -= yPad;
    yMax += yPad;

    const toPx = (x: number, y: number) => ({
      px: PADDING + ((x - xmin) / (xmax - xmin)) * plotWidth,
      py: PADDING + plotHeight - ((y - yMin) / (yMax - yMin)) * plotHeight,
    });

    // Grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      const gx = PADDING + (plotWidth * i) / 8;
      const gy = PADDING + (plotHeight * i) / 8;
      ctx.beginPath();
      ctx.moveTo(gx, PADDING);
      ctx.lineTo(gx, height - PADDING);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(PADDING, gy);
      ctx.lineTo(width - PADDING, gy);
      ctx.stroke();
    }

    // Axes (x=0 / y=0, if in range)
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1.5;
    if (xmin <= 0 && xmax >= 0) {
      const { px } = toPx(0, 0);
      ctx.beginPath();
      ctx.moveTo(px, PADDING);
      ctx.lineTo(px, height - PADDING);
      ctx.stroke();
    }
    if (yMin <= 0 && yMax >= 0) {
      const { py } = toPx(0, 0);
      ctx.beginPath();
      ctx.moveTo(PADDING, py);
      ctx.lineTo(width - PADDING, py);
      ctx.stroke();
    }

    // Curve
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let drawing = false;
    for (const point of points) {
      if (!Number.isFinite(point.y)) {
        drawing = false;
        continue;
      }
      const { px, py } = toPx(point.x, point.y);
      if (!drawing) {
        ctx.moveTo(px, py);
        drawing = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }
}

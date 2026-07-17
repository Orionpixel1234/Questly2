import {
  Component,
  ElementRef,
  DestroyRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';

type StarTint = 'star' | 'bright' | 'giant' | 'accent' | 'accentSecondary';
type NebulaHue = 'accent' | 'accentSecondary' | 'violet';

interface Star {
  x: number;
  y: number;
  radius: number;
  depth: number;
  phase: number;
  twinkleSpeed: number;
  tint: StarTint;
}

interface Nebula {
  x: number;
  y: number;
  hue: NebulaHue;
  baseAlpha: number;
  squash: number;
  rotation: number;
  rotationSpeed: number;
  phase: number;
  radius: number;
}

interface GalaxyPoint {
  angle: number;
  dist: number;
  size: number;
}

interface GalaxyCluster {
  x: number;
  y: number;
  hue: NebulaHue;
  rotation: number;
  rotationSpeed: number;
  radius: number;
  points: GalaxyPoint[];
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number;
  maxLife: number;
}

type StarColors = Record<StarTint | NebulaHue, string>;

const DECORATIVE_VIOLET = '#9b8cf0';

function pickTint(): StarTint {
  const roll = Math.random();
  if (roll < 0.03) return 'accent';
  if (roll < 0.06) return 'accentSecondary';
  if (roll < 0.09) return 'giant';
  if (roll < 0.6) return 'star';
  return 'bright';
}

function readStarColors(): StarColors {
  const style = getComputedStyle(document.documentElement);
  const read = (token: string, fallback: string) =>
    style.getPropertyValue(token).trim() || fallback;

  return {
    star: read('--color-text-secondary', '#c7cee3'),
    bright: read('--color-text-primary', '#f4f6fc'),
    giant: read('--color-text-primary', '#f4f6fc'),
    accent: read('--color-accent', '#f5991f'),
    accentSecondary: read('--color-accent-secondary', '#33c4d6'),
    violet: DECORATIVE_VIOLET,
  };
}

function hexToRgba(hex: string, alpha: number): string {
  if (!hex.startsWith('#')) return hex;
  const normalized =
    hex.length === 4
      ? hex
          .slice(1)
          .split('')
          .map((c) => c + c)
          .join('')
      : hex.slice(1);
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function makeGalaxyPoints(count: number): GalaxyPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    angle: i * GOLDEN_ANGLE,
    dist: Math.sqrt(i / count),
    size: 0.4 + Math.random() * 0.7,
  }));
}

@Component({
  selector: 'app-starfield-background',
  template: `<canvas #canvas class="starfield" aria-hidden="true"></canvas>`,
  styleUrl: './starfield-background.component.css',
})
export class StarfieldBackgroundComponent {
  private readonly canvasRef =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.start());
  }

  private start(): void {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let nebulae: Nebula[] = [];
    let galaxies: GalaxyCluster[] = [];
    let shootingStars: ShootingStar[] = [];
    let colors = readStarColors();
    let pointer = { x: 0.5, y: 0.5 };

    const makeStar = (): Star => {
      const depth = Math.random();
      return {
        x: Math.random(),
        y: Math.random(),
        radius: 0.4 + depth * 1.3,
        depth: 0.2 + depth * 0.8,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.4 + Math.random() * 0.8,
        tint: pickTint(),
      };
    };

    const nebulaHues: NebulaHue[] = ['accent', 'accentSecondary', 'violet'];

    const makeNebula = (index: number): Nebula => ({
      x: 0.15 + Math.random() * 0.7,
      y: 0.15 + Math.random() * 0.7,
      hue: nebulaHues[index % nebulaHues.length],
      baseAlpha: 0.05 + Math.random() * 0.05,
      squash: 0.45 + Math.random() * 0.3,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.4),
      phase: Math.random() * Math.PI * 2,
      radius: 0,
    });

    const makeGalaxy = (index: number): GalaxyCluster => ({
      x: 0.1 + Math.random() * 0.8,
      y: 0.1 + Math.random() * 0.8,
      hue: nebulaHues[index % nebulaHues.length],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() < 0.5 ? -1 : 1) * (0.15 + Math.random() * 0.2),
      radius: 0,
      points: makeGalaxyPoints(36 + Math.floor(Math.random() * 20)),
    });

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const shortSide = Math.min(width, height);
      const starCount = Math.round((width * height) / 9000);
      stars = Array.from({ length: starCount }, makeStar);

      nebulae = Array.from({ length: 3 }, (_, i) => {
        const nebula = makeNebula(i);
        nebula.radius = shortSide * (0.35 + Math.random() * 0.25);
        return nebula;
      });

      galaxies = Array.from({ length: 2 }, (_, i) => {
        const galaxy = makeGalaxy(i);
        galaxy.radius = shortSide * (0.05 + Math.random() * 0.03);
        return galaxy;
      });
    };

    const drawNebulae = (elapsed: number) => {
      for (const nebula of nebulae) {
        const cx = nebula.x * width + Math.sin(elapsed * 0.00002 + nebula.phase) * 24;
        const cy = nebula.y * height + Math.cos(elapsed * 0.000015 + nebula.phase) * 18;
        const color = colors[nebula.hue];
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, nebula.radius);
        gradient.addColorStop(0, hexToRgba(color, nebula.baseAlpha));
        gradient.addColorStop(1, hexToRgba(color, 0));

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(nebula.rotation + elapsed * 0.00001 * nebula.rotationSpeed);
        ctx.scale(1, nebula.squash);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, nebula.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const drawGalaxies = (elapsed: number) => {
      for (const galaxy of galaxies) {
        const cx = galaxy.x * width;
        const cy = galaxy.y * height;
        const rotation = galaxy.rotation + elapsed * 0.00003 * galaxy.rotationSpeed;
        const color = colors[galaxy.hue];

        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, galaxy.radius * 1.4);
        core.addColorStop(0, hexToRgba(color, 0.4));
        core.addColorStop(1, hexToRgba(color, 0));
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(cx, cy, galaxy.radius * 1.4, 0, Math.PI * 2);
        ctx.fill();

        for (const point of galaxy.points) {
          const angle = point.angle + rotation;
          const dist = point.dist * galaxy.radius * 3;
          const px = cx + Math.cos(angle) * dist;
          const py = cy + Math.sin(angle) * dist * 0.55;
          ctx.beginPath();
          ctx.fillStyle = point.dist < 0.35 ? colors.bright : colors.star;
          ctx.globalAlpha = 0.85 - point.dist * 0.5;
          ctx.arc(px, py, point.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    };

    const drawStars = (elapsed: number) => {
      for (const star of stars) {
        const driftX = Math.sin(elapsed * 0.00005 * star.depth + star.phase) * 6 * star.depth;
        const driftY = Math.cos(elapsed * 0.00004 * star.depth + star.phase) * 4 * star.depth;
        const parallaxX = (pointer.x - 0.5) * 18 * star.depth;
        const parallaxY = (pointer.y - 0.5) * 18 * star.depth;
        const px = star.x * width + driftX + parallaxX;
        const py = star.y * height + driftY + parallaxY;
        const twinkle =
          0.55 + 0.45 * Math.sin(elapsed * 0.001 * star.twinkleSpeed + star.phase);
        const isGiant = star.tint === 'giant';

        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = colors[star.tint];
        ctx.globalAlpha = twinkle * (0.35 + star.depth * 0.5);
        if (isGiant) {
          ctx.shadowColor = colors[star.tint];
          ctx.shadowBlur = 8;
        }
        ctx.arc(px, py, isGiant ? star.radius * 1.8 : star.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };

    const spawnShootingStar = () => {
      if (shootingStars.length >= 2 || Math.random() > 0.006) return;
      const fromTop = Math.random() < 0.5;
      const startX = fromTop ? Math.random() * width * 0.6 : width * 0.7;
      const startY = fromTop ? -20 : Math.random() * height * 0.3;
      const speed = 500 + Math.random() * 300;
      const angle = Math.PI / 4 + (Math.random() * 0.3 - 0.15);
      shootingStars.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: 80 + Math.random() * 60,
        life: 0,
        maxLife: 0.9 + Math.random() * 0.4,
      });
    };

    const drawShootingStars = (dt: number) => {
      spawnShootingStar();
      shootingStars = shootingStars.filter((s) => s.life < s.maxLife);
      for (const s of shootingStars) {
        s.life += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;

        const tailX = s.x - (s.vx / Math.hypot(s.vx, s.vy)) * s.length;
        const tailY = s.y - (s.vy / Math.hypot(s.vx, s.vy)) * s.length;
        const fade = 1 - s.life / s.maxLife;

        const gradient = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
        gradient.addColorStop(0, hexToRgba(colors.bright, fade));
        gradient.addColorStop(1, hexToRgba(colors.bright, 0));

        ctx.save();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
        ctx.restore();
      }
    };

    const draw = (elapsed: number, dt: number) => {
      ctx.clearRect(0, 0, width, height);
      drawNebulae(elapsed);
      drawGalaxies(elapsed);
      drawStars(elapsed);
      if (!prefersReducedMotion) drawShootingStars(dt);
    };

    resize();
    draw(0, 0);

    if (prefersReducedMotion) return;

    const start = performance.now();
    let lastTime = start;
    let raf = 0;
    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      draw(now - start, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onPointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX / width, y: event.clientY / height };
    };
    const onResize = () => resize();
    const themeObserver = new MutationObserver(() => {
      colors = readStarColors();
    });

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', onResize);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      themeObserver.disconnect();
    });
  }
}

import { Component, computed, input } from '@angular/core';
import type { MoleculeBlock } from '@questly/lesson-dsl';

interface LayoutAtom {
  el: string;
  color: string;
  cx: number;
  cy: number;
}

interface Bond {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// CPK-style element colors, common-elements subset; anything else falls
// back to the neutral color. This is a diagram legibility aid, not a
// chemistry engine — see LESSON_DSL.md's Molecule section for scope.
const ELEMENT_COLORS: Record<string, string> = {
  H: '#e8eaf0',
  C: '#4b5568',
  N: '#4ea1ff',
  O: '#ff5f56',
  S: '#f5c94a',
  P: '#ff9f4a',
  Cl: '#5fd67a',
  Na: '#a685ff',
  K: '#a685ff',
  Ca: '#9aa5b8',
  Fe: '#c2703a',
};
const FALLBACK_COLOR = '#8891a7';

const VIEW_SIZE = 200;
const PADDING = 30;

@Component({
  selector: 'app-molecule-block',
  template: `
    <svg
      class="molecule-block"
      [attr.viewBox]="'0 0 ' + viewSize + ' ' + viewSize"
      role="img"
      [attr.aria-label]="ariaLabel()"
    >
      @for (bond of bonds(); track $index) {
        <line
          [attr.x1]="bond.x1"
          [attr.y1]="bond.y1"
          [attr.x2]="bond.x2"
          [attr.y2]="bond.y2"
          class="molecule-block__bond"
        />
      }
      @for (atom of atoms(); track $index) {
        <circle [attr.cx]="atom.cx" [attr.cy]="atom.cy" r="14" [attr.fill]="atom.color" />
        <text [attr.x]="atom.cx" [attr.y]="atom.cy" class="molecule-block__label">
          {{ atom.el }}
        </text>
      }
    </svg>
  `,
  styleUrl: './molecule-block.component.css',
})
export class MoleculeBlockComponent {
  readonly block = input.required<MoleculeBlock>();
  readonly viewSize = VIEW_SIZE;

  readonly ariaLabel = computed(() =>
    this.block().mode === 'formula'
      ? `Molecule diagram: ${(this.block() as { formula: string }).formula}`
      : 'Molecule structure diagram',
  );

  readonly atoms = computed<LayoutAtom[]>(() => {
    const block = this.block();
    if (block.mode === 'formula') return this.layoutFormula(block.formula);
    return this.layoutStructure(block.atoms).atoms;
  });

  readonly bonds = computed<Bond[]>(() => {
    const block = this.block();
    if (block.mode === 'formula') return [];
    return this.layoutStructure(block.atoms, block.bonds).bonds;
  });

  private layoutFormula(formula: string): LayoutAtom[] {
    const instances: string[] = [];
    for (const match of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
      const [, el, countRaw] = match;
      if (!el) continue;
      const count = countRaw ? Number(countRaw) : 1;
      for (let i = 0; i < count; i++) instances.push(el);
    }
    const center = VIEW_SIZE / 2;
    const radius = VIEW_SIZE / 2 - PADDING;
    if (instances.length === 1) {
      return [{ el: instances[0], color: colorFor(instances[0]), cx: center, cy: center }];
    }
    return instances.map((el, i) => {
      const angle = (2 * Math.PI * i) / instances.length - Math.PI / 2;
      return {
        el,
        color: colorFor(el),
        cx: center + radius * Math.cos(angle),
        cy: center + radius * Math.sin(angle),
      };
    });
  }

  private layoutStructure(
    atoms: { el: string; x: number; y: number }[],
    bonds: [number, number][] = [],
  ): { atoms: LayoutAtom[]; bonds: Bond[] } {
    if (atoms.length === 0) return { atoms: [], bonds: [] };
    const xs = atoms.map((a) => a.x);
    const ys = atoms.map((a) => a.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const span = Math.max(spanX, spanY);
    const usable = VIEW_SIZE - PADDING * 2;

    const project = (x: number, y: number) => ({
      cx: PADDING + ((x - minX) / span) * usable + (usable - (spanX / span) * usable) / 2,
      cy: PADDING + ((y - minY) / span) * usable + (usable - (spanY / span) * usable) / 2,
    });

    const laidOut = atoms.map((atom) => ({
      el: atom.el,
      color: colorFor(atom.el),
      ...project(atom.x, atom.y),
    }));

    const laidOutBonds = bonds
      .filter(([a, b]) => laidOut[a] && laidOut[b])
      .map(([a, b]) => ({
        x1: laidOut[a].cx,
        y1: laidOut[a].cy,
        x2: laidOut[b].cx,
        y2: laidOut[b].cy,
      }));

    return { atoms: laidOut, bonds: laidOutBonds };
  }
}

function colorFor(el: string): string {
  return ELEMENT_COLORS[el] ?? FALLBACK_COLOR;
}

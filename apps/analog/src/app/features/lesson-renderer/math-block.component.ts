import { Component, computed, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { inject } from '@angular/core';
import katex from 'katex';

// `trust: false` (the default, set explicitly here so it can't silently
// change) disallows the handful of KaTeX commands that can reach outside
// the math box (e.g. \href, \includegraphics) — lesson LaTeX comes from
// authors, not the platform, so it's treated as untrusted input even though
// it's rendered for every viewer.
@Component({
  selector: 'app-math-block',
  template: `
    @if (renderedHtml(); as html) {
      <div class="math-block" [innerHTML]="html"></div>
    } @else {
      <p class="math-block__error">Invalid LaTeX: {{ latex() }}</p>
    }
  `,
  styleUrl: './math-block.component.css',
})
export class MathBlockComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly latex = input.required<string>();

  readonly renderedHtml = computed(() => {
    try {
      const raw = katex.renderToString(this.latex(), {
        throwOnError: true,
        trust: false,
        displayMode: true,
      });
      return this.sanitizer.bypassSecurityTrustHtml(raw);
    } catch {
      return null;
    }
  });
}

import { Component, input } from '@angular/core';
import type { InlineNode } from '@questly/lesson-dsl';

// Renders InlineNode[] as real Angular-templated DOM (no innerHTML) — bold
// text, links, etc. are all just data, so Angular's own interpolation
// escaping is enough; there's nothing here that needs sanitizer bypass.
@Component({
  selector: 'app-inline-content',
  template: `
    @for (node of nodes(); track $index) {
      @switch (node.type) {
        @case ('bold') {
          <strong>{{ node.text }}</strong>
        }
        @case ('italic') {
          <em>{{ node.text }}</em>
        }
        @case ('code') {
          <code>{{ node.text }}</code>
        }
        @case ('link') {
          <a [href]="node.href" target="_blank" rel="noopener noreferrer">{{ node.text }}</a>
        }
        @default {
          {{ node.text }}
        }
      }
    }
  `,
})
export class InlineContentComponent {
  readonly nodes = input.required<InlineNode[]>();
}

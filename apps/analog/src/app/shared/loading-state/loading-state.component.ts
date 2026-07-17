import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  template: `
    <div class="loading-state" role="status">
      <span class="loading-state__spinner" aria-hidden="true"></span>
      <span class="loading-state__label">{{ label() }}</span>
    </div>
  `,
  styleUrl: './loading-state.component.css',
})
export class LoadingStateComponent {
  readonly label = input('Loading…');
}

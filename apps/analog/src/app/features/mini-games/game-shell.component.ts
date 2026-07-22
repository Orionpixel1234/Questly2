import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-game-shell',
  template: `
    <div class="game-shell">
      <div class="game-shell__header">
        <div>
          <h2 class="game-shell__title">{{ title() }}</h2>
          @if (counter()) {
            <p class="game-shell__counter">{{ counter() }}</p>
          }
        </div>
        <button type="button" class="btn btn-secondary" (click)="exit.emit()">
          &larr; Back to games
        </button>
      </div>
      <ng-content />
    </div>
  `,
  styleUrl: './mini-games.component.css',
})
export class GameShellComponent {
  readonly title = input.required<string>();
  readonly counter = input<string>('');
  readonly exit = output<void>();
}

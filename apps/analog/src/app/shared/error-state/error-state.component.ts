import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  template: `
    <div class="error-state panel" role="alert">
      <p class="error-state__message">{{ message() }}</p>
      @if (showRetry()) {
        <button type="button" class="btn btn-secondary" (click)="retry.emit()">
          Try again
        </button>
      }
    </div>
  `,
  styleUrl: './error-state.component.css',
})
export class ErrorStateComponent {
  readonly message = input('Something went wrong.');
  readonly showRetry = input(true);
  readonly retry = output<void>();
}

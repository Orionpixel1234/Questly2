import { Component, inject } from '@angular/core';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-theme-toggle',
  template: `
    <button
      type="button"
      class="btn btn-secondary theme-toggle"
      (click)="theme.toggle()"
      [attr.aria-pressed]="theme.theme() === 'light'"
      aria-label="Toggle light and dark theme"
    >
      @if (theme.theme() === 'dark') {
        <span aria-hidden="true">&#9789;</span>
        Dark
      } @else {
        <span aria-hidden="true">&#9728;</span>
        Light
      }
    </button>
  `,
  styleUrl: './theme-toggle.component.css',
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
}

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { StarfieldBackgroundComponent } from './shared/starfield-background/starfield-background.component';
import { ThemeToggleComponent } from './shared/theme/theme-toggle.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, StarfieldBackgroundComponent, ThemeToggleComponent],
  template: `
    <app-starfield-background />

    <header class="app-shell-header">
      <a href="/"><span class="app-shell-brand">Questly</span></a>
      <app-theme-toggle />
    </header>

    <main class="app-shell-content">
      <router-outlet />
    </main>
  `,
  styleUrl: './app.component.css',
})
export class AppComponent {}

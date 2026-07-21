import { Component, afterNextRender, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { StarfieldBackgroundComponent } from './shared/starfield-background/starfield-background.component';
import { ThemeToggleComponent } from './shared/theme/theme-toggle.component';
import { SidebarComponent } from './shared/sidebar/sidebar.component';
import { NovaChatComponent } from './features/nova-chat/nova-chat.component';
import { AuthFacade } from './state/auth/auth.facade';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    StarfieldBackgroundComponent,
    ThemeToggleComponent,
    SidebarComponent,
    NovaChatComponent,
  ],
  template: `
    <app-starfield-background />

    <header class="app-shell-header">
      <a href="/"><span class="app-shell-brand">Questly</span></a>

      <div class="app-shell-header__actions">
        @if (auth.isAuthenticated()) {
          <a class="btn btn-secondary" routerLink="/account">{{ auth.user()?.name }}</a>
          <button type="button" class="btn btn-secondary" (click)="auth.logout()">
            Log out
          </button>
        } @else {
          <a class="btn btn-secondary" routerLink="/login">Sign in</a>
          <a class="btn btn-primary" routerLink="/signup">Sign up</a>
        }
        <app-theme-toggle />
      </div>
    </header>

    <div class="app-shell-body">
      @if (auth.isAuthenticated()) {
        <app-sidebar />
      }
      <main class="app-shell-content">
        <router-outlet />
      </main>
    </div>

    @if (auth.isAuthenticated()) {
      <app-nova-chat />
    }
  `,
  styleUrl: './app.component.css',
})
export class AppComponent {
  protected readonly auth = inject(AuthFacade);

  constructor() {
    afterNextRender(() => this.auth.refreshToken());
  }
}

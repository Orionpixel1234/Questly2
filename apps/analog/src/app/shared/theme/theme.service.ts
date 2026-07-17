import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'questly-theme';

// Dark is the default: with no stored preference, or on the server, the app
// renders dark (matching the un-attributed :root tokens in _tokens.scss)
// and only switches to light once a client has explicitly opted in.
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly theme = signal<ThemeMode>(this.readInitialTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  toggle(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    this.applyTheme(mode);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  }

  private readInitialTheme(): ThemeMode {
    if (!this.isBrowser) return 'dark';
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  }

  private applyTheme(mode: ThemeMode): void {
    if (!this.isBrowser) return;
    document.documentElement.dataset['theme'] = mode;
  }
}

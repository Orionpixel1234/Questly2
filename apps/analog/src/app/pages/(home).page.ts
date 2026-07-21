import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { UserRole } from '@questly/shared-types';
import { AuthFacade } from '../state/auth/auth.facade';

const PANEL_ROUTE_BY_ROLE: Record<UserRole, string> = {
  admin: '/admin',
  author: '/author',
  student: '/student',
  educator: '/educator',
};

interface FeatureCard {
  title: string;
  body: string;
}

interface PanelCard {
  role: UserRole;
  route: string;
  title: string;
  body: string;
}

const FEATURES: FeatureCard[] = [
  {
    title: 'Any subject, any level',
    body: '1st-grade addition through college calculus, all on one platform — with a markup language that renders math graphs, molecules, and runnable code alongside the text.',
  },
  {
    title: 'Learn like it’s a call',
    body: 'Driving, cooking, working out — switch a lesson to call mode and Nova reads it aloud, so learning fits into the parts of your day a screen can’t.',
  },
  {
    title: 'Progress that feels like a game',
    body: 'Set goals across Coding, Math, Humanities, Art and more. Every completed lesson earns EXP toward the subjects you care about, tracked right in your sidebar.',
  },
  {
    title: 'Nova, your AI assistant',
    body: 'Stuck on a problem? Nova is built into every lesson to answer questions, explain concepts differently, and keep you moving.',
  },
];

const PANELS: PanelCard[] = [
  {
    role: 'student',
    route: '/student',
    title: 'Student',
    body: 'Browse lessons, track EXP toward your goals, and keep your class schedule in one calendar.',
  },
  {
    role: 'educator',
    route: '/educator',
    title: 'Educator',
    body: 'Manage classes, monitor enrollment, and see how your students are progressing.',
  },
  {
    role: 'author',
    route: '/author',
    title: 'Author',
    body: 'Write lessons in Questly’s markup language — math, code, and interactive visuals included.',
  },
  {
    role: 'admin',
    route: '/admin',
    title: 'Admin',
    body: 'Oversee users, roles, and platform-wide metrics from a single dashboard.',
  },
];

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <section class="panel panel--raised hero">
      <span class="page-stub__eyebrow">Space/satellite-themed learning</span>
      <h1 class="hero__title">Questly</h1>
      <p class="hero__tagline">
        A learning platform that spans 1st-grade addition to college calculus —
        with its own markup language for math, science, and code, a built-in
        game to keep you motivated, and an AI co-pilot along for the ride.
      </p>

      <div class="hero__actions">
        @if (auth.isAuthenticated()) {
          <a class="btn btn-primary" [routerLink]="panelHref()">
            Go to your panel
          </a>
          <a class="btn btn-secondary" routerLink="/calendar">View calendar</a>
        } @else {
          <a class="btn btn-primary" routerLink="/signup">Get started</a>
          <a class="btn btn-secondary" routerLink="/login">Sign in</a>
        }
      </div>
    </section>

    <section class="feature-grid">
      @for (feature of features; track feature.title) {
        <div class="panel feature-card">
          <h2 class="feature-card__title">{{ feature.title }}</h2>
          <p class="feature-card__body">{{ feature.body }}</p>
        </div>
      }
    </section>

    <section class="panel-section">
      <h2 class="panel-section__title">Four panels, one platform</h2>
      <div class="panel-grid">
        @for (panel of panels; track panel.role) {
          <a class="panel card-list__item panel-card" [routerLink]="panel.route">
            <div class="card-list__item-body">
              <h3>{{ panel.title }}</h3>
              <p>{{ panel.body }}</p>
            </div>
          </a>
        }
      </div>
    </section>
  `,
  styleUrls: ['./page-stub.css', './(home).page.css'],
})
export default class HomePageComponent {
  protected readonly auth = inject(AuthFacade);
  protected readonly features = FEATURES;
  protected readonly panels = PANELS;

  protected readonly panelHref = computed(() => {
    const role = this.auth.user()?.role;
    return role ? PANEL_ROUTE_BY_ROLE[role] : '/login';
  });
}

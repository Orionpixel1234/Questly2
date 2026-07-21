import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { defineRouteMeta } from '@analogjs/router';
import type {
  AdminGameProfile,
  AdminUserSummary,
  LessonReviewItem,
  MetricsOverview,
  UserRole,
} from '@questly/shared-types';
import { authGuard } from '../core/guards/auth.guard';
import { roleGuard } from '../core/guards/role.guard';
import { AdminUsersApiService } from '../core/api/admin-users-api.service';
import { MetricsApiService } from '../core/api/metrics-api.service';
import { LessonsApiService } from '../core/api/lessons-api.service';
import { GameApiService } from '../core/api/game-api.service';
import { LoadingStateComponent } from '../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../shared/error-state/error-state.component';
import { LessonRendererComponent } from '../features/lesson-renderer/lesson-renderer.component';

export const routeMeta = defineRouteMeta({
  canActivate: [authGuard, roleGuard],
  data: { role: 'admin' },
});

const ROLES: UserRole[] = ['admin', 'author', 'student', 'educator'];

@Component({
  selector: 'app-admin-page',
  imports: [
    ReactiveFormsModule,
    LoadingStateComponent,
    ErrorStateComponent,
    LessonRendererComponent,
  ],
  template: `
    <div class="panel-page">
      <section class="panel panel-page__section">
        <h1 class="page-stub__title" style="margin-bottom: 0">Overview</h1>

        @if (metricsError()) {
          <app-error-state [message]="metricsError()!" (retry)="loadMetrics()" />
        } @else if (metricsLoading()) {
          <app-loading-state label="Loading metrics…" />
        } @else if (metrics(); as m) {
          <div class="stat-grid">
            <div class="stat-card">
              <span class="stat-card__value">{{ m.totalUsers }}</span>
              <span class="stat-card__label">Total users</span>
              <span class="stat-card__hint">
                {{ m.usersByRole.admin }} admin · {{ m.usersByRole.author }} author ·
                {{ m.usersByRole.student }} student · {{ m.usersByRole.educator }} educator
              </span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value">{{ m.newUsers7d }}</span>
              <span class="stat-card__label">New users (7d)</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value">{{ m.newUsers30d }}</span>
              <span class="stat-card__label">New users (30d)</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value">{{ m.totalLessons }}</span>
              <span class="stat-card__label">Lessons</span>
              <span class="stat-card__hint">
                {{ m.publishedLessons }} published · {{ m.draftLessons }} draft ·
                {{ m.rejectedLessons }} rejected
              </span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value">{{ m.pendingReviewLessons }}</span>
              <span class="stat-card__label">Awaiting review</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value">{{ m.totalClasses }}</span>
              <span class="stat-card__label">Classes</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value">{{ m.totalEnrollments }}</span>
              <span class="stat-card__label">Enrollments</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value">{{ m.totalCompletions }}</span>
              <span class="stat-card__label">Lesson completions</span>
            </div>
            <div class="stat-card">
              <span class="stat-card__value">{{ m.totalExpAwarded }}</span>
              <span class="stat-card__label">Total EXP awarded</span>
            </div>
          </div>
        }
      </section>

      <section class="panel panel-page__section">
        <h1 class="page-stub__title" style="margin-bottom: 0">Lesson review</h1>

        @if (pendingError()) {
          <app-error-state [message]="pendingError()!" (retry)="loadPending()" />
        } @else if (pendingLoading()) {
          <app-loading-state label="Loading review queue…" />
        } @else if (pendingLessons().length) {
          <div class="card-list">
            @for (lesson of pendingLessons(); track lesson.id) {
              <div class="panel--raised admin-page__review-item">
                <div class="admin-page__review-header">
                  <div>
                    <h3>{{ lesson.title }}</h3>
                    <p class="admin-page__review-meta">
                      {{ lesson.subject }} · submitted by {{ lesson.author.name }} ({{ lesson.author.email }})
                    </p>
                    <p>{{ lesson.description }}</p>
                  </div>
                </div>
                <div class="admin-page__review-preview panel">
                  <span class="lesson-editor__preview-label">Preview</span>
                  <app-lesson-renderer [source]="lesson.content" />
                </div>
                <div class="admin-page__review-actions">
                  <button type="button" class="btn btn-primary" (click)="approveLesson(lesson.id)">
                    Approve
                  </button>
                  <input
                    #note
                    type="text"
                    placeholder="Rejection reason (optional)"
                    class="admin-page__review-note"
                  />
                  <button
                    type="button"
                    class="btn btn-secondary"
                    (click)="rejectLesson(lesson.id, note.value); note.value = ''"
                  >
                    Reject
                  </button>
                </div>
              </div>
            }
          </div>
        } @else {
          <p class="panel-page__empty">Nothing waiting on review.</p>
        }
      </section>

      <section class="panel panel-page__section">
        <h1 class="page-stub__title" style="margin-bottom: 0">Users</h1>

        <form [formGroup]="searchForm" (ngSubmit)="search()" class="inline-form">
          <label class="inline-form__field" style="flex: 1 1 16rem">
            <span>Search by name</span>
            <input type="text" formControlName="name" />
          </label>
          <button type="submit" class="btn btn-secondary">Search</button>
          <button type="button" class="btn btn-secondary" (click)="clearSearch()">
            Clear
          </button>
        </form>

        @if (loadError()) {
          <app-error-state [message]="loadError()!" (retry)="loadAll()" />
        } @else if (loading()) {
          <app-loading-state label="Loading users…" />
        } @else if (users().length) {
          <div style="overflow-x: auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Subjects</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (user of users(); track user.id) {
                  <tr>
                    <td>{{ user.name }}</td>
                    <td>{{ user.email }}</td>
                    <td>{{ user.subjects.length ? user.subjects.join(', ') : '—' }}</td>
                    <td>
                      <select
                        [value]="user.role"
                        (change)="changeRole(user, $any($event.target).value)"
                      >
                        @for (role of roles; track role) {
                          <option [value]="role">{{ role }}</option>
                        }
                      </select>
                    </td>
                    <td>
                      <span class="badge" [class.badge--accent]="!user.banned">
                        {{ user.banned ? 'Banned' : 'Active' }}
                      </span>
                    </td>
                    <td>
                      @if (user.banned) {
                        <button type="button" class="btn btn-secondary" (click)="unbanUser(user)">
                          Unban
                        </button>
                      } @else {
                        <button type="button" class="btn btn-secondary" (click)="banUser(user)">
                          Ban
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="panel-page__empty">No users found.</p>
        }
      </section>

      <section class="panel panel-page__section">
        <h1 class="page-stub__title" style="margin-bottom: 0">Game accounts</h1>

        @if (gameProfilesError()) {
          <app-error-state [message]="gameProfilesError()!" (retry)="loadGameProfiles()" />
        } @else if (gameProfilesLoading()) {
          <app-loading-state label="Loading game accounts…" />
        } @else if (gameProfiles().length) {
          <div style="overflow-x: auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Stardust</th>
                  <th>Ship tier</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (profile of gameProfiles(); track profile.userId) {
                  <tr>
                    <td>{{ profile.name }}</td>
                    <td>{{ profile.email }}</td>
                    <td>{{ profile.stardust }}</td>
                    <td>{{ profile.shipTier }}</td>
                    <td class="admin-page__review-actions">
                      <input #delta type="number" class="admin-page__stardust-input" placeholder="±amount" />
                      <button
                        type="button"
                        class="btn btn-secondary"
                        (click)="adjustStardust(profile.userId, delta.valueAsNumber); delta.value = ''"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        class="btn btn-secondary"
                        (click)="resetGameProfile(profile.userId)"
                      >
                        Reset
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="panel-page__empty">No one has played yet.</p>
        }
      </section>
    </div>
  `,
  styleUrls: [
    './page-stub.css',
    './panel-page.css',
    '../features/lesson-editor/lesson-editor.component.css',
    './admin.page.css',
  ],
})
export default class AdminPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly usersApi = inject(AdminUsersApiService);
  private readonly metricsApi = inject(MetricsApiService);
  private readonly lessonsApi = inject(LessonsApiService);
  private readonly gameApi = inject(GameApiService);

  protected readonly roles = ROLES;
  protected readonly users = signal<AdminUserSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly metrics = signal<MetricsOverview | null>(null);
  protected readonly metricsLoading = signal(true);
  protected readonly metricsError = signal<string | null>(null);

  protected readonly pendingLessons = signal<LessonReviewItem[]>([]);
  protected readonly pendingLoading = signal(true);
  protected readonly pendingError = signal<string | null>(null);

  protected readonly gameProfiles = signal<AdminGameProfile[]>([]);
  protected readonly gameProfilesLoading = signal(true);
  protected readonly gameProfilesError = signal<string | null>(null);

  protected readonly searchForm = this.fb.nonNullable.group({ name: '' });

  constructor() {
    this.loadAll();
    this.loadMetrics();
    this.loadPending();
    this.loadGameProfiles();
  }

  protected loadMetrics(): void {
    this.metricsLoading.set(true);
    this.metricsError.set(null);
    this.metricsApi.overview().subscribe({
      next: (metrics) => {
        this.metrics.set(metrics);
        this.metricsLoading.set(false);
      },
      error: () => {
        this.metricsError.set('Could not load metrics.');
        this.metricsLoading.set(false);
      },
    });
  }

  protected loadPending(): void {
    this.pendingLoading.set(true);
    this.pendingError.set(null);
    this.lessonsApi.pending().subscribe({
      next: (lessons) => {
        this.pendingLessons.set(lessons);
        this.pendingLoading.set(false);
      },
      error: () => {
        this.pendingError.set('Could not load the review queue.');
        this.pendingLoading.set(false);
      },
    });
  }

  protected approveLesson(id: string): void {
    this.lessonsApi.approve(id).subscribe(() => {
      this.loadPending();
      this.loadMetrics();
    });
  }

  protected rejectLesson(id: string, note: string): void {
    this.lessonsApi.reject(id, note || undefined).subscribe(() => {
      this.loadPending();
      this.loadMetrics();
    });
  }

  protected loadAll(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.usersApi.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load users.');
        this.loading.set(false);
      },
    });
  }

  protected search(): void {
    const name = this.searchForm.getRawValue().name.trim();
    if (!name) {
      this.loadAll();
      return;
    }
    this.loading.set(true);
    this.loadError.set(null);
    this.usersApi.list(name).subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Search failed.');
        this.loading.set(false);
      },
    });
  }

  protected clearSearch(): void {
    this.searchForm.reset({ name: '' });
    this.loadAll();
  }

  protected changeRole(user: AdminUserSummary, role: UserRole): void {
    this.usersApi.updateRole(user.id, role).subscribe(() => this.loadAll());
  }

  protected banUser(user: AdminUserSummary): void {
    this.usersApi.ban(user.id).subscribe(() => this.loadAll());
  }

  protected unbanUser(user: AdminUserSummary): void {
    this.usersApi.unban(user.id).subscribe(() => this.loadAll());
  }

  protected loadGameProfiles(): void {
    this.gameProfilesLoading.set(true);
    this.gameProfilesError.set(null);
    this.gameApi.profiles().subscribe({
      next: (profiles) => {
        this.gameProfiles.set(profiles);
        this.gameProfilesLoading.set(false);
      },
      error: () => {
        this.gameProfilesError.set('Could not load game accounts.');
        this.gameProfilesLoading.set(false);
      },
    });
  }

  protected adjustStardust(userId: string, delta: number): void {
    if (!Number.isFinite(delta) || delta === 0) return;
    this.gameApi.adjust(userId, delta).subscribe(() => this.loadGameProfiles());
  }

  protected resetGameProfile(userId: string): void {
    this.gameApi.reset(userId).subscribe(() => this.loadGameProfiles());
  }
}

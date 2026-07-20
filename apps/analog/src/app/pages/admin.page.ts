import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { defineRouteMeta } from '@analogjs/router';
import type { AdminUserSummary, UserRole } from '@questly/shared-types';
import { authGuard } from '../core/guards/auth.guard';
import { roleGuard } from '../core/guards/role.guard';
import { AdminUsersApiService } from '../core/api/admin-users-api.service';
import { LoadingStateComponent } from '../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../shared/error-state/error-state.component';

export const routeMeta = defineRouteMeta({
  canActivate: [authGuard, roleGuard],
  data: { role: 'admin' },
});

const ROLES: UserRole[] = ['admin', 'author', 'student', 'educator'];

@Component({
  selector: 'app-admin-page',
  imports: [ReactiveFormsModule, LoadingStateComponent, ErrorStateComponent],
  template: `
    <div class="panel-page">
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
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="panel-page__empty">No users found.</p>
        }
      </section>
    </div>
  `,
  styleUrls: ['./page-stub.css', './panel-page.css'],
})
export default class AdminPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly usersApi = inject(AdminUsersApiService);

  protected readonly roles = ROLES;
  protected readonly users = signal<AdminUserSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly searchForm = this.fb.nonNullable.group({ name: '' });

  constructor() {
    this.loadAll();
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
}

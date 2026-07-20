import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { AdminUserSummary, UserRole } from '@questly/shared-types';
import { API_BASE_URL } from '../api-base-url.token';

@Injectable({ providedIn: 'root' })
export class AdminUsersApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/users`;

  list(search?: string) {
    const url = search ? `${this.base}/search` : this.base;
    return this.http.get<AdminUserSummary[]>(url, {
      withCredentials: true,
      params: search ? { name: search } : {},
    });
  }

  updateRole(id: string, role: UserRole) {
    return this.http.patch<AdminUserSummary>(
      `${this.base}/${id}/role`,
      { role },
      { withCredentials: true },
    );
  }
}

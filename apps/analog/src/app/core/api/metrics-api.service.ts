import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { MetricsOverview } from '@questly/shared-types';
import { API_BASE_URL } from '../api-base-url.token';

@Injectable({ providedIn: 'root' })
export class MetricsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/metrics`;

  overview() {
    return this.http.get<MetricsOverview>(`${this.base}/overview`, {
      withCredentials: true,
    });
  }
}

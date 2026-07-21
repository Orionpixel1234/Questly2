import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type {
  AdminGameProfile,
  GameLeaderboardEntry,
  GameProfileSummary,
  StarMap,
} from '@questly/shared-types';
import { API_BASE_URL } from '../api-base-url.token';

@Injectable({ providedIn: 'root' })
export class GameApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/game`;

  map() {
    return this.http.get<StarMap>(`${this.base}/map`, { withCredentials: true });
  }

  upgrade() {
    return this.http.post<GameProfileSummary>(`${this.base}/upgrade`, {}, {
      withCredentials: true,
    });
  }

  leaderboard() {
    return this.http.get<GameLeaderboardEntry[]>(`${this.base}/leaderboard`, {
      withCredentials: true,
    });
  }

  // Admin moderation
  profiles() {
    return this.http.get<AdminGameProfile[]>(`${this.base}/profiles`, {
      withCredentials: true,
    });
  }

  adjust(userId: string, delta: number) {
    return this.http.post<AdminGameProfile>(
      `${this.base}/profiles/${userId}/adjust`,
      { delta },
      { withCredentials: true },
    );
  }

  reset(userId: string) {
    return this.http.post<AdminGameProfile>(
      `${this.base}/profiles/${userId}/reset`,
      {},
      { withCredentials: true },
    );
  }
}

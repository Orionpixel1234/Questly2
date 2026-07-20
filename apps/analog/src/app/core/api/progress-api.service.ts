import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { LeaderboardEntry } from '@questly/shared-types';
import { API_BASE_URL } from '../api-base-url.token';

export interface CompleteLessonResult {
  subject: string;
  exp: number;
  level: number;
  expAwarded: number;
}

@Injectable({ providedIn: 'root' })
export class ProgressApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/progress`;

  leaderboard() {
    return this.http.get<LeaderboardEntry[]>(`${this.base}/leaderboard`, {
      withCredentials: true,
    });
  }

  completed() {
    return this.http.get<string[]>(`${this.base}/completed`, { withCredentials: true });
  }

  completeLesson(lessonId: string) {
    return this.http.post<CompleteLessonResult>(
      `${this.base}/lessons/${lessonId}/complete`,
      {},
      { withCredentials: true },
    );
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { LeaderboardEntry } from '@questly/shared-types';
import type { AnswersPayload } from '@questly/lesson-dsl';
import { API_BASE_URL } from '../api-base-url.token';

export interface CompleteLessonGrading {
  autoScore: number;
  autoTotal: number;
  manualTotal: number;
  pendingManualGrading: boolean;
}

export interface CompleteLessonResult {
  subject: string;
  exp: number;
  level: number;
  expAwarded: number;
  grading: CompleteLessonGrading | null;
}

export interface PendingGradingItem {
  completionId: string;
  lessonId: string;
  lessonTitle: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
  manualTotal: number;
  openQuestions: { blockIndex: number; question: string; answer: string }[];
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

  completeLesson(lessonId: string, answers?: AnswersPayload) {
    return this.http.post<CompleteLessonResult>(
      `${this.base}/lessons/${lessonId}/complete`,
      answers ? { answers } : {},
      { withCredentials: true },
    );
  }

  // Grading (Author/Educator/Admin only — enforced server-side)
  pendingGrading() {
    return this.http.get<PendingGradingItem[]>(`${this.base}/grading/pending`, {
      withCredentials: true,
    });
  }

  gradeSubmission(completionId: string, manualScore: number, feedback?: Record<string, string>) {
    return this.http.post(
      `${this.base}/grading/${completionId}`,
      { manualScore, feedback },
      { withCredentials: true },
    );
  }
}

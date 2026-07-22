import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../api-base-url.token';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateLessonResult {
  content: string;
  valid: boolean;
  error: string | null;
}

export interface GeneratedQuestion {
  q: string;
  a: string;
  answers?: string[];
}

@Injectable({ providedIn: 'root' })
export class AiApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/ai`;

  status() {
    return this.http.get<{ configured: boolean }>(`${this.base}/status`, {
      withCredentials: true,
    });
  }

  chat(message: string, history: ChatTurn[]) {
    return this.http.post<{ reply: string }>(
      `${this.base}/chat`,
      { message, history },
      { withCredentials: true },
    );
  }

  generateLesson(topic: string, subject?: string, gradeLevel?: string) {
    return this.http.post<GenerateLessonResult>(
      `${this.base}/generate-lesson`,
      { topic, subject, gradeLevel },
      { withCredentials: true },
    );
  }

  generateQuestions(topic: string, count?: number) {
    return this.http.post<{ questions: GeneratedQuestion[] }>(
      `${this.base}/generate-questions`,
      { topic, count },
      { withCredentials: true },
    );
  }
}

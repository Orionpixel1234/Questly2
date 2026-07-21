import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type {
  CreateLessonPayload,
  Lesson,
  LessonReviewItem,
  UpdateLessonPayload,
} from '@questly/shared-types';
import { API_BASE_URL } from '../api-base-url.token';

@Injectable({ providedIn: 'root' })
export class LessonsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/lessons`;

  mine() {
    return this.http.get<Lesson[]>(`${this.base}/mine`, { withCredentials: true });
  }

  published(subject?: string) {
    return this.http.get<Lesson[]>(this.base, {
      withCredentials: true,
      params: subject ? { subject } : {},
    });
  }

  getOne(id: string) {
    return this.http.get<Lesson>(`${this.base}/${id}`, { withCredentials: true });
  }

  create(payload: CreateLessonPayload) {
    return this.http.post<Lesson>(this.base, payload, { withCredentials: true });
  }

  update(id: string, payload: UpdateLessonPayload) {
    return this.http.patch<Lesson>(`${this.base}/${id}`, payload, {
      withCredentials: true,
    });
  }

  remove(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`, { withCredentials: true });
  }

  submit(id: string) {
    return this.http.post<Lesson>(`${this.base}/${id}/submit`, {}, {
      withCredentials: true,
    });
  }

  // Admin review queue
  pending() {
    return this.http.get<LessonReviewItem[]>(`${this.base}/pending`, {
      withCredentials: true,
    });
  }

  approve(id: string) {
    return this.http.post<Lesson>(`${this.base}/${id}/approve`, {}, {
      withCredentials: true,
    });
  }

  reject(id: string, note?: string) {
    return this.http.post<Lesson>(
      `${this.base}/${id}/reject`,
      { note },
      { withCredentials: true },
    );
  }
}

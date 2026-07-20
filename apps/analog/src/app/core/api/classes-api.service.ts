import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { ClassSummary, RosterStudent } from '@questly/shared-types';
import { API_BASE_URL } from '../api-base-url.token';

export interface CreateClassPayload {
  name: string;
  subject: string;
}

@Injectable({ providedIn: 'root' })
export class ClassesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/classes`;

  mine() {
    return this.http.get<ClassSummary[]>(`${this.base}/mine`, {
      withCredentials: true,
    });
  }

  enrolled() {
    return this.http.get<ClassSummary[]>(`${this.base}/enrolled`, {
      withCredentials: true,
    });
  }

  create(payload: CreateClassPayload) {
    return this.http.post<ClassSummary>(this.base, payload, {
      withCredentials: true,
    });
  }

  roster(classId: string) {
    return this.http.get<RosterStudent[]>(`${this.base}/${classId}/roster`, {
      withCredentials: true,
    });
  }

  enroll(classId: string, email: string) {
    return this.http.post<RosterStudent>(
      `${this.base}/${classId}/roster`,
      { email },
      { withCredentials: true },
    );
  }

  unenroll(classId: string, studentId: string) {
    return this.http.delete<void>(`${this.base}/${classId}/roster/${studentId}`, {
      withCredentials: true,
    });
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type {
  CalendarEvent,
  CreateCalendarEventPayload,
  UpdateCalendarEventPayload,
} from '@questly/shared-types';
import { API_BASE_URL } from '../api-base-url.token';

@Injectable({ providedIn: 'root' })
export class CalendarApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/calendar/events`;

  mine() {
    return this.http.get<CalendarEvent[]>(this.base, { withCredentials: true });
  }

  create(payload: CreateCalendarEventPayload) {
    return this.http.post<CalendarEvent>(this.base, payload, { withCredentials: true });
  }

  update(id: string, payload: UpdateCalendarEventPayload) {
    return this.http.patch<CalendarEvent>(`${this.base}/${id}`, payload, {
      withCredentials: true,
    });
  }

  remove(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`, { withCredentials: true });
  }
}

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  subject: string | null;
  classId: string | null;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface CreateCalendarEventPayload {
  title: string;
  subject?: string;
  classId?: string;
  startTime: string;
  endTime: string;
}

export type UpdateCalendarEventPayload = Partial<CreateCalendarEventPayload>;

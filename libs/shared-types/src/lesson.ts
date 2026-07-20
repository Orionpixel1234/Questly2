export interface Lesson {
  id: string;
  title: string;
  description: string;
  subject: string;
  // LessonML source — see LESSON_DSL.md at the repo root for the grammar.
  content: string;
  published: boolean;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonPayload {
  title: string;
  description: string;
  subject: string;
  content?: string;
  published?: boolean;
}

export type UpdateLessonPayload = Partial<CreateLessonPayload>;

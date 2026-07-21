// DRAFT: author/educator still editing, invisible to everyone else.
// PENDING_REVIEW: submitted, waiting on an admin.
// PUBLISHED: approved, visible in the catalog and completable.
// REJECTED: admin declined it (see rejectionNote); author can edit and resubmit.
export type LessonStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';

export interface Lesson {
  id: string;
  title: string;
  description: string;
  subject: string;
  // LessonML source — see LESSON_DSL.md at the repo root for the grammar.
  content: string;
  status: LessonStatus;
  rejectionNote: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

// GET /lessons/pending (admin review queue) — a Lesson plus who wrote it.
export interface LessonReviewItem extends Lesson {
  author: { name: string; email: string };
}

export interface CreateLessonPayload {
  title: string;
  description: string;
  subject: string;
  content?: string;
}

export type UpdateLessonPayload = Partial<CreateLessonPayload>;

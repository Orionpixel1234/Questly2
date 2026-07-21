// Mirrors GET /metrics/overview's response (admin-only).
export interface MetricsOverview {
  totalUsers: number;
  usersByRole: {
    admin: number;
    author: number;
    student: number;
    educator: number;
  };
  newUsers7d: number;
  newUsers30d: number;
  totalLessons: number;
  publishedLessons: number;
  draftLessons: number;
  pendingReviewLessons: number;
  rejectedLessons: number;
  totalClasses: number;
  totalEnrollments: number;
  totalCompletions: number;
  totalExpAwarded: number;
}

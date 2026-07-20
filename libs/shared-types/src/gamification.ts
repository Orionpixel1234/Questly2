// v1 gamification rules — deliberately simple and deterministic rather than
// difficulty-weighted (Lesson has no difficulty field yet). Shared so the
// frontend can preview a level-up without waiting on a round trip.
export const EXP_PER_LESSON = 50;

export function levelForExp(exp: number): number {
  return Math.floor(exp / 100) + 1;
}

export interface SubjectProgress {
  subject: string;
  target: number;
  exp: number;
  level: number;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  totalExp: number;
  level: number;
}

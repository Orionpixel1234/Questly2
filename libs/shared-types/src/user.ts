export type UserRole = 'admin' | 'author' | 'student' | 'educator';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  subjects: string[];
  degreeTrack: string | null;
}

export type GoalType = 'studying' | 'teaching';

export interface SubjectGoal {
  subject: string;
  target: number;
}

// The shape the auth endpoints (login/register/refresh) return — a subset
// of UserProfile. Full profile fetching (subjects, degreeTrack, goalType)
// is the `user` NgRx slice's job via GET /users/me, kept separate from auth.
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// GET/PATCH /users (admin directory) response shape — UserProfile plus the
// fields only the admin panel needs.
export interface AdminUserSummary extends UserProfile {
  goalType: GoalType | null;
  banned: boolean;
  bannedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

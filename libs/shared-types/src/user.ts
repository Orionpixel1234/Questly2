export type UserRole = 'admin' | 'author' | 'student' | 'educator';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  subjects: string[];
  degreeTrack: string | null;
}

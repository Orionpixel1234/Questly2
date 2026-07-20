export interface ClassSummary {
  id: string;
  name: string;
  subject: string;
  educatorId: string;
  createdAt: string;
  _count?: { enrollments: number };
  educator?: { name: string };
}

export interface RosterStudent {
  id: string;
  name: string;
  email: string;
}

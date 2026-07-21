// The "Star Chart" — every subject the catalog has published lessons in is
// a system, every published lesson in it is a node. Nodes are claimed by
// completing the underlying lesson (GET /progress/completed), never by any
// action inside the game itself — the map is a live view of real progress.
export interface StarLessonNode {
  lessonId: string;
  title: string;
  claimed: boolean;
}

export interface StarSystem {
  subject: string;
  nodes: StarLessonNode[];
}

export interface GameProfileSummary {
  stardust: number;
  shipTier: number;
}

export interface StarMap {
  profile: GameProfileSummary;
  systems: StarSystem[];
}

export interface GameLeaderboardEntry {
  userId: string;
  name: string;
  stardust: number;
  shipTier: number;
}

// Admin moderation view — one row per user with a GameProfile (lazily
// created the first time they complete a lesson).
export interface AdminGameProfile {
  userId: string;
  name: string;
  email: string;
  stardust: number;
  shipTier: number;
}

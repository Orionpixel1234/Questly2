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

// The game's only currency — earned 1:1 alongside EXP for the same action
// (completing a real lesson), never independently, so the game can't be
// "played" without doing real lesson content.
export const STARDUST_PER_LESSON = EXP_PER_LESSON;

export interface ShipTier {
  tier: number;
  name: string;
  // Stardust cost to upgrade INTO this tier from the previous one.
  cost: number;
}

export const SHIP_TIERS: ShipTier[] = [
  { tier: 1, name: 'Scout Pod', cost: 0 },
  { tier: 2, name: 'Orbital Cruiser', cost: 150 },
  { tier: 3, name: 'Star Frigate', cost: 400 },
  { tier: 4, name: 'Nova Dreadnought', cost: 900 },
];

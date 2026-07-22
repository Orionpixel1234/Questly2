// Deterministic per-level track generation (same seed -> same track), so a
// level replay after failing isn't a different layout each time.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface JumpingJacksLevel {
  track: string;
  speedMs: number;
}

// Track alphabet: '.' safe tile, 'G' gap (must jump over), 'F' finish.
export function makeJumpingJacksLevel(level: number): JumpingJacksLevel {
  const rng = mulberry32(level * 9973 + 7);
  const length = 18 + Math.min(22, level * 2);
  const tiles: string[] = new Array(length).fill('.');
  const targetGaps = Math.min(2 + Math.floor(level / 2), Math.floor(length / 4));
  let placed = 0;
  let attempts = 0;
  while (placed < targetGaps && attempts < 300) {
    attempts++;
    const pos = 3 + Math.floor(rng() * (length - 6));
    // Level 6+ occasionally spawns a size-2 gap (needs precise jump timing).
    const size = level >= 6 && rng() > 0.55 ? 2 : 1;
    let ok = true;
    for (let i = -2; i < size + 2; i++) {
      if (tiles[pos + i] === 'G') {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    for (let i = 0; i < size; i++) tiles[pos + i] = 'G';
    placed++;
  }
  tiles[length - 1] = 'F';
  tiles[0] = '.';
  const speedMs = Math.max(140, 340 - level * 10);
  return { track: tiles.join(''), speedMs };
}

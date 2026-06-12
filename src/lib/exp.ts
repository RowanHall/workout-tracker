// Mirrors the Postgres functions in supabase/migrations/003_gamification.sql.
// Keep the two in sync if the curve ever changes.

export function expToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

export interface LevelProgress {
  level: number;
  /** EXP earned within the current level. */
  current: number;
  /** EXP needed to go from the current level to the next. */
  needed: number;
}

export function levelProgress(totalExp: number): LevelProgress {
  let level = 1;
  let remaining = totalExp;
  while (remaining >= expToNextLevel(level) && level < 999) {
    remaining -= expToNextLevel(level);
    level += 1;
  }
  return { level, current: remaining, needed: expToNextLevel(level) };
}

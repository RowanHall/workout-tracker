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

/**
 * The streak to display right now. profiles.current_streak is only
 * recalculated when a workout is finished, so it goes stale once a day is
 * missed. Mirrors the server rule (UTC dates): a streak survives if the last
 * workout was today or yesterday, otherwise it is broken.
 */
export function displayStreak(
  currentStreak: number,
  lastWorkoutDate: string | null
): number {
  if (!lastWorkoutDate) return 0;
  const now = Date.now();
  const todayUtc = new Date(now).toISOString().slice(0, 10);
  const yesterdayUtc = new Date(now - 86_400_000).toISOString().slice(0, 10);
  return lastWorkoutDate === todayUtc || lastWorkoutDate === yesterdayUtc
    ? currentStreak
    : 0;
}

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

import { dateKey } from './format';

/**
 * The streak to display right now. profiles.current_streak is only
 * recalculated when a workout or rest day is logged, so it goes stale once a
 * day is missed. Mirrors the server rule using the device's *local* date
 * (last_workout_date is stored as the user's local date): a streak survives if
 * the last activity was today or yesterday, otherwise it is broken.
 */
export function displayStreak(
  currentStreak: number,
  lastWorkoutDate: string | null
): number {
  if (!lastWorkoutDate) return 0;
  const now = new Date();
  const today = dateKey(now);
  const yesterday = dateKey(new Date(now.getTime() - 86_400_000));
  return lastWorkoutDate === today || lastWorkoutDate === yesterday
    ? currentStreak
    : 0;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

import { dateKey } from './format';
import { displayStreak } from './streak';
import type { NotificationSettings } from './notificationSettings';
import type { Profile } from './types';

const MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];
const LAST_MILESTONE_KEY = 'kova.notifications.lastMilestone.v1';
const HANDLER_REGISTERED = { value: false };

/** Streak-at-risk copy variants, picked by hashing the streak length so the
 *  message is stable for a given streak but varies as it grows. */
const STREAK_AT_RISK_TITLES = [
  "Don't let your streak die",
  'Your streak is on the line',
  'One more day. Keep it going.',
];

const STREAK_AT_RISK_BODIES = (n: number) => [
  `${n} days strong. Skip today and it resets to zero.`,
  `${n}-day streak. Lift today, even a short one, to keep it alive.`,
  `You've trained ${n} days running. Don't blink now.`,
];

const COMEBACK_TITLES = [
  'Ready for a comeback?',
  'Today is a good day to start again',
  "Let's get back to it",
];

const COMEBACK_BODIES = [
  'A short session today starts a new streak. No pressure to go hard.',
  'No streak is too small to begin. Open the app and log a set.',
  'The hardest part is the first rep. Start small.',
];

const DAILY_TITLES = [
  'Time to train',
  'Quick workout?',
  'Your move',
];

const DAILY_BODIES = [
  "Even 20 minutes counts. Let's go.",
  'Log a few sets and call it a day.',
  'Consistency beats intensity. Open the app.',
];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

/** Foreground handler: show banners even when the app is open. */
export function registerForegroundHandler() {
  if (HANDLER_REGISTERED.value) return;
  HANDLER_REGISTERED.value = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      // legacy fields for older runtimes
      shouldShowAlert: true,
    }),
  });
}

/** Ask the user for permission. Returns true if granted. */
export async function ensurePermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: false },
  });
  return result.granted;
}

export async function hasPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  return existing.granted;
}

/** Build the date the next time `hour:minute` lands, optionally skipping today. */
function nextOccurrence(hour: number, minute: number, fromDate: Date, skipToday = false): Date {
  const target = new Date(fromDate);
  target.setHours(hour, minute, 0, 0);
  if (skipToday || target.getTime() <= fromDate.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

async function scheduleAt(date: Date, title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date },
  });
}

/** Cancel all previously-scheduled notifications and rebuild from current
 *  profile + settings. Safe to call repeatedly. */
export async function schedule(
  profile: Profile | null,
  settings: NotificationSettings
): Promise<void> {
  // We are the only scheduler in the app, so a blanket cancel is fine.
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!settings.enabled || !profile) return;
  if (!(await hasPermission())) return;

  const now = new Date();
  const today = dateKey(now);
  const streak = displayStreak(profile.current_streak, profile.last_workout_date);
  const workedOutToday = profile.last_workout_date === today;
  const hour = settings.reminderHour;

  // 1. Streak-at-risk (only when streak alive AND not yet worked out today)
  if (streak > 0 && !workedOutToday) {
    const when = nextOccurrence(hour, 0, now, false);
    const seed = streak;
    await scheduleAt(
      when,
      pick(STREAK_AT_RISK_TITLES, seed),
      pick(STREAK_AT_RISK_BODIES(streak), seed)
    );
  }

  // 2. Comeback nudge: if they have ever worked out but the streak broke,
  //    ping them tomorrow morning.
  const lastWorkoutDays = daysSince(profile.last_workout_date, now);
  if (streak === 0 && lastWorkoutDays !== null && lastWorkoutDays >= 2) {
    const tomorrow9 = nextOccurrence(9, 0, now, true);
    const seed = lastWorkoutDays;
    await scheduleAt(
      tomorrow9,
      pick(COMEBACK_TITLES, seed),
      pick(COMEBACK_BODIES, seed)
    );
  }

  // 3. Daily reminders (intensity-driven). Schedule a rolling 7-day window;
  //    refreshed on workout finish and app foreground.
  const dailyDays = settings.intensity === 'pushy'
    ? [0, 1, 2, 3, 4, 5, 6]
    : settings.intensity === 'balanced'
      ? [1, 3, 5] // Mon, Wed, Fri (local week)
      : [];

  if (dailyDays.length > 0) {
    for (let offset = 0; offset < 7; offset++) {
      const day = new Date(now);
      day.setDate(day.getDate() + offset);
      day.setHours(hour, 0, 0, 0);
      if (day.getTime() <= now.getTime()) continue;
      if (!dailyDays.includes(day.getDay())) continue;
      // Skip today if they already worked out
      if (offset === 0 && workedOutToday) continue;
      // Don't double up with the streak-at-risk notif at the same hour today
      if (offset === 0 && streak > 0 && !workedOutToday) continue;
      const seed = day.getDate() + day.getMonth() * 31;
      await scheduleAt(day, pick(DAILY_TITLES, seed), pick(DAILY_BODIES, seed));
    }
  }
}

function daysSince(dateStr: string | null, now: Date): number | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const past = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - past.getTime()) / 86_400_000);
}

/** Fire a one-off milestone celebration if the streak just crossed a
 *  threshold we haven't celebrated yet. Idempotent: tracks last-fired
 *  milestone in AsyncStorage. */
export async function fireMilestoneIfDue(streak: number): Promise<void> {
  if (!MILESTONES.includes(streak)) return;
  if (!(await hasPermission())) return;
  const lastRaw = await AsyncStorage.getItem(LAST_MILESTONE_KEY);
  const last = lastRaw ? Number(lastRaw) : 0;
  if (streak <= last) return;
  await AsyncStorage.setItem(LAST_MILESTONE_KEY, String(streak));
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${streak}-day streak!`,
      body: milestoneBody(streak),
    },
    trigger: null,
  });
}

function milestoneBody(streak: number): string {
  if (streak >= 365) return 'A full year of showing up. Unreal.';
  if (streak >= 100) return 'Triple digits. You are built different.';
  if (streak >= 60) return 'Two months straight. Keep stacking.';
  if (streak >= 30) return 'A whole month. Habit locked in.';
  if (streak >= 14) return 'Two weeks running. The grind is real.';
  if (streak >= 7) return 'A full week. Momentum is yours.';
  return 'Three in a row. Streak unlocked.';
}

/** Reset milestone tracker — call this when streak resets to 0 so future
 *  milestones can fire again. */
export async function resetMilestoneTracker(): Promise<void> {
  await AsyncStorage.removeItem(LAST_MILESTONE_KEY);
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Best-effort Android channel setup (no-op on iOS). */
export async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: undefined,
  });
}

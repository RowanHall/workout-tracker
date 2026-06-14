import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  cancelAll,
  ensureAndroidChannel,
  hasPermission,
  registerForegroundHandler,
  schedule,
} from '@/lib/notifications';
import { loadSettings } from '@/lib/notificationSettings';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Headless component: keeps the device's local notification schedule in sync
 * with the current profile + saved preferences. Mount once inside the
 * authenticated routes.
 */
export function NotificationsManager() {
  const { profile, session } = useAuth();
  const lastProfileKey = useRef<string | null>(null);

  useEffect(() => {
    registerForegroundHandler();
    ensureAndroidChannel();
  }, []);

  // Reschedule whenever profile state that affects the schedule changes.
  useEffect(() => {
    if (!profile) return;
    const key = `${profile.id}:${profile.current_streak}:${profile.last_workout_date}`;
    if (lastProfileKey.current === key) return;
    lastProfileKey.current = key;
    (async () => {
      const settings = await loadSettings();
      await schedule(profile, settings);
    })();
  }, [profile?.id, profile?.current_streak, profile?.last_workout_date]);

  // On sign-out, clear everything.
  useEffect(() => {
    if (!session) {
      lastProfileKey.current = null;
      cancelAll();
    }
  }, [session]);

  // Re-sync when the app comes back to the foreground: permission may have
  // changed in Settings, or local-date may have rolled over.
  useEffect(() => {
    const handler = async (state: AppStateStatus) => {
      if (state !== 'active' || !profile) return;
      if (!(await hasPermission())) return;
      const settings = await loadSettings();
      await schedule(profile, settings);
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [profile]);

  return null;
}

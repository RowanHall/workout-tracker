import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReminderIntensity = 'gentle' | 'balanced' | 'pushy';

export interface NotificationSettings {
  enabled: boolean;
  intensity: ReminderIntensity;
  /** Hour of day (0-23, local time) for streak/daily reminders. */
  reminderHour: number;
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  intensity: 'gentle',
  reminderHour: 19,
};

const KEY = 'kova.notificationSettings.v1';

export async function loadSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: NotificationSettings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
}

import { Bell } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { ensurePermission, hasPermission, schedule } from '@/lib/notifications';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type NotificationSettings,
  type ReminderIntensity,
} from '@/lib/notificationSettings';
import { useAuth } from '@/providers/AuthProvider';
import { useLanguage } from '@/providers/LanguageProvider';

export default function NotificationsSettingsScreen() {
  const { profile } = useAuth();
  const { t } = useLanguage();

  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permGranted, setPermGranted] = useState(false);

  useEffect(() => {
    (async () => {
      setSettings(await loadSettings());
      setPermGranted(await hasPermission());
    })();
  }, []);

  const persist = useCallback(
    async (next: NotificationSettings) => {
      setSettings(next);
      await saveSettings(next);
      await schedule(profile, next);
    },
    [profile]
  );

  async function handleToggle(value: boolean) {
    if (value) {
      const granted = await ensurePermission();
      setPermGranted(granted);
      if (!granted) {
        Alert.alert(
          t('notifications.permission.title'),
          t('notifications.permission.body'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.openSettings'), onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }
    await persist({ ...settings, enabled: value });
  }

  const active = settings.enabled && permGranted;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5 pt-7">
        <View className="flex-row items-center py-3.5">
          <Bell size={18} color="#8B98A9" strokeWidth={1.75} />
          <View className="ml-3 flex-1">
            <Text className="text-[15px] font-semibold text-white">{t('notifications.streak.label')}</Text>
            <Text className="mt-0.5 text-xs text-muted">
              {permGranted
                ? t('notifications.streak.descOn')
                : t('notifications.streak.descOff')}
            </Text>
          </View>
          <Switch
            value={active}
            onValueChange={handleToggle}
            trackColor={{ false: '#2A3340', true: '#22C55E' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {active && (
        <>
          <View className="px-5 pt-7">
            <Text className="mb-3 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
              {t('notifications.intensity.label')}
            </Text>
            <View className="flex-row gap-2">
              {(['gentle', 'balanced', 'pushy'] as const).map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => persist({ ...settings, intensity: opt })}
                  className={`flex-1 rounded-xl px-3 py-2.5 ${
                    settings.intensity === opt
                      ? 'bg-primary'
                      : 'bg-surface-2'
                  }`}
                >
                  <Text
                    className={`text-center text-sm font-semibold capitalize ${
                      settings.intensity === opt ? 'text-background' : 'text-white'
                    }`}
                  >
                    {t(`notifications.intensity.${opt}` as const)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text className="mt-3 text-xs text-muted">
              {settings.intensity === 'gentle' && t('notifications.intensity.gentleDesc')}
              {settings.intensity === 'balanced' && t('notifications.intensity.balancedDesc')}
              {settings.intensity === 'pushy' && t('notifications.intensity.pushyDesc')}
            </Text>
          </View>

          <View className="px-5 pt-7">
            <Text className="mb-3 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
              {t('notifications.time.label')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {[6, 9, 12, 15, 17, 19, 21].map((hr) => (
                  <Pressable
                    key={hr}
                    onPress={() => persist({ ...settings, reminderHour: hr })}
                    className={`rounded-xl px-3.5 py-2 ${
                      settings.reminderHour === hr
                        ? 'bg-primary'
                        : 'bg-surface-2'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        settings.reminderHour === hr ? 'text-background' : 'text-white'
                      }`}
                    >
                      {formatHour(hr)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function formatHour(hour: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${period}`;
}

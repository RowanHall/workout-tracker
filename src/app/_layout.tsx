import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { ActiveWorkoutSheet } from '@/components/ActiveWorkoutSheet';
import { blurHeaderOptions } from '@/lib/blurHeader';
import { ActiveWorkoutProvider } from '@/providers/ActiveWorkoutProvider';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { LanguageProvider, useLanguage } from '@/providers/LanguageProvider';
import { NotificationsManager } from '@/providers/NotificationsManager';
import { PremiumProvider } from '@/providers/PremiumProvider';

function RootNavigator() {
  const { session, profile, loading } = useAuth();
  const { t } = useLanguage();

  // While the session is set but the profile row hasn't come back yet, hold
  // on the spinner so we don't flash the tab bar before deciding whether to
  // route a brand-new user into onboarding.
  if (loading || (session && !profile)) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#22C55E" size="large" />
      </View>
    );
  }

  const needsOnboarding = !!session && !!profile && !profile.onboarding_completed_at;

  return (
    <>
      {session && <NotificationsManager />}
      <Stack
        screenOptions={{
          headerShown: false,
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#0B0F14' },
        }}
      >
        <Stack.Protected guard={needsOnboarding}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={!!session && !needsOnboarding}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="people"
          options={{
            presentation: 'modal',
            ...blurHeaderOptions,
            title: 'Find Friends',
          }}
        />
        <Stack.Screen
          name="workout/[id]"
          options={{
            ...blurHeaderOptions,
            title: 'Workout',
          }}
        />
        <Stack.Screen
          name="routine/[id]"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="paywall"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="settings/index"
          options={{
            ...blurHeaderOptions,
            title: t('settings.title'),
          }}
        />
        <Stack.Screen
          name="settings/language"
          options={{
            ...blurHeaderOptions,
            title: t('language.title'),
          }}
        />
        <Stack.Screen
          name="settings/profile"
          options={{
            ...blurHeaderOptions,
            title: 'Profile',
          }}
        />
        <Stack.Screen
          name="settings/account"
          options={{
            ...blurHeaderOptions,
            title: 'Account',
          }}
        />
        <Stack.Screen
          name="settings/notifications"
          options={{
            ...blurHeaderOptions,
            title: t('notifications.title'),
          }}
        />
        <Stack.Screen
          name="settings/membership"
          options={{
            ...blurHeaderOptions,
            title: 'Manage Membership',
          }}
        />
        <Stack.Screen
          name="settings/blocked"
          options={{
            ...blurHeaderOptions,
            title: 'Blocked Accounts',
          }}
        />
        <Stack.Screen
          name="history"
          options={{
            ...blurHeaderOptions,
            title: 'Workout History',
          }}
        />
        <Stack.Screen
          name="exercises"
          options={{
            ...blurHeaderOptions,
            title: 'Exercises',
          }}
        />
        <Stack.Screen
          name="stats"
          options={{
            ...blurHeaderOptions,
            title: 'Stats',
          }}
        />
        <Stack.Screen
          name="muscle-map"
          options={{
            ...blurHeaderOptions,
            title: 'Muscle Map',
          }}
        />
        <Stack.Screen
          name="muscle-distribution"
          options={{
            ...blurHeaderOptions,
            title: 'Muscle Distribution',
          }}
        />
        <Stack.Screen
          name="exercise/[id]"
          options={{
            ...blurHeaderOptions,
            title: 'Exercise',
          }}
        />
        <Stack.Screen
          name="user/[id]"
          options={{
            ...blurHeaderOptions,
            title: 'Profile',
          }}
        />
        <Stack.Screen
          name="connections"
          options={{
            ...blurHeaderOptions,
            title: 'Connections',
          }}
        />
        <Stack.Screen
          name="activity"
          options={{
            ...blurHeaderOptions,
            title: 'Activity',
          }}
        />
      </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      {/* Global active-workout pull-up sheet — floats over every screen so the
          workout can be dropped to the pill and resumed without leaving the
          current tab. */}
      {session && !needsOnboarding && <ActiveWorkoutSheet />}
    </>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <PremiumProvider>
          <ActiveWorkoutProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </ActiveWorkoutProvider>
        </PremiumProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

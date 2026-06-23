import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { NotificationsManager } from '@/providers/NotificationsManager';
import { PremiumProvider } from '@/providers/PremiumProvider';

function RootNavigator() {
  const { session, profile, loading } = useAuth();

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
          headerBackTitle: 'Back',
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
            headerShown: true,
            title: 'Find Friends',
            headerStyle: { backgroundColor: '#151B23' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="workout/[id]"
          options={{
            headerShown: true,
            title: 'Workout',
            headerStyle: { backgroundColor: '#151B23' },
            headerTintColor: '#FFFFFF',
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
            headerShown: true,
            title: 'Settings',
            headerStyle: { backgroundColor: '#151B23' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="settings/profile"
          options={{
            headerShown: true,
            title: 'Profile',
            headerStyle: { backgroundColor: '#151B23' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="settings/account"
          options={{
            headerShown: true,
            title: 'Account',
            headerStyle: { backgroundColor: '#151B23' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="settings/notifications"
          options={{
            headerShown: true,
            title: 'Notifications',
            headerStyle: { backgroundColor: '#151B23' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="settings/body-weight"
          options={{
            headerShown: true,
            title: 'Body Weight',
            headerStyle: { backgroundColor: '#151B23' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="settings/membership"
          options={{
            headerShown: true,
            title: 'Manage Membership',
            headerStyle: { backgroundColor: '#151B23' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="history"
          options={{
            headerShown: true,
            title: 'Workout History',
            headerStyle: { backgroundColor: '#151B23' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="exercises"
          options={{
            headerShown: true,
            title: 'Exercises',
            headerStyle: { backgroundColor: '#151B23' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="stats"
          options={{
            headerShown: true,
            title: 'Stats',
            headerStyle: { backgroundColor: '#151B23' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="muscle-map"
          options={{
            headerShown: true,
            title: 'Muscle Map',
            headerStyle: { backgroundColor: '#151B23' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="muscle-distribution"
          options={{
            headerShown: true,
            title: 'Muscle Distribution',
            headerStyle: { backgroundColor: '#151B23' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="exercise/[id]"
          options={{
            headerShown: true,
            title: 'Exercise',
            headerStyle: { backgroundColor: '#151B23' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <Stack.Screen
          name="user/[id]"
          options={{
            headerShown: true,
            title: 'Profile',
            headerStyle: { backgroundColor: '#151B23' },
            headerTintColor: '#FFFFFF',
          }}
        />
      </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PremiumProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </PremiumProvider>
    </AuthProvider>
  );
}

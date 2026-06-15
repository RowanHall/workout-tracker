import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { NotificationsManager } from '@/providers/NotificationsManager';
import { PremiumProvider } from '@/providers/PremiumProvider';

function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#22C55E" size="large" />
      </View>
    );
  }

  return (
    <>
      {session && <NotificationsManager />}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0B0F14' },
        }}
      >
        <Stack.Protected guard={!!session}>
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
          name="settings"
          options={{
            headerShown: true,
            title: 'Settings',
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

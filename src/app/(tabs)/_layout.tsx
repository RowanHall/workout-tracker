import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActiveWorkoutPill } from '@/components/ActiveWorkoutPill';
import {
  FLOATING_TAB_BAR_GAP,
  FLOATING_TAB_BAR_HEIGHT,
  FloatingTabBar,
} from '@/components/FloatingTabBar';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1">
      <Tabs
        // Render our own floating glass pill instead of the default opaque bar.
        // The pill hides itself while a workout is open on the workout screen.
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: 'Profile' }} />
        <Tabs.Screen name="workout" options={{ title: 'Workout' }} />
        <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
      </Tabs>

      {/* Floating resume-workout pill, pinned just above the floating tab bar.
          Hides itself on the workout screen. */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom:
            insets.bottom +
            FLOATING_TAB_BAR_GAP +
            FLOATING_TAB_BAR_HEIGHT +
            10,
        }}
      >
        <ActiveWorkoutPill />
      </View>
    </View>
  );
}

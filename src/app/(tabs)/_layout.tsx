import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActiveWorkoutPill } from '@/components/ActiveWorkoutPill';
import { NATIVE_TAB_BAR_HEIGHT } from '@/lib/tabBar';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1">
      {/* Native iOS tab bar — the system draws the liquid-glass bar and handles
          the selection bubble/indicator automatically. Green (primary) for the
          active tab's icon + label, muted grey for the rest. `iconColor` and
          `labelStyle` must use the `{ default, selected }` form — a flat value
          applies to both states and would override the green on the active tab. */}
      <NativeTabs
        tintColor="#22C55E"
        iconColor={{ default: '#8B98A9', selected: '#22C55E' }}
        labelStyle={{ default: { color: '#8B98A9' }, selected: { color: '#22C55E' } }}
      >
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: 'person', selected: 'person.fill' }} />
          <Label>Profile</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="workout">
          <Icon sf={{ default: 'dumbbell', selected: 'dumbbell.fill' }} />
          <Label>Workout</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="feed">
          <Icon sf={{ default: 'house', selected: 'house.fill' }} />
          <Label>Feed</Label>
        </NativeTabs.Trigger>
      </NativeTabs>

      {/* Floating resume-workout pill, pinned just above the native tab bar.
          Hides itself on the workout screen / when the sheet is pulled up. */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: insets.bottom + NATIVE_TAB_BAR_HEIGHT + 10,
        }}
      >
        <ActiveWorkoutPill />
      </View>
    </View>
  );
}

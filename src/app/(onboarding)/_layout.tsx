import { Stack } from 'expo-router';

import { OnboardingProvider } from '@/providers/OnboardingProvider';

// Without this, expo-router has no opinion on which screen to show when the
// (onboarding) group is entered via a guard switch and may land on whichever
// route file was last touched. Pinning `units` keeps the flow starting at
// step 1 every time and gives the back stack a defined floor.
export const unstable_settings = {
  initialRouteName: 'units',
};

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          contentStyle: { backgroundColor: '#0B0F14' },
        }}
      />
    </OnboardingProvider>
  );
}

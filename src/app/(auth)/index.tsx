import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KovaLogo } from '@/components/KovaLogo';
import { LegalDisclaimer } from '@/components/LegalDisclaimer';

export default function Welcome() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-background px-8"
      style={{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) }}
    >
      <View className="flex-1 items-center justify-center">
        <KovaLogo size={56} />
        <Text className="mt-4 max-w-[280px] text-center text-base leading-6 text-muted">
          A calm, fast workout tracker built for serious lifters.
        </Text>
      </View>

      <View className="gap-3">
        <Pressable
          className="items-center rounded-xl bg-primary py-4 active:opacity-80"
          onPress={() => router.push('/sign-up')}
        >
          <Text className="text-base font-bold text-background">Create Account</Text>
        </Pressable>
        <Pressable
          className="items-center rounded-xl bg-surface-2 py-4 active:opacity-70"
          onPress={() => router.push('/sign-in')}
        >
          <Text className="text-base font-semibold text-white">Log In</Text>
        </Pressable>

        <View className="mt-2 px-4">
          <LegalDisclaimer />
        </View>
      </View>
    </View>
  );
}

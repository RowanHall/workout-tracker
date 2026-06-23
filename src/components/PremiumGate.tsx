import { router } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { usePremium } from '@/providers/PremiumProvider';

/**
 * Wraps a Pro-only block of UI. If the user is Pro, renders `children`
 * straight through. Otherwise renders a faded teaser of the same content with
 * a lock badge + "Unlock with Pro" CTA overlaid — gives non-Pro users
 * a real glimpse of what's locked rather than an opaque box.
 */
export function PremiumGate({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { isPremium } = usePremium();

  if (isPremium) return <>{children}</>;

  return (
    <Pressable
      className="w-full active:opacity-90"
      onPress={() => router.push('/paywall')}
    >
      <View className="relative">
        <View className="opacity-30" pointerEvents="none">
          {children}
        </View>

        <View className="absolute inset-0 items-center justify-center px-6">
          <View className="items-center rounded-2xl bg-surface-2/95 px-5 py-4">
            <View className="mb-2 h-9 w-9 items-center justify-center rounded-full bg-accent/20">
              <Lock size={16} color="#F59E0B" strokeWidth={2} />
            </View>
            <Text className="text-center text-base font-bold text-white">{title}</Text>
            <Text className="mt-1 max-w-[260px] text-center text-xs text-muted">
              {description}
            </Text>
            <Text className="mt-3 text-sm font-semibold text-accent">
              Unlock with Pro →
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

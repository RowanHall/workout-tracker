import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PremiumContent } from '@/components/PremiumContent';

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background">
      <View
        className="absolute right-4 z-10"
        style={{ top: insets.top + 8 }}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-9 w-9 items-center justify-center rounded-full bg-surface-2 active:opacity-70"
          accessibilityLabel="Close"
        >
          <X size={18} color="#FFFFFF" strokeWidth={2.25} />
        </Pressable>
      </View>
      <PremiumContent paddingTop={insets.top + 24} />
    </View>
  );
}

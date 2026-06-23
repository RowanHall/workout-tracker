import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { KovaLogo } from '@/components/KovaLogo';
import { usePremium } from '@/providers/PremiumProvider';

const SUBSCRIPTION_URL = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
  default: 'https://apps.apple.com/account/subscriptions',
});

export default function ManageMembershipScreen() {
  const { isPremium, restore } = usePremium();
  const [restoring, setRestoring] = useState(false);

  async function handleRestore() {
    setRestoring(true);
    try {
      const ok = await restore();
      Alert.alert(
        ok ? 'Membership restored' : 'No purchases found',
        ok
          ? 'Your Kova Pro membership is now active on this device.'
          : 'We couldn’t find an active subscription on this account.'
      );
    } catch (err: any) {
      Alert.alert('Restore failed', err?.message ?? 'Please try again.');
    } finally {
      setRestoring(false);
    }
  }

  function handleManage() {
    Linking.openURL(SUBSCRIPTION_URL!);
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mx-5 mt-6 rounded-2xl bg-surface p-5">
        <Text className="text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
          Current plan
        </Text>
        <View className="mt-3 flex-row items-baseline">
          <KovaLogo size={22} style={{ color: '#FFFFFF' }} />
          <Text
            className="ml-2"
            style={{
              fontSize: 22,
              fontWeight: '700',
              letterSpacing: 1.5,
              color: isPremium ? '#F59E0B' : '#8B98A9',
              textTransform: 'uppercase',
            }}
          >
            {isPremium ? 'Pro' : 'Free'}
          </Text>
        </View>
        <Text className="mt-3 text-sm leading-5 text-muted">
          {isPremium
            ? 'You have full access to charts, unlimited routines, rest timer, custom exercises, and data export.'
            : 'Upgrade to unlock full charts, unlimited routines, the rest timer, custom exercises, and CSV export.'}
        </Text>
      </View>

      {!isPremium && (
        <View className="px-5 pt-5">
          <Pressable
            onPress={() => router.push('/paywall')}
            className="flex-row items-center justify-center rounded-full bg-surface-2 py-3.5 active:opacity-80"
          >
            <Text className="text-[15px] font-bold text-white">Upgrade to </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                letterSpacing: 1.5,
                color: '#F59E0B',
                textTransform: 'uppercase',
              }}
            >
              Pro
            </Text>
          </Pressable>
        </View>
      )}

      <View className="px-5 pt-7">
        <Text className="mb-3 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
          Membership
        </Text>
        <ActionRow
          label={isPremium ? 'Manage subscription' : 'Open subscriptions'}
          hint={Platform.OS === 'ios' ? 'App Store' : 'Google Play'}
          onPress={handleManage}
        />
        <ActionRow
          label={restoring ? 'Restoring…' : 'Restore purchases'}
          onPress={handleRestore}
          disabled={restoring}
          last
        />
      </View>
    </ScrollView>
  );
}

function ActionRow({
  label,
  hint,
  onPress,
  disabled,
  last,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center justify-between py-3.5 active:opacity-70 disabled:opacity-50 ${
        last ? '' : 'border-b border-white/5'
      }`}
    >
      <Text className="text-[15px] text-white">{label}</Text>
      {hint && <Text className="text-[13px] text-muted">{hint}</Text>}
    </Pressable>
  );
}

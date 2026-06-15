import { Check, Crown, Download, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';

import { usePremium } from '@/providers/PremiumProvider';

const PRIVACY_URL = 'https://rowanhall.github.io/workout-tracker/';
// Apple's standard EULA — required Terms of Use link for auto-renewing subs.
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

const PERKS = [
  {
    icon: Download,
    title: 'Export your data',
    body: 'Download every set you’ve logged as a CSV/Excel file — yours to keep.',
  },
  {
    icon: Sparkles,
    title: 'Early access to new features',
    body: 'New premium tools land here first as Kova grows.',
  },
  {
    icon: Crown,
    title: 'Support Kova',
    body: 'You keep an independent app alive and ad-free.',
  },
];

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const { available, ready, isPremium, offering, purchase, restore } = usePremium();

  const packages = offering?.availablePackages ?? [];
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [busy, setBusy] = useState(false);

  // Default the selection to the best-value (annual) package when offerings load.
  const active =
    selected ??
    packages.find((p) => p.packageType === 'ANNUAL') ??
    packages[0] ??
    null;

  async function handleSubscribe() {
    if (!active) return;
    setBusy(true);
    try {
      const ok = await purchase(active);
      if (ok) Alert.alert('Welcome to Premium', 'Your Kova Premium features are unlocked.');
    } catch (err: any) {
      if (!err?.userCancelled) {
        Alert.alert('Purchase failed', err?.message ?? 'Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    setBusy(true);
    try {
      const ok = await restore();
      Alert.alert(
        ok ? 'Purchases restored' : 'Nothing to restore',
        ok ? 'Your Premium access is active.' : 'No previous Premium purchase was found.'
      );
    } catch (err: any) {
      Alert.alert('Restore failed', err?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 48 }}
      contentContainerClassName="px-6"
    >
      <View className="mb-6 items-center">
        <View className="mb-3 h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
          <Crown size={32} color="#22C55E" />
        </View>
        <Text className="text-2xl font-extrabold text-white">Kova Premium</Text>
        <Text className="mt-1 text-center text-base text-muted">
          {isPremium
            ? 'Thanks for going Premium 💪'
            : 'Unlock more from every workout.'}
        </Text>
      </View>

      <View className="mb-6 gap-3">
        {PERKS.map((perk) => (
          <View key={perk.title} className="flex-row gap-3 rounded-2xl bg-surface p-4">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <perk.icon size={20} color="#22C55E" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-white">{perk.title}</Text>
              <Text className="mt-0.5 text-sm text-muted">{perk.body}</Text>
            </View>
          </View>
        ))}
      </View>

      {isPremium ? (
        <View className="items-center rounded-2xl border border-primary/40 bg-primary/10 p-5">
          <Check size={28} color="#22C55E" />
          <Text className="mt-2 text-lg font-bold text-white">You’re Premium</Text>
          <Text className="mt-1 text-center text-sm text-muted">
            Export your data anytime from Settings → Data.
          </Text>
          <Pressable
            className="mt-4"
            onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
          >
            <Text className="text-sm font-semibold text-primary">Manage subscription</Text>
          </Pressable>
        </View>
      ) : !available ? (
        <View className="rounded-2xl border border-border bg-surface p-5">
          <Text className="text-center text-sm text-muted">
            Premium is available in the App Store version of Kova. Install a build from
            TestFlight or the App Store to subscribe.
          </Text>
        </View>
      ) : !ready ? (
        <ActivityIndicator color="#22C55E" />
      ) : packages.length === 0 ? (
        <View className="rounded-2xl border border-border bg-surface p-5">
          <Text className="text-center text-sm text-muted">
            Subscription options aren’t available right now. Please try again later.
          </Text>
        </View>
      ) : (
        <View>
          <View className="gap-3">
            {packages.map((pkg) => {
              const isActive = active?.identifier === pkg.identifier;
              return (
                <Pressable
                  key={pkg.identifier}
                  onPress={() => setSelected(pkg)}
                  className={`flex-row items-center justify-between rounded-2xl border p-4 ${
                    isActive ? 'border-primary bg-primary/10' : 'border-border bg-surface'
                  }`}
                >
                  <View>
                    <Text className="text-base font-semibold text-white">
                      {periodLabel(pkg)}
                    </Text>
                    {trialLabel(pkg) ? (
                      <Text className="mt-0.5 text-sm text-primary">{trialLabel(pkg)}</Text>
                    ) : null}
                  </View>
                  <View className="items-end">
                    <Text className="text-base font-bold text-white">
                      {pkg.product.priceString}
                    </Text>
                    {pkg.packageType === 'ANNUAL' ? (
                      <Text className="text-xs text-muted">Best value</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            className="mt-5 items-center rounded-xl bg-primary py-4 active:opacity-80 disabled:opacity-50"
            disabled={busy || !active}
            onPress={handleSubscribe}
          >
            {busy ? (
              <ActivityIndicator color="#0B0F14" />
            ) : (
              <Text className="text-base font-bold text-background">
                {active && trialLabel(active) ? 'Start free trial' : 'Subscribe'}
              </Text>
            )}
          </Pressable>

          <Pressable className="mt-4 items-center" disabled={busy} onPress={handleRestore}>
            <Text className="text-sm font-semibold text-muted">Restore purchases</Text>
          </Pressable>

          <Text className="mt-5 text-center text-xs leading-5 text-muted">
            Subscriptions renew automatically unless cancelled at least 24 hours before the
            period ends. Manage or cancel in your App Store account settings.
          </Text>
          <View className="mt-2 flex-row justify-center gap-4">
            <Text className="text-xs text-primary" onPress={() => Linking.openURL(TERMS_URL)}>
              Terms of Use
            </Text>
            <Text className="text-xs text-primary" onPress={() => Linking.openURL(PRIVACY_URL)}>
              Privacy Policy
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function periodLabel(pkg: PurchasesPackage): string {
  switch (pkg.packageType) {
    case 'ANNUAL':
      return 'Yearly';
    case 'MONTHLY':
      return 'Monthly';
    case 'WEEKLY':
      return 'Weekly';
    case 'LIFETIME':
      return 'Lifetime';
    default:
      return pkg.product.title || 'Subscription';
  }
}

/** "7-day free trial" style label derived from the product's intro offer. */
function trialLabel(pkg: PurchasesPackage): string | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const unit = intro.periodUnit.toLowerCase();
  return `${intro.periodNumberOfUnits}-${unit} free trial`;
}

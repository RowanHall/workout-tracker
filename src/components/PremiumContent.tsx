import { router } from 'expo-router';
import {
  Check,
  Download,
  Dumbbell,
  Heart,
  LineChart,
  Sparkles,
  Timer,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';

import { KovaLogo } from '@/components/KovaLogo';
import { usePremium } from '@/providers/PremiumProvider';

const PRIVACY_URL = 'https://rowanhall.github.io/workout-tracker/';
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

const ACCENT = '#F59E0B';

const FEATURES = [
  {
    icon: LineChart,
    title: 'Charts beyond 3 months',
    body: 'See months and years of progress — not just the last 12 weeks.',
  },
  {
    icon: Dumbbell,
    title: 'Unlimited routines',
    body: 'Save a plan for every training block instead of capping at 3.',
  },
  {
    icon: Timer,
    title: 'Integrated rest timer',
    body: 'Tuned rest periods kick in automatically after every set.',
  },
  {
    icon: Sparkles,
    title: 'Unlimited custom exercises',
    body: 'Build your own movements when the library doesn’t cover it.',
  },
  {
    icon: Download,
    title: 'Export your data',
    body: 'Download every set you’ve logged as a CSV/Excel file — yours to keep.',
  },
  {
    icon: Heart,
    title: 'Support a small team',
    body: 'Keep Kova independent, ad-free, and shipping new features.',
  },
];

const PLAN_ORDER = ['MONTHLY', 'ANNUAL', 'LIFETIME'] as const;

// Fallback shown when RevenueCat hasn't returned packages (e.g. Expo Go, no API key,
// or a dev build with no offering configured) so the layout always renders. Subscribe
// is disabled when these are the active option since they don't map to a real product.
const MOCK_PACKAGES = [
  {
    identifier: 'mock-monthly',
    packageType: 'MONTHLY',
    product: { priceString: '$4.99', price: 4.99 },
  },
  {
    identifier: 'mock-annual',
    packageType: 'ANNUAL',
    product: { priceString: '$39.99', price: 39.99 },
  },
  {
    identifier: 'mock-lifetime',
    packageType: 'LIFETIME',
    product: { priceString: '$99.99', price: 99.99 },
  },
] as unknown as PurchasesPackage[];

function isMockPackage(pkg: PurchasesPackage | null): boolean {
  return !!pkg && pkg.identifier.startsWith('mock-');
}

export function PremiumContent() {
  const insets = useSafeAreaInsets();
  const { available, ready, isPremium, offering, purchase, restore } = usePremium();

  const realPackages = offering?.availablePackages ?? [];
  const orderedReal = PLAN_ORDER
    .map((type) => realPackages.find((p) => p.packageType === type))
    .filter((p): p is PurchasesPackage => !!p);
  const sourcePackages = orderedReal.length > 0 ? orderedReal : realPackages;
  const displayPackages = sourcePackages.length > 0 ? sourcePackages : MOCK_PACKAGES;

  const annual = displayPackages.find((p) => p.packageType === 'ANNUAL');
  const monthly = displayPackages.find((p) => p.packageType === 'MONTHLY');

  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [busy, setBusy] = useState(false);

  const active = selected ?? annual ?? displayPackages[0] ?? null;
  const activeIsMock = isMockPackage(active);

  const savePct =
    annual && monthly && monthly.product.price > 0
      ? Math.round((1 - annual.product.price / (monthly.product.price * 12)) * 100)
      : null;

  async function handleSubscribe() {
    if (!active) return;
    if (activeIsMock) {
      Alert.alert(
        'Pro unavailable here',
        !available
          ? 'Pro is only purchasable in the App Store / TestFlight build of Kova.'
          : 'Subscription options aren’t available right now. Please try again later.'
      );
      return;
    }
    setBusy(true);
    try {
      const ok = await purchase(active);
      if (ok) Alert.alert('Welcome to Pro', 'Your Kova Pro features are unlocked.');
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
        ok ? 'Your Pro access is active.' : 'No previous Pro purchase was found.'
      );
    } catch (err: any) {
      Alert.alert('Restore failed', err?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 12 }} className="px-4 pb-4">
        <View className="relative h-9 flex-row items-center justify-center">
          <View className="flex-row items-baseline gap-2">
            <KovaLogo size={28} style={{ color: '#FFFFFF' }} />
            <Text
              style={{
                fontSize: 28,
                fontWeight: '900',
                fontStyle: 'italic',
                letterSpacing: -28 * 0.04,
                color: ACCENT,
              }}
            >
              Pro
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityLabel="Close"
            className="absolute right-0 h-9 w-9 items-center justify-center rounded-full bg-surface-2 active:opacity-70"
          >
            <X size={18} color="#FFFFFF" strokeWidth={2.25} />
          </Pressable>
        </View>
        <Text
          className="mt-5 text-center text-[28px] font-extrabold leading-9 text-white"
          style={{ letterSpacing: -0.5 }}
        >
          Get full access to Kova
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6">
          {FEATURES.map((feature, i) => (
            <View
              key={feature.title}
              className={`flex-row items-center gap-4 py-5 ${
                i > 0 ? 'border-t border-white/5' : ''
              }`}
            >
              <View className="h-16 w-16 items-center justify-center rounded-2xl border border-accent/15 bg-accent/10">
                <feature.icon size={26} color={ACCENT} strokeWidth={1.8} />
              </View>
              <View className="flex-1">
                <Text className="text-[17px] font-bold text-white">{feature.title}</Text>
                <Text className="mt-1 text-sm leading-5 text-muted">{feature.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View
        className="border-t border-white/5 bg-background px-4"
        style={{ paddingTop: 18, paddingBottom: insets.bottom + 12 }}
      >
        {isPremium ? (
          <PremiumFooter />
        ) : (
          <>
            <View className="flex-row gap-2.5 pt-2">
              {displayPackages.map((pkg) => (
                <PlanCard
                  key={pkg.identifier}
                  pkg={pkg}
                  isActive={active?.identifier === pkg.identifier}
                  savePct={pkg.packageType === 'ANNUAL' ? savePct : null}
                  onPress={() => setSelected(pkg)}
                />
              ))}
            </View>
            <Pressable
              className="mt-4 items-center rounded-2xl bg-accent py-4 active:opacity-80 disabled:opacity-50"
              disabled={busy || !active || !ready}
              onPress={handleSubscribe}
            >
              {busy || !ready ? (
                <ActivityIndicator color="#0B0F14" />
              ) : (
                <Text className="text-base font-extrabold text-background">
                  Subscribe to {periodLabel(active!)} plan
                </Text>
              )}
            </Pressable>
            <Pressable className="mt-3 items-center" disabled={busy} onPress={handleRestore}>
              <Text className="text-sm font-semibold text-muted">Restore purchases</Text>
            </Pressable>
            <Text className="mt-3 text-center text-[11px] leading-4 text-muted">
              Cancel anytime in your App Store account.{' '}
              <Text className="underline" onPress={() => Linking.openURL(TERMS_URL)}>
                Terms
              </Text>
              {' · '}
              <Text className="underline" onPress={() => Linking.openURL(PRIVACY_URL)}>
                Privacy
              </Text>
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

function PremiumFooter() {
  return (
    <View className="items-center py-2">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-accent/15">
        <Check size={24} color={ACCENT} strokeWidth={2.5} />
      </View>
      <Text className="text-lg font-bold text-white">You’re Pro</Text>
      <Text className="mt-1 text-center text-sm text-muted">
        Manage or cancel anytime from your App Store account.
      </Text>
      <Pressable
        className="mt-3"
        onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
      >
        <Text className="text-sm font-semibold text-accent">Manage subscription →</Text>
      </Pressable>
    </View>
  );
}

function PlanCard({
  pkg,
  isActive,
  savePct,
  onPress,
}: {
  pkg: PurchasesPackage;
  isActive: boolean;
  savePct: number | null;
  onPress: () => void;
}) {
  const showSave = savePct !== null && savePct > 0;
  return (
    <Pressable
      onPress={onPress}
      className={`relative flex-1 rounded-2xl border p-3.5 ${
        isActive ? 'border-accent bg-accent/10' : 'border-white/10 bg-surface'
      }`}
    >
      {showSave ? (
        <View
          className={`absolute -top-2.5 left-2 right-2 items-center rounded-md py-0.5 ${
            isActive ? 'bg-accent' : 'bg-accent/40'
          }`}
        >
          <Text className="text-[9px] font-extrabold uppercase tracking-[1.2px] text-background">
            Save {savePct}%
          </Text>
        </View>
      ) : null}
      <Text
        className={`text-center text-[11px] font-bold uppercase tracking-[1.5px] ${
          isActive ? 'text-accent' : 'text-muted'
        }`}
      >
        {periodLabel(pkg)}
      </Text>
      <Text
        className="mt-2 text-center text-lg font-extrabold text-white"
        style={{ fontVariant: ['tabular-nums'] }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {pkg.product.priceString}
      </Text>
      <Text className="mt-0.5 text-center text-[11px] text-muted">{billLabel(pkg)}</Text>
    </Pressable>
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

function billLabel(pkg: PurchasesPackage): string {
  switch (pkg.packageType) {
    case 'ANNUAL':
      return 'Billed annually';
    case 'MONTHLY':
      return 'Billed monthly';
    case 'WEEKLY':
      return 'Billed weekly';
    case 'LIFETIME':
      return 'Pay once';
    default:
      return '';
  }
}

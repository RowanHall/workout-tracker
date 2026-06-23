import {
  Check,
  Crown,
  Download,
  Dumbbell,
  Heart,
  LineChart,
  Sparkles,
  Timer,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { KovaLogo } from '@/components/KovaLogo';
import { ProBadge } from '@/components/ProBadge';
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

export function PremiumContent({
  paddingTop = 24,
  paddingBottom = 48,
}: {
  paddingTop?: number;
  paddingBottom?: number;
}) {
  const { available, ready, isPremium, offering, purchase, restore } = usePremium();

  const packages = offering?.availablePackages ?? [];
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [busy, setBusy] = useState(false);

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
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop, paddingBottom }}
      showsVerticalScrollIndicator={false}
    >
      <View className="items-center px-6 pb-10">
        <View className="relative mb-5 items-center justify-center">
          <View className="absolute h-28 w-28 rounded-full bg-accent/10" />
          <View className="h-20 w-20 items-center justify-center rounded-3xl border border-accent/30 bg-accent/15">
            <Crown size={36} color={ACCENT} strokeWidth={1.8} />
          </View>
        </View>
        <View className="flex-row items-center gap-2.5">
          <KovaLogo size={30} style={{ color: '#FFFFFF' }} />
          <ProBadge size="md" />
        </View>
        <Text className="mt-3 max-w-[280px] text-center text-base leading-6 text-muted">
          {isPremium
            ? 'Thanks for going Pro — every feature below is unlocked.'
            : 'Six upgrades that turn Kova into your full training system.'}
        </Text>
      </View>

      <View className="px-6">
        <Text className="mb-2 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
          What’s included
        </Text>
        <View>
          {FEATURES.map((feature, i) => (
            <View
              key={feature.title}
              className={`flex-row items-start gap-4 py-4 ${
                i > 0 ? 'border-t border-white/5' : ''
              }`}
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                <feature.icon size={20} color={ACCENT} strokeWidth={2} />
              </View>
              <View className="flex-1 pt-0.5">
                <Text className="text-[15px] font-semibold text-white">{feature.title}</Text>
                <Text className="mt-1 text-sm leading-5 text-muted">{feature.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="mt-8 px-6">
        {isPremium ? (
          <View className="items-center rounded-2xl border border-accent/40 bg-accent/10 p-6">
            <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-accent/20">
              <Check size={24} color={ACCENT} strokeWidth={2.5} />
            </View>
            <Text className="text-lg font-bold text-white">You’re Pro</Text>
            <Text className="mt-1 text-center text-sm text-muted">
              Manage or cancel anytime from your App Store account.
            </Text>
            <Pressable
              className="mt-4"
              onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
            >
              <Text className="text-sm font-semibold text-accent">Manage subscription →</Text>
            </Pressable>
          </View>
        ) : !available ? (
          <View className="rounded-2xl bg-surface p-5">
            <Text className="text-center text-sm leading-5 text-muted">
              Pro is available in the App Store version of Kova. Install a build from
              TestFlight or the App Store to subscribe.
            </Text>
          </View>
        ) : !ready ? (
          <View className="items-center py-6">
            <ActivityIndicator color={ACCENT} />
          </View>
        ) : packages.length === 0 ? (
          <View className="rounded-2xl bg-surface p-5">
            <Text className="text-center text-sm text-muted">
              Subscription options aren’t available right now. Please try again later.
            </Text>
          </View>
        ) : (
          <View>
            <View className="gap-3">
              {packages.map((pkg) => {
                const isActive = active?.identifier === pkg.identifier;
                const isAnnual = pkg.packageType === 'ANNUAL';
                return (
                  <Pressable
                    key={pkg.identifier}
                    onPress={() => setSelected(pkg)}
                    className={`relative flex-row items-center justify-between rounded-2xl border p-4 ${
                      isActive
                        ? 'border-accent bg-accent/10'
                        : 'border-white/10 bg-surface'
                    }`}
                  >
                    {isAnnual && (
                      <View className="absolute -top-2.5 right-4 rounded-md bg-accent px-2 py-0.5">
                        <Text className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-background">
                          Best value
                        </Text>
                      </View>
                    )}
                    <View className="flex-row items-center gap-3">
                      <View
                        className={`h-5 w-5 items-center justify-center rounded-full border ${
                          isActive ? 'border-accent bg-accent' : 'border-white/20'
                        }`}
                      >
                        {isActive && <Check size={12} color="#0B0F14" strokeWidth={3.5} />}
                      </View>
                      <View>
                        <Text className="text-base font-semibold text-white">
                          {periodLabel(pkg)}
                        </Text>
                        {trialLabel(pkg) ? (
                          <Text className="mt-0.5 text-sm text-accent">{trialLabel(pkg)}</Text>
                        ) : null}
                      </View>
                    </View>
                    <Text className="text-base font-bold text-white">
                      {pkg.product.priceString}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              className="mt-6 items-center rounded-xl bg-accent py-4 active:opacity-80 disabled:opacity-50"
              disabled={busy || !active}
              onPress={handleSubscribe}
            >
              {busy ? (
                <ActivityIndicator color="#0B0F14" />
              ) : (
                <Text className="text-base font-bold text-background">
                  {active && trialLabel(active) ? 'Start free trial' : 'Go Pro'}
                </Text>
              )}
            </Pressable>

            <Pressable className="mt-4 items-center" disabled={busy} onPress={handleRestore}>
              <Text className="text-sm font-semibold text-muted">Restore purchases</Text>
            </Pressable>

            <Text className="mt-6 text-center text-xs leading-5 text-muted">
              Subscriptions renew automatically unless cancelled at least 24 hours before the
              period ends. Manage or cancel in your App Store account settings.
            </Text>
            <View className="mt-2 flex-row justify-center gap-4">
              <Text className="text-xs text-muted underline" onPress={() => Linking.openURL(TERMS_URL)}>
                Terms of Use
              </Text>
              <Text className="text-xs text-muted underline" onPress={() => Linking.openURL(PRIVACY_URL)}>
                Privacy Policy
              </Text>
            </View>
          </View>
        )}
      </View>
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

function trialLabel(pkg: PurchasesPackage): string | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const unit = intro.periodUnit.toLowerCase();
  return `${intro.periodNumberOfUnits}-${unit} free trial`;
}

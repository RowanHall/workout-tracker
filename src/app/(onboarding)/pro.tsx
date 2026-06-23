import { router } from 'expo-router';
import {
  Check,
  Download,
  Dumbbell,
  Heart,
  LineChart,
  Sparkles,
  Timer,
} from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { KovaLogo } from '@/components/KovaLogo';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { usePremium } from '@/providers/PremiumProvider';

type Feature = {
  icon: typeof LineChart;
  title: string;
  body: ReactNode;
};

const FEATURES: Feature[] = [
  {
    icon: LineChart,
    title: 'Charts beyond 3 months',
    body: 'See months and years of progress, not just the last 12 weeks.',
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
    body: 'Download every set you’ve logged as CSV — yours to keep.',
  },
  {
    icon: Heart,
    title: 'Support a small team',
    body: (
      <>
        Keep <KovaLogo size={13} style={{ color: '#FFFFFF' }} /> independent,
        ad-free, and shipping new features.
      </>
    ),
  },
];

const SCREEN_W = Dimensions.get('window').width;
const BANNER_W = SCREEN_W - 48; // 24px horizontal padding each side

export default function ProStep() {
  const { available, ready, isPremium, offering, purchase } = usePremium();
  const packages = offering?.availablePackages ?? [];

  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [busy, setBusy] = useState(false);

  const active =
    selected ??
    packages.find((p) => p.packageType === 'ANNUAL') ??
    packages[0] ??
    null;

  function next() {
    router.push('/(onboarding)/referral');
  }

  async function handleSubscribe() {
    if (!active) {
      next();
      return;
    }
    setBusy(true);
    try {
      const ok = await purchase(active);
      if (ok) next();
    } catch (err: any) {
      if (!err?.userCancelled) {
        Alert.alert('Purchase failed', err?.message ?? 'Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  const showPurchase = available && ready && packages.length > 0 && !isPremium;

  return (
    <OnboardingLayout
      step={8}
      total={10}
      tone="accent"
      eyebrow={
        <>
          <KovaLogo size={11} style={{ color: '#FFFFFF' }} /> Pro
        </>
      }
      title="Unlock the full toolkit"
      subtitle={
        isPremium
          ? 'You’re already Pro. Carry on — every feature is unlocked.'
          : (
            <>
              Support a small team and turn{' '}
              <KovaLogo size={15} style={{ color: '#FFFFFF' }} /> into your full
              training system.
            </>
          )
      }
      primaryLabel={
        isPremium
          ? 'Continue'
          : showPurchase
            ? active && active.packageType === 'ANNUAL'
              ? 'Start with yearly'
              : 'Go Pro'
            : 'Continue'
      }
      primaryLoading={busy}
      onPrimary={isPremium || !showPurchase ? next : handleSubscribe}
      secondaryLabel={isPremium ? undefined : 'Maybe later'}
      onSecondary={next}
    >
      <View className="gap-6">
        <FeatureBanner />

        {showPurchase ? (
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
                        {isActive ? (
                          <Check size={12} color="#0B0F14" strokeWidth={3.5} />
                        ) : null}
                      </View>
                      <View>
                        <Text className="text-base font-semibold text-white">
                          {periodLabel(pkg)}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-base font-bold text-white">
                      {pkg.product.priceString}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          // Fallback: show a single static "Includes" summary when StoreKit
          // isn't available (Expo Go, no API key, etc.) so the screen still
          // reads as an offer rather than empty space.
          <View className="rounded-2xl bg-surface p-5">
            <Text className="text-[15px] font-semibold text-white">
              Everything in <KovaLogo size={15} style={{ color: '#FFFFFF' }} />{' '}
              <ProMark />
            </Text>
            <Text className="mt-2 text-sm leading-5 text-muted">
              Full charts, unlimited routines, rest timer, custom exercises, data
              export, and the satisfaction of supporting a small team.
            </Text>
          </View>
        )}
      </View>
    </OnboardingLayout>
  );
}

function ProMark() {
  return (
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

function FeatureBanner() {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      const next = (indexRef.current + 1) % FEATURES.length;
      indexRef.current = next;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * BANNER_W, animated: true });
    }, 3200);
    return () => clearInterval(id);
  }, []);

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / BANNER_W);
    indexRef.current = i;
    setIndex(i);
  }

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        decelerationRate="fast"
        snapToInterval={BANNER_W}
      >
        {FEATURES.map((f) => (
          <View
            key={f.title}
            style={{ width: BANNER_W }}
            className="pr-0"
          >
            <View className="mr-0 rounded-2xl border border-accent/20 bg-accent/5 p-5">
              <View className="mb-3 h-11 w-11 items-center justify-center rounded-xl bg-accent/20">
                <f.icon size={22} color="#F59E0B" strokeWidth={2} />
              </View>
              <Text className="text-[17px] font-bold text-white">{f.title}</Text>
              <Text className="mt-1 text-[13px] leading-5 text-muted">{f.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View className="mt-3 flex-row justify-center gap-1.5">
        {FEATURES.map((_, i) => (
          <View
            key={i}
            className={`h-1.5 rounded-full ${
              i === index ? 'w-5 bg-accent' : 'w-1.5 bg-white/15'
            }`}
          />
        ))}
      </View>
    </View>
  );
}

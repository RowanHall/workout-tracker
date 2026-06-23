import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  step: number;
  total: number;
  eyebrow?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  primaryLabel: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onBack?: () => void;
  tone?: 'primary' | 'accent';
  children: ReactNode;
}

export function OnboardingLayout({
  step,
  total,
  eyebrow,
  title,
  subtitle,
  primaryLabel,
  primaryDisabled,
  primaryLoading,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onBack,
  tone = 'primary',
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const showBack = step > 1;

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 8 }} className="px-5">
        <View className="h-9 flex-row items-center">
          {showBack ? (
            <Pressable
              hitSlop={12}
              className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
              onPress={() => (onBack ? onBack() : router.back())}
              accessibilityLabel="Go back"
            >
              <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.25} />
            </Pressable>
          ) : (
            <View className="h-9 w-9" />
          )}
          <View className="flex-1 px-3">
            <ProgressBar value={step} total={total} />
          </View>
          <View className="h-9 w-9" />
        </View>
      </View>

      <View className="flex-1 px-6 pt-6">
        {eyebrow ? (
          <Text
            className={`mb-3 text-[11px] font-bold uppercase tracking-[2.5px] ${
              tone === 'accent' ? 'text-accent' : 'text-primary'
            }`}
          >
            {eyebrow}
          </Text>
        ) : null}
        {title ? (
          <Text
            className="text-[28px] font-extrabold leading-9 text-white"
            style={{ letterSpacing: -0.6 }}
          >
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text className="mt-2 text-[15px] leading-6 text-muted">{subtitle}</Text>
        ) : null}

        <View className={`${title || subtitle || eyebrow ? 'mt-8' : ''} flex-1`}>
          {children}
        </View>
      </View>

      <View
        className="px-6"
        style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
      >
        <Pressable
          className={`items-center rounded-2xl py-4 active:opacity-80 disabled:opacity-40 ${
            tone === 'accent' ? 'bg-accent' : 'bg-primary'
          }`}
          disabled={primaryDisabled || primaryLoading}
          onPress={onPrimary}
        >
          {primaryLoading ? (
            <ActivityIndicator color="#0B0F14" />
          ) : (
            <Text className="text-base font-bold text-background">{primaryLabel}</Text>
          )}
        </Pressable>
        {secondaryLabel ? (
          <Pressable
            className="mt-3 items-center py-3 active:opacity-70"
            onPress={onSecondary}
          >
            <Text className="text-[15px] font-semibold text-muted">{secondaryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = Math.max(0, Math.min(1, value / total));
  return (
    <View className="h-1 overflow-hidden rounded-full bg-white/5">
      <View
        className="h-full rounded-full bg-primary"
        style={{ width: `${pct * 100}%` }}
      />
    </View>
  );
}

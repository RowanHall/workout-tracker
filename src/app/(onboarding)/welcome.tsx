import { router } from 'expo-router';
import { ChartLine, Dumbbell, Flame } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KovaLogo } from '@/components/KovaLogo';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { dateKey } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useOnboarding } from '@/providers/OnboardingProvider';

const FEATURE_ROWS = [
  {
    icon: Dumbbell,
    title: 'Log every set, fast',
    body: 'Inline editing, draft sets, and smart placeholders pulled from last session.',
  },
  {
    icon: ChartLine,
    title: 'Charts that matter',
    body: 'Volume, PRs, and muscle distribution at a glance.',
  },
  {
    icon: Flame,
    title: 'Stay consistent',
    body: 'Streaks, weekly check-ins, and friends keep the habit running.',
  },
];

export default function WelcomeStep() {
  const insets = useSafeAreaInsets();
  const { draft } = useOnboarding();
  const { session, refreshProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  async function finish() {
    const userId = session?.user.id;
    if (!userId) {
      Alert.alert('Not signed in', 'Please sign in again to continue.');
      return;
    }
    setSubmitting(true);
    try {
      const birthdayIso = draft.birthday
        ? `${draft.birthday.year}-${String(draft.birthday.month + 1).padStart(2, '0')}-${String(
            draft.birthday.day
          ).padStart(2, '0')}`
        : null;

      const { error } = await supabase
        .from('profiles')
        .update({
          preferred_unit: draft.weightUnit,
          distance_unit: draft.distanceUnit,
          gender: draft.gender,
          birthday: birthdayIso,
          height_cm: draft.heightCm,
          primary_goal: draft.goal,
          experience_level: draft.experience,
          referral_source: draft.referralSource,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', userId);
      if (error) throw error;

      if (draft.bodyWeight != null) {
        // The body_weights table stores lbs canonically.
        const lbs =
          draft.weightUnit === 'kg' ? draft.bodyWeight * 2.20462 : draft.bodyWeight;
        const rounded = Math.round(lbs * 10) / 10;
        await supabase.from('body_weights').upsert(
          {
            user_id: userId,
            recorded_on: dateKey(new Date()),
            weight: rounded,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,recorded_on' }
        );
      }

      await refreshProfile();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Could not save', err?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OnboardingLayout
      step={10}
      total={10}
      primaryLabel="Get started"
      primaryLoading={submitting}
      onPrimary={finish}
    >
      <View className="flex-1">
        <View className="items-center pt-2 pb-6">
          <Text
            className="text-center text-[28px] font-extrabold text-white"
            style={{ letterSpacing: -0.6 }}
          >
            Welcome to <KovaLogo size={28} style={{ color: '#FFFFFF' }} />
          </Text>
          <Text className="mt-2 max-w-[280px] text-center text-[15px] leading-6 text-muted">
            A calm, fast workout tracker built for serious lifters.
          </Text>
        </View>

        <View>
          {FEATURE_ROWS.map((row, i) => (
            <View
              key={row.title}
              className={`flex-row items-start gap-4 py-4 ${
                i > 0 ? 'border-t border-white/5' : ''
              }`}
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <row.icon size={20} color="#22C55E" strokeWidth={2} />
              </View>
              <View className="flex-1 pt-0.5">
                <Text className="text-[15px] font-semibold text-white">{row.title}</Text>
                <Text className="mt-1 text-sm leading-5 text-muted">{row.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={{ height: Math.max(insets.bottom, 0) }} />
    </OnboardingLayout>
  );
}

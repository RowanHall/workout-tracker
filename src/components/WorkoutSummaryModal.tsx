import { Medal } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { AnimatedExpBar } from '@/components/AnimatedExpBar';
import { formatVolume } from '@/lib/format';
import { useCountUp } from '@/hooks/useCountUp';
import { TIER_COLORS, tierLabel, trophyIcon } from '@/lib/trophies';
import type { WorkoutSummary } from '@/lib/types';

interface WorkoutSummaryModalProps {
  summary: WorkoutSummary | null;
  /** The user's total EXP before this workout, for the level-bar animation. */
  previousTotalExp: number;
  onClose: () => void;
}

export function WorkoutSummaryModal({
  summary,
  previousTotalExp,
  onClose,
}: WorkoutSummaryModalProps) {
  if (!summary) return null;
  return (
    <Modal visible transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/80 px-5">
        <View className="w-full rounded-3xl bg-surface p-6">
          <SummaryContent summary={summary} previousTotalExp={previousTotalExp} />
          <Animated.View entering={FadeIn.delay(2000)}>
            <Pressable
              className="items-center rounded-xl bg-primary py-3.5 active:opacity-80"
              onPress={onClose}
            >
              <Text className="font-bold text-background">Continue</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

function SummaryContent({
  summary,
  previousTotalExp,
}: {
  summary: WorkoutSummary;
  previousTotalExp: number;
}) {
  const exp = useCountUp(summary.exp_earned, 900, 600);
  // Reveal timeline (ms): header 0 → stats 200 → XP panel 400 (counter +
  // bar run 600-2000) → PRs 2000 → trophy tiers 2400.
  const prBase = 2000;
  const tierBase = prBase + summary.prs.length * 120 + 400;

  return (
    <ScrollView className="max-h-[520px]">
      <Animated.View entering={FadeInDown.duration(350)}>
        <Text className="mb-1 text-center text-xs font-bold uppercase tracking-[3px] text-muted">
          Workout Complete
        </Text>
        <Text className="mb-5 text-center text-2xl font-extrabold text-white">
          {summary.leveled_up ? 'Outstanding!' : 'Well Done!'}
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(200).duration(350)}
        className="mb-4 flex-row justify-around"
      >
        <SummaryStat label="Volume" value={formatVolume(summary.total_volume)} />
        <SummaryStat label="Sets" value={String(summary.total_sets)} />
        <SummaryStat label="Streak" value={`${summary.streak} day${summary.streak === 1 ? '' : 's'}`} />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(400).duration(350)}
        className="mb-4 rounded-2xl bg-surface-2 p-4"
      >
        <Text className="mb-2 text-center text-3xl font-extrabold text-primary">
          +{exp} EXP
        </Text>
        <AnimatedExpBar fromExp={previousTotalExp} gained={summary.exp_earned} />
      </Animated.View>

      {summary.prs.length > 0 && (
        <View className="mb-4">
          <Animated.Text
            entering={FadeIn.delay(prBase)}
            className="mb-2 font-bold text-white"
          >
            New Personal Records
          </Animated.Text>
          {summary.prs.map((pr, i) => (
            <Animated.View
              key={`${pr.exercise}-${pr.type}`}
              entering={FadeInDown.delay(prBase + i * 120).springify()}
              className="mb-1.5 flex-row items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2.5"
            >
              <Medal size={18} color="#F59E0B" strokeWidth={1.75} />
              <Text className="flex-1 text-white">{pr.exercise}</Text>
              <Text className="font-semibold text-accent">
                {pr.type === 'one_rep_max' ? 'est. 1RM' : 'set volume'}{' '}
                {Math.round(pr.value).toLocaleString()} lbs
              </Text>
            </Animated.View>
          ))}
        </View>
      )}

      {summary.new_tiers.length > 0 && (
        <View className="mb-4">
          <Animated.Text
            entering={FadeIn.delay(tierBase)}
            className="mb-2 font-bold text-white"
          >
            Trophy Tiers Reached
          </Animated.Text>
          {summary.new_tiers.map((t, i) => {
            const Icon = trophyIcon(t.icon);
            const color = TIER_COLORS[t.tier];
            return (
              <Animated.View
                key={`${t.key}-${t.tier}`}
                entering={ZoomIn.delay(tierBase + i * 200).springify()}
                className="mb-1.5 flex-row items-center gap-2.5 rounded-xl border bg-surface-2 px-3 py-2.5"
                style={{ borderColor: color }}
              >
                <Icon size={22} color={color} strokeWidth={1.75} />
                <Text className="flex-1 font-semibold text-white">{t.name}</Text>
                <Text className="text-sm font-bold" style={{ color }}>
                  {tierLabel(t.tier)}
                </Text>
              </Animated.View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center">
      <Text className="text-lg font-bold text-white">{value}</Text>
      <Text className="text-xs text-muted">{label}</Text>
    </View>
  );
}

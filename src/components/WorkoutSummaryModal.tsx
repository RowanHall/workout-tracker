import { Medal } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useCountUp } from '@/hooks/useCountUp';
import type { WorkoutSummary } from '@/lib/types';

interface WorkoutSummaryModalProps {
  summary: WorkoutSummary | null;
  onClose: () => void;
}

export function WorkoutSummaryModal({ summary, onClose }: WorkoutSummaryModalProps) {
  if (!summary) return null;
  return (
    <Modal visible transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/80 px-5">
        <View className="w-full rounded-3xl bg-surface p-6">
          <SummaryContent summary={summary} />
          <Animated.View entering={FadeIn.delay(1600)}>
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

function SummaryContent({ summary }: { summary: WorkoutSummary }) {
  const volume = useCountUp(summary.total_volume, 900, 500);
  // Reveal timeline (ms): header 0 → volume counter 300 (runs 500-1400) →
  // stats row 600 → PRs from 1400.
  const prBase = 1400;

  return (
    <ScrollView className="max-h-[520px]">
      <Animated.View entering={FadeInDown.duration(350)}>
        <Text className="mb-1 text-center text-xs font-bold uppercase tracking-[3px] text-muted">
          Workout Complete
        </Text>
        <Text className="mb-5 text-center text-2xl font-extrabold text-white">
          Well Done!
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).duration(350)}
        className="mb-4 rounded-2xl bg-surface-2 p-4"
      >
        <Text className="text-center text-3xl font-extrabold text-primary">
          {volume.toLocaleString()} lbs
        </Text>
        <Text className="text-center text-xs font-semibold uppercase tracking-widest text-muted">
          Total Volume
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(600).duration(350)}
        className="mb-4 flex-row justify-around"
      >
        <SummaryStat label="Sets" value={String(summary.total_sets)} />
        <SummaryStat
          label="Streak"
          value={`${summary.streak} day${summary.streak === 1 ? '' : 's'}`}
        />
        <SummaryStat
          label="PRs"
          value={String(summary.prs.length)}
          highlight={summary.prs.length > 0}
        />
      </Animated.View>

      {hasMuscleMap && (
        <Animated.View
          entering={FadeInDown.delay(1700).duration(400)}
          className="mb-4 rounded-2xl bg-surface-2 p-4"
        >
          <Text className="mb-1 text-center text-xs font-bold uppercase tracking-[2px] text-muted">
            Muscles Worked
          </Text>
          <MuscleMap activation={activation!} width={230} />
        </Animated.View>
      )}

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
    </ScrollView>
  );
}

function SummaryStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View className="items-center">
      <Text className={`text-2xl font-extrabold ${highlight ? 'text-accent' : 'text-white'}`}>
        {value}
      </Text>
      <Text className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </Text>
    </View>
  );
}

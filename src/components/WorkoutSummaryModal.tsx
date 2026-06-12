import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { formatVolume } from '@/lib/format';
import { TIER_COLORS, tierLabel, trophyIcon } from '@/lib/trophies';
import type { WorkoutSummary } from '@/lib/types';

interface WorkoutSummaryModalProps {
  summary: WorkoutSummary | null;
  onClose: () => void;
}

export function WorkoutSummaryModal({ summary, onClose }: WorkoutSummaryModalProps) {
  if (!summary) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/70 px-6">
        <View className="w-full rounded-3xl bg-surface p-6">
          <ScrollView className="max-h-[480px]">
            <Text className="mb-1 text-center text-4xl">💪</Text>
            <Text className="mb-4 text-center text-2xl font-bold text-white">
              Workout Complete!
            </Text>

            <View className="mb-4 items-center rounded-2xl bg-primary-dim/40 py-4">
              <Text className="text-4xl font-extrabold text-primary">
                +{summary.exp_earned} EXP
              </Text>
              {summary.leveled_up && (
                <Text className="mt-1 text-base font-bold text-accent">
                  ⬆️ Level up! You reached level {summary.new_level}
                </Text>
              )}
            </View>

            <View className="mb-4 flex-row justify-around">
              <SummaryStat label="Volume" value={formatVolume(summary.total_volume)} />
              <SummaryStat label="Sets" value={String(summary.total_sets)} />
              <SummaryStat label="Streak" value={`${summary.streak}🔥`} />
            </View>

            {summary.prs.length > 0 && (
              <View className="mb-4">
                <Text className="mb-2 font-bold text-white">New Personal Records</Text>
                {summary.prs.map((pr, i) => (
                  <View
                    key={i}
                    className="mb-1.5 flex-row justify-between rounded-xl bg-surface-2 px-3 py-2"
                  >
                    <Text className="text-white">🏅 {pr.exercise}</Text>
                    <Text className="font-semibold text-accent">
                      {pr.type === 'one_rep_max' ? 'est. 1RM' : 'set volume'}{' '}
                      {Math.round(pr.value).toLocaleString()} lbs
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {summary.new_tiers.length > 0 && (
              <View className="mb-4">
                <Text className="mb-2 font-bold text-white">Trophy Tiers Reached</Text>
                {summary.new_tiers.map((t) => {
                  const Icon = trophyIcon(t.icon);
                  const color = TIER_COLORS[t.tier];
                  return (
                    <View
                      key={`${t.key}-${t.tier}`}
                      className="mb-1.5 flex-row items-center gap-2.5 rounded-xl border bg-surface-2 px-3 py-2.5"
                      style={{ borderColor: color }}
                    >
                      <Icon size={22} color={color} strokeWidth={1.75} />
                      <Text className="flex-1 font-semibold text-white">{t.name}</Text>
                      <Text className="text-sm font-bold" style={{ color }}>
                        {tierLabel(t.tier)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <Pressable
            className="items-center rounded-xl bg-primary py-3.5 active:opacity-80"
            onPress={onClose}
          >
            <Text className="font-bold text-background">Nice!</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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

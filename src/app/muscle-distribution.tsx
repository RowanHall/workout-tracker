import { useFocusEffect } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PremiumGate } from '@/components/PremiumGate';
import { RadarChart, type RadarAxis } from '@/components/RadarChart';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { usePremium } from '@/providers/PremiumProvider';

type Range = 'week' | 'all';

const RADAR_GROUPS = ['Chest', 'Back', 'Delts', 'Arms', 'Legs', 'Core'] as const;
type RadarGroup = (typeof RADAR_GROUPS)[number];

const GROUP_TO_RADAR: Record<string, RadarGroup> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Delts',
  biceps: 'Arms',
  triceps: 'Arms',
  quads: 'Legs',
  hamstrings: 'Legs',
  glutes: 'Legs',
  calves: 'Legs',
  core: 'Core',
};

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  full_body: 'Full body',
};

interface SetRow {
  weight: number;
  reps: number;
  exercises: { muscle_group: string } | null;
  workouts: { ended_at: string } | null;
}

export default function MuscleDistributionScreen() {
  const { session } = useAuth();
  const { isPremium } = usePremium();
  const userId = session?.user.id;

  const [range, setRange] = useState<Range>('week');
  const [sets, setSets] = useState<SetRow[]>([]);
  const allTimeLocked = range === 'all' && !isPremium;

  const load = useCallback(async () => {
    if (!userId) return;
    const res = await supabase
      .from('workout_sets')
      .select('weight, reps, exercises (muscle_group), workouts!inner (user_id, ended_at)')
      .eq('workouts.user_id', userId)
      .not('workouts.ended_at', 'is', null);
    setSets((res.data ?? []) as unknown as SetRow[]);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const cutoff = range === 'week' ? Date.now() - 7 * 86_400_000 : 0;
  const filtered = sets.filter(
    (s) => s.workouts && new Date(s.workouts.ended_at).getTime() >= cutoff
  );

  const radarTotals = new Map<RadarGroup, number>(RADAR_GROUPS.map((g) => [g, 0]));
  const groupVolumes = new Map<string, number>();
  for (const s of filtered) {
    const group = s.exercises?.muscle_group;
    if (!group) continue;
    const volume = Number(s.weight) * s.reps;
    groupVolumes.set(group, (groupVolumes.get(group) ?? 0) + volume);
    const radar = GROUP_TO_RADAR[group];
    if (radar) radarTotals.set(radar, (radarTotals.get(radar) ?? 0) + volume);
  }
  const radarPeak = Math.max(...radarTotals.values());
  const data: RadarAxis[] = RADAR_GROUPS.map((label) => ({
    label,
    value: radarPeak === 0 ? 0 : (radarTotals.get(label) ?? 0) / radarPeak,
  }));

  const groupTotal = [...groupVolumes.values()].reduce((sum, v) => sum + v, 0);
  const breakdown = [...groupVolumes.entries()]
    .map(([group, volume]) => ({ group, pct: groupTotal === 0 ? 0 : (volume / groupTotal) * 100 }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <Section label="Range">
          <View className="flex-row gap-2 rounded-2xl bg-surface-2 p-1">
            <RangeTab label="Last 7 days" active={range === 'week'} onPress={() => setRange('week')} />
            <RangeTab
              label="All time"
              active={range === 'all'}
              onPress={() => setRange('all')}
              locked={!isPremium}
            />
          </View>
        </Section>

        <Section
          label="Distribution"
          eyebrowSuffix={range === 'week' ? 'last 7 days' : 'lifetime'}
        >
          {allTimeLocked ? (
            <PremiumGate
              title="Lifetime Distribution"
              description="See your training balance across your full lifting history."
            >
              <View className="rounded-2xl bg-surface p-6">
                <RadarChart data={data} />
              </View>
            </PremiumGate>
          ) : (
            <View className="rounded-2xl bg-surface p-6">
              {radarPeak > 0 ? (
                <RadarChart data={data} />
              ) : (
                <Text className="py-16 text-center text-sm text-muted">
                  No sets logged in this range yet.
                </Text>
              )}
            </View>
          )}
        </Section>

        {breakdown.length > 0 && !allTimeLocked && (
          <Section label="Breakdown" eyebrowSuffix="by volume">
            <View className="gap-3">
              {breakdown.map((row) => (
                <BarRow
                  key={row.group}
                  label={MUSCLE_LABELS[row.group] ?? row.group.replace('_', ' ')}
                  pct={row.pct}
                  width={(row.pct / breakdown[0].pct) * 100}
                />
              ))}
            </View>
          </Section>
        )}
      </ScrollView>
    </View>
  );
}

function RangeTab({
  label,
  active,
  onPress,
  locked,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  locked?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${active ? 'bg-primary' : ''}`}
    >
      <Text
        className={`text-[13px] font-semibold ${active ? 'text-background' : 'text-muted'}`}
      >
        {label}
      </Text>
      {locked && (
        <Lock size={11} color={active ? '#0B0F14' : '#8B98A9'} strokeWidth={2.5} />
      )}
    </Pressable>
  );
}

function Section({
  label,
  eyebrowSuffix,
  children,
}: {
  label: string;
  eyebrowSuffix?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="px-5 pt-7">
      <View className="mb-3 flex-row items-baseline justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
          {label}
        </Text>
        {eyebrowSuffix && (
          <Text className="text-[11px] font-medium uppercase tracking-[1.5px] text-muted/70">
            {eyebrowSuffix}
          </Text>
        )}
      </View>
      {children}
    </View>
  );
}

function BarRow({ label, pct, width }: { label: string; pct: number; width: number }) {
  return (
    <View>
      <View className="mb-1.5 flex-row items-baseline justify-between">
        <Text className="text-[13px] text-white">{label}</Text>
        <Text className="text-[13px] text-muted" style={{ fontVariant: ['tabular-nums'] }}>
          {pct.toFixed(0)}%
        </Text>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(3, Math.round(width))}%` }}
        />
      </View>
    </View>
  );
}

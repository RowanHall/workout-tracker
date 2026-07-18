import { router, useFocusEffect } from 'expo-router';
import { Check, ChevronDown, Lock } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { ProBadge } from '@/components/ProBadge';
import { RadarChart, type RadarAxis } from '@/components/RadarChart';
import { useHeaderInset } from '@/lib/blurHeader';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { usePremium } from '@/providers/PremiumProvider';

type Range = '7d' | '30d' | '3m' | '1y' | 'all';

const RANGE_LABELS: Record<Range, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '3m': 'Last 3 months',
  '1y': 'Last year',
  all: 'All time',
};
const RANGE_OPTIONS: Range[] = ['7d', '30d', '3m', '1y', 'all'];
const PREMIUM_RANGES: Range[] = ['1y', 'all'];

/** Epoch ms cutoff for a range; `0` means no cutoff (all time). */
function rangeCutoff(range: Range): number {
  const days: Record<Range, number> = { '7d': 7, '30d': 30, '3m': 90, '1y': 365, all: 0 };
  return days[range] === 0 ? 0 : Date.now() - days[range] * 86_400_000;
}

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
  const headerInset = useHeaderInset();

  const [range, setRange] = useState<Range>('7d');
  const [sets, setSets] = useState<SetRow[]>([]);

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

  const cutoff = rangeCutoff(range);
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
        contentContainerStyle={{ paddingTop: headerInset, paddingBottom: 48 }}
      >
        <View className="items-center px-5 pt-7">
          <RangeDropdown value={range} onChange={setRange} isPremium={isPremium} />
        </View>

        <View className="px-5 pt-4">
          <View className="rounded-2xl bg-background p-6">
            {radarPeak > 0 ? (
              <RadarChart data={data} />
            ) : (
              <Text className="py-16 text-center text-sm text-muted">
                No sets logged in this range yet.
              </Text>
            )}
          </View>
        </View>

        {breakdown.length > 0 && (
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

function RangeDropdown({
  value,
  onChange,
  isPremium,
}: {
  value: Range;
  onChange: (next: Range) => void;
  isPremium: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        className="flex-row items-center gap-1.5 rounded-full bg-surface-2 px-4 py-2 active:opacity-70"
      >
        <Text className="text-[13px] font-semibold text-white">{RANGE_LABELS[value]}</Text>
        <ChevronDown size={15} color="#8B98A9" strokeWidth={2.5} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/60 px-10"
          onPress={() => setOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-[280px] overflow-hidden rounded-2xl bg-surface"
          >
            <View className="border-b border-white/5 px-4 py-3">
              <Text className="text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
                Range
              </Text>
            </View>
            {RANGE_OPTIONS.map((opt) => {
              const selected = opt === value;
              const locked = !isPremium && PREMIUM_RANGES.includes(opt);
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    setOpen(false);
                    if (locked) {
                      router.push('/paywall');
                      return;
                    }
                    onChange(opt);
                  }}
                  className="flex-row items-center justify-between border-b border-white/5 px-4 py-3.5 active:opacity-70"
                >
                  <Text
                    className={`text-[15px] ${
                      selected ? 'font-bold text-primary' : locked ? 'text-muted' : 'text-white'
                    }`}
                  >
                    {RANGE_LABELS[opt]}
                  </Text>
                  {locked ? (
                    <View className="flex-row items-center gap-1.5">
                      <Lock size={12} color="#F59E0B" strokeWidth={2.5} />
                      <ProBadge />
                    </View>
                  ) : selected ? (
                    <Check size={16} color="#22C55E" strokeWidth={2.5} />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Section({
  label,
  eyebrowSuffix,
  children,
}: {
  label: string;
  eyebrowSuffix?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="px-5 pt-7">
      <View className="mb-3 flex-row items-baseline justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
          {label}
        </Text>
        {typeof eyebrowSuffix === 'string' ? (
          <Text className="text-[11px] font-medium uppercase tracking-[1.5px] text-muted/70">
            {eyebrowSuffix}
          </Text>
        ) : (
          eyebrowSuffix
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

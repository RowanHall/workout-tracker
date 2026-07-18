import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, Hexagon, PersonStanding } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { BodyWeightCard } from '@/components/BodyWeightCard';
import { RangePicker, type Range } from '@/components/RangePicker';
import {
  WeeklyVolumeChart,
  type VolumeGranularity,
  type WeekVolume,
} from '@/components/WeeklyVolumeChart';
import { useHeaderInset } from '@/lib/blurHeader';
import { formatVolume } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const MUSCLE_ROWS_SHOWN = 6;

const VOLUME_RANGE_LABEL: Record<Range, string> = {
  '3m': '12 weeks',
  '1y': '12 months',
  all: 'monthly',
};

interface SessionRow {
  total_volume: number;
  total_sets: number;
  started_at: string;
  ended_at: string;
}

interface SetRow {
  weight: number;
  reps: number;
  exercise_id: number;
  exercises: { name: string; muscle_group: string } | null;
  workouts: { ended_at: string } | null;
}

interface MuscleShare {
  group: string;
  pct: number;
}

interface BestLift {
  name: string;
  value: number;
}

interface Records {
  bestSessionVolume: number;
  heaviestSet: number;
  longestSessionMinutes: number;
  mostSetsInSession: number;
  favoriteExercise: string | null;
}

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

export default function StatsScreen() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const headerInset = useHeaderInset();

  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [allWorkouts, setAllWorkouts] = useState<SessionRow[]>([]);
  const [volumeRange, setVolumeRange] = useState<Range>('3m');
  const [bestLifts, setBestLifts] = useState<BestLift[]>([]);
  const [muscleSplit, setMuscleSplit] = useState<MuscleShare[]>([]);
  const [records, setRecords] = useState<Records | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;

    const [workoutsRes, setsRes, prsRes] = await Promise.all([
      supabase
        .from('workouts')
        .select('total_volume, total_sets, started_at, ended_at')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .order('ended_at', { ascending: true }),
      supabase
        .from('workout_sets')
        .select(
          'weight, reps, exercise_id, exercises (name, muscle_group), workouts!inner (user_id, ended_at)'
        )
        .eq('workouts.user_id', userId)
        .not('workouts.ended_at', 'is', null),
      supabase
        .from('personal_records')
        .select('value, exercises (name)')
        .eq('user_id', userId)
        .eq('record_type', 'one_rep_max')
        .order('value', { ascending: false })
        .limit(5),
    ]);

    const workouts = (workoutsRes.data ?? []) as SessionRow[];
    const sets = (setsRes.data ?? []) as unknown as SetRow[];

    setTotalWorkouts(workouts.length);

    const groupVolumes = new Map<string, number>();
    for (const s of sets) {
      const group = s.exercises?.muscle_group;
      if (!group) continue;
      groupVolumes.set(group, (groupVolumes.get(group) ?? 0) + Number(s.weight) * s.reps);
    }
    const groupTotal = [...groupVolumes.values()].reduce((sum, v) => sum + v, 0);
    setMuscleSplit(
      groupTotal === 0
        ? []
        : [...groupVolumes.entries()]
            .map(([group, volume]) => ({ group, pct: (volume / groupTotal) * 100 }))
            .sort((a, b) => b.pct - a.pct)
            .slice(0, MUSCLE_ROWS_SHOWN)
    );

    setAllWorkouts(workouts);

    setBestLifts(
      ((prsRes.data ?? []) as unknown as { value: number; exercises: { name: string } | null }[])
        .filter((pr) => pr.exercises)
        .map((pr) => ({ name: pr.exercises!.name, value: Number(pr.value) }))
    );

    const durations = workouts.map(
      (w) => (new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60000
    );
    const setCounts = new Map<string, number>();
    for (const s of sets) {
      if (!s.exercises) continue;
      setCounts.set(s.exercises.name, (setCounts.get(s.exercises.name) ?? 0) + 1);
    }
    const favoriteExercise = [...setCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    setRecords({
      bestSessionVolume: workouts.reduce((m, w) => Math.max(m, Number(w.total_volume)), 0),
      heaviestSet: sets.reduce((m, s) => Math.max(m, Number(s.weight)), 0),
      longestSessionMinutes: Math.round(durations.reduce((m, d) => Math.max(m, d), 0)),
      mostSetsInSession: workouts.reduce((m, w) => Math.max(m, w.total_sets), 0),
      favoriteExercise,
    });
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const volumeBuckets = useMemo<WeekVolume[]>(
    () => buildVolumeBuckets(allWorkouts, volumeRange),
    [allWorkouts, volumeRange]
  );
  const volumeGranularity: VolumeGranularity = volumeRange === '3m' ? 'week' : 'month';

  if (!profile) return null;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: headerInset, paddingBottom: 48 }}
      >
        <View className="px-5 pt-5">
          <BodyWeightCard userId={userId} />
        </View>

        <Hairline />

        <Section label="Activity">
          <ListRow
            label="Workout history"
            value={totalWorkouts > 0 ? totalWorkouts.toLocaleString() : null}
            onPress={() => router.push('/history')}
          />
        </Section>

        {records && totalWorkouts > 0 && (
          <Section label="Records">
            <ListRow label="Heaviest set" value={`${records.heaviestSet.toLocaleString()} lbs`} />
            <ListRow label="Biggest session" value={formatVolume(records.bestSessionVolume)} />
            <ListRow label="Longest session" value={formatMinutes(records.longestSessionMinutes)} />
            <ListRow label="Most sets in a session" value={String(records.mostSetsInSession)} />
            {profile.longest_streak > 0 && (
              <ListRow
                label="Longest streak"
                value={`${profile.longest_streak} day${profile.longest_streak === 1 ? '' : 's'}`}
              />
            )}
            {records.favoriteExercise && (
              <ListRow label="Favorite exercise" value={records.favoriteExercise} />
            )}
          </Section>
        )}

        {bestLifts.length > 0 && (
          <Section label="Top Lifts" eyebrowSuffix="est. 1RM">
            {bestLifts.map((lift) => (
              <ListRow
                key={lift.name}
                label={lift.name}
                value={`${Math.round(lift.value).toLocaleString()} lbs`}
                emphasis
              />
            ))}
          </Section>
        )}

        {totalWorkouts > 0 && (
          <View className="flex-row gap-3 px-5 pt-7">
            <NavButton
              label="Muscle Map"
              icon={<PersonStanding size={16} color="#FFFFFF" strokeWidth={2} />}
              onPress={() => router.push('/muscle-map')}
            />
            <NavButton
              label="Distribution"
              icon={<Hexagon size={16} color="#FFFFFF" strokeWidth={2} />}
              onPress={() => router.push('/muscle-distribution')}
            />
          </View>
        )}

        {muscleSplit.length > 0 && (
          <Section label="Muscle Split" eyebrowSuffix="lifetime volume">
            <View className="gap-3">
              {muscleSplit.map((share) => (
                <BarRow
                  key={share.group}
                  label={MUSCLE_LABELS[share.group] ?? share.group.replace('_', ' ')}
                  pct={share.pct}
                  width={(share.pct / muscleSplit[0].pct) * 100}
                />
              ))}
            </View>
          </Section>
        )}

        <Hairline />

        <Section
          label="Training Volume"
          eyebrowSuffix={
            <View className="flex-row items-center gap-2">
              <Text className="text-[11px] font-medium uppercase tracking-[1.5px] text-muted/70">
                {VOLUME_RANGE_LABEL[volumeRange]}
              </Text>
              <RangePicker value={volumeRange} onChange={setVolumeRange} />
            </View>
          }
        >
          <View className="pt-1">
            <WeeklyVolumeChart data={volumeBuckets} granularity={volumeGranularity} />
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

function Hairline() {
  return <View className="mx-5 my-4 h-px bg-white/5" />;
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

function ListRow({
  label,
  value,
  onPress,
  emphasis,
}: {
  label: string;
  value?: string | null;
  onPress?: () => void;
  emphasis?: boolean;
}) {
  const content = (
    <View className="flex-row items-center justify-between border-b border-white/5 py-3.5">
      <Text className="flex-1 pr-3 text-[15px] text-white" numberOfLines={1}>
        {label}
      </Text>
      {value && (
        <Text
          className={`text-[15px] ${emphasis ? 'font-bold text-primary' : 'font-semibold text-white'}`}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {value}
        </Text>
      )}
      {onPress && (
        <View className="ml-2">
          <ChevronRight size={16} color="#8B98A9" strokeWidth={2} />
        </View>
      )}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:opacity-70">
        {content}
      </Pressable>
    );
  }
  return content;
}

function NavButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center justify-between rounded-2xl bg-surface px-4 py-4 active:opacity-70"
    >
      <View className="flex-row items-center gap-2.5">
        {icon}
        <Text className="text-[15px] font-semibold text-white">{label}</Text>
      </View>
      <ChevronRight size={18} color="#8B98A9" strokeWidth={2} />
    </Pressable>
  );
}

function BarRow({
  label,
  pct,
  width,
}: {
  label: string;
  pct: number;
  width: number;
}) {
  return (
    <View>
      <View className="mb-1.5 flex-row items-baseline justify-between">
        <Text className="text-[13px] text-white">{label}</Text>
        <Text
          className="text-[13px] text-muted"
          style={{ fontVariant: ['tabular-nums'] }}
        >
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

function buildVolumeBuckets(workouts: SessionRow[], range: Range): WeekVolume[] {
  if (range === '3m') return buildWeeklyBuckets(workouts, 12);
  if (range === '1y') return buildMonthlyBuckets(workouts, 12);
  return buildAllTimeMonthlyBuckets(workouts);
}

function buildWeeklyBuckets(workouts: SessionRow[], weeks: number): WeekVolume[] {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  const buckets: WeekVolume[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(monday);
    start.setDate(monday.getDate() - i * 7);
    buckets.push({ weekStart: start, volume: 0 });
  }

  const firstStart = buckets[0].weekStart.getTime();
  for (const w of workouts) {
    const ended = new Date(w.ended_at);
    if (ended.getTime() < firstStart) continue;
    const index = Math.floor((ended.getTime() - firstStart) / (7 * 86_400_000));
    if (index >= 0 && index < buckets.length) {
      buckets[index].volume += Number(w.total_volume);
    }
  }
  return buckets;
}

function buildMonthlyBuckets(workouts: SessionRow[], months: number): WeekVolume[] {
  const now = new Date();
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const buckets: WeekVolume[] = [];
  for (let i = 0; i < months; i++) {
    buckets.push({
      weekStart: new Date(firstMonth.getFullYear(), firstMonth.getMonth() + i, 1),
      volume: 0,
    });
  }

  const firstTs = firstMonth.getTime();
  for (const w of workouts) {
    const ended = new Date(w.ended_at);
    if (ended.getTime() < firstTs) continue;
    const idx =
      (ended.getFullYear() - firstMonth.getFullYear()) * 12 +
      (ended.getMonth() - firstMonth.getMonth());
    if (idx >= 0 && idx < buckets.length) {
      buckets[idx].volume += Number(w.total_volume);
    }
  }
  return buckets;
}

function buildAllTimeMonthlyBuckets(workouts: SessionRow[]): WeekVolume[] {
  if (workouts.length === 0) return buildMonthlyBuckets(workouts, 12);
  const first = new Date(workouts[0].ended_at);
  const now = new Date();
  const months =
    (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth()) + 1;
  return buildMonthlyBuckets(workouts, Math.max(months, 1));
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}


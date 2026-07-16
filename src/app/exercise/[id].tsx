import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { LineChart, type LinePoint } from '@/components/LineChart';
import { NewExerciseModal } from '@/components/NewExerciseModal';
import { RangePicker, rangeCutoff, type Range } from '@/components/RangePicker';
import { formatVolume } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { estimatedOneRepMax } from '@/lib/strength';
import type { Exercise } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

interface SetRow {
  weight: number;
  reps: number;
  workouts: { id: string; ended_at: string } | null;
}

interface SessionStats {
  /** Workout end time in ms — the chart's x value. */
  t: number;
  e1rm: number;
  topWeight: number;
  volume: number;
  setCount: number;
  bestReps: number;
}

interface ExerciseData {
  name: string;
  muscleGroup: string;
  /** Full row, needed to prefill the edit modal for custom exercises. */
  record: Exercise;
  createdBy: string | null;
  predictedMax: number;
  recordedMax: number;
  sessions: SessionStats[];
}

type Metric = 'e1rm' | 'top' | 'volume';

const METRIC_OPTIONS: { id: Metric; label: string }[] = [
  { id: 'e1rm', label: 'Est. 1RM' },
  { id: 'top', label: 'Top Set' },
  { id: 'volume', label: 'Volume' },
];

const METRIC_SUBTITLE: Record<Metric, string> = {
  e1rm: 'best estimated 1RM per session',
  top: 'heaviest weight lifted per session',
  volume: 'total volume per session',
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
  full_body: 'Full Body',
};

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [data, setData] = useState<ExerciseData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [metric, setMetric] = useState<Metric>('e1rm');
  const [range, setRange] = useState<Range>('3m');
  const [editing, setEditing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id || !userId) return;
    let cancelled = false;

    async function load() {
      const [exerciseRes, setsRes, bwRes] = await Promise.all([
        supabase
          .from('exercises')
          .select('id, name, muscle_group, muscles, is_custom, is_bodyweight, created_by')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('workout_sets')
          .select('weight, reps, workouts!inner (id, ended_at, user_id)')
          .eq('exercise_id', id)
          .eq('workouts.user_id', userId!)
          .not('workouts.ended_at', 'is', null),
        supabase
          .from('body_weights')
          .select('weight')
          .eq('user_id', userId!)
          .order('recorded_on', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      const exercise = exerciseRes.data as
        | (Exercise & { created_by: string | null })
        | null;
      const sets = (setsRes.data ?? []) as unknown as SetRow[];
      // Bodyweight movements store only the added load; fold the user's
      // latest body weight into every set so the charts reflect real load.
      const bwOffset =
        exercise?.is_bodyweight && bwRes.data ? Number(bwRes.data.weight) : 0;

      if (!exercise) {
        setData(null);
        setLoaded(true);
        return;
      }

      const bySession = new Map<string, SessionStats>();
      let predictedMax = 0;
      let recordedMax = 0;
      for (const s of sets) {
        if (!s.workouts) continue;
        const weight = Number(s.weight) + bwOffset;
        const reps = s.reps;
        const e1rm = estimatedOneRepMax(weight, reps);
        const setVolume = weight * reps;
        predictedMax = Math.max(predictedMax, e1rm);
        recordedMax = Math.max(recordedMax, weight);
        const key = s.workouts.id;
        const t = new Date(s.workouts.ended_at).getTime();
        const existing = bySession.get(key);
        if (existing) {
          existing.e1rm = Math.max(existing.e1rm, e1rm);
          existing.topWeight = Math.max(existing.topWeight, weight);
          existing.volume += setVolume;
          existing.setCount += 1;
          existing.bestReps = Math.max(existing.bestReps, reps);
        } else {
          bySession.set(key, {
            t,
            e1rm,
            topWeight: weight,
            volume: setVolume,
            setCount: 1,
            bestReps: reps,
          });
        }
      }

      const sessions = [...bySession.values()].sort((a, b) => a.t - b.t);

      setData({
        name: exercise.name,
        muscleGroup: exercise.muscle_group,
        record: exercise,
        createdBy: exercise.created_by,
        predictedMax,
        recordedMax,
        sessions,
      });
      setLoaded(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, userId, reloadKey]);

  const filtered = useMemo(() => {
    if (!data) return [] as SessionStats[];
    const cutoff = rangeCutoff(range);
    if (!cutoff) return data.sessions;
    const min = cutoff.getTime();
    return data.sessions.filter((s) => s.t >= min);
  }, [data, range]);

  const trendSeries = useMemo<LinePoint[]>(
    () => filtered.map((s) => ({ t: s.t, y: metricValue(s, metric) })),
    [filtered, metric]
  );

  const { prSeries, prMarkers } = useMemo(() => {
    const series: LinePoint[] = [];
    const markers: number[] = [];
    let running = 0;
    filtered.forEach((s, i) => {
      if (s.e1rm > running) {
        markers.push(i);
        running = s.e1rm;
      }
      series.push({ t: s.t, y: running });
    });
    return { prSeries: series, prMarkers: markers };
  }, [filtered]);

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Stack.Screen options={{ title: 'Exercise' }} />
        <ActivityIndicator color="#22C55E" />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Stack.Screen options={{ title: 'Exercise' }} />
        <Text className="text-center text-muted">This exercise could not be found.</Text>
      </View>
    );
  }

  const canEdit = data.record.is_custom && data.createdBy === userId;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <Stack.Screen
        options={{
          title: data.name,
          headerRight: canEdit
            ? () => (
                <Pressable
                  hitSlop={10}
                  onPress={() => setEditing(true)}
                  className="active:opacity-60"
                >
                  <Text className="text-[15px] font-semibold text-primary">Edit</Text>
                </Pressable>
              )
            : undefined,
        }}
      />

      <View className="mb-1 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-white">{data.name}</Text>
          <Text className="mt-0.5 text-sm capitalize text-muted">
            {MUSCLE_LABELS[data.muscleGroup] ?? data.muscleGroup.replace('_', ' ')} ·{' '}
            {data.sessions.length} session{data.sessions.length === 1 ? '' : 's'}
          </Text>
        </View>
        <View className="pt-1">
          <RangePicker value={range} onChange={setRange} />
        </View>
      </View>

      <View className="mb-4 mt-4 flex-row gap-3">
        <MaxCard
          label="Predicted Max"
          sublabel="est. 1RM"
          value={Math.round(data.predictedMax)}
          color="text-primary"
        />
        <MaxCard
          label="Recorded Max"
          sublabel="heaviest lifted"
          value={Math.round(data.recordedMax)}
          color="text-white"
        />
      </View>

      <ChartCard
        title="Performance Trend"
        subtitle={trendSubtitle(filtered.length, metric)}
        header={<MetricSwitcher value={metric} onChange={setMetric} />}
      >
        {filtered.length === 0 ? (
          <EmptyChart />
        ) : (
          <LineChart
            data={trendSeries}
            color="#22C55E"
            formatLabel={metric === 'volume' ? formatVolumeShort : lbsLabel}
            formatXLabel={formatDateLabel}
          />
        )}
      </ChartCard>

      <ChartCard
        title="PR Progression"
        subtitle={
          prMarkers.length > 0
            ? `${prMarkers.length} PR${prMarkers.length === 1 ? '' : 's'} in this range`
            : 'all-time best 1RM as it stood'
        }
      >
        {filtered.length === 0 ? (
          <EmptyChart />
        ) : (
          <LineChart
            data={prSeries}
            color="#F59E0B"
            markers={prMarkers}
            markerColor="#FBBF24"
            formatLabel={lbsLabel}
            formatXLabel={formatDateLabel}
          />
        )}
      </ChartCard>

      {canEdit && (
        <NewExerciseModal
          visible={editing}
          userId={userId}
          exercise={data.record}
          onClose={() => setEditing(false)}
          onUpdated={() => setReloadKey((k) => k + 1)}
          onDeleted={() => router.back()}
        />
      )}
    </ScrollView>
  );
}

function metricValue(session: SessionStats, metric: Metric): number {
  if (metric === 'e1rm') return session.e1rm;
  if (metric === 'top') return session.topWeight;
  return session.volume;
}

function trendSubtitle(count: number, metric: Metric): string {
  if (count === 0) return METRIC_SUBTITLE[metric];
  return `${METRIC_SUBTITLE[metric]} · ${count} session${count === 1 ? '' : 's'}`;
}

function lbsLabel(v: number): string {
  return String(Math.round(v));
}

function formatVolumeShort(v: number): string {
  return formatVolume(v);
}

function formatDateLabel(t: number): string {
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function MetricSwitcher({
  value,
  onChange,
}: {
  value: Metric;
  onChange: (next: Metric) => void;
}) {
  return (
    <View className="flex-row rounded-full bg-surface-2 p-0.5">
      {METRIC_OPTIONS.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            className={`rounded-full px-3 py-1.5 ${active ? 'bg-primary' : ''}`}
          >
            <Text
              className={`text-[12px] font-semibold ${
                active ? 'text-background' : 'text-muted'
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MaxCard({
  label,
  sublabel,
  value,
  color,
}: {
  label: string;
  sublabel: string;
  value: number;
  color: string;
}) {
  return (
    <View className="flex-1 rounded-2xl bg-surface p-4">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </Text>
      <Text className={`mt-1 text-3xl font-extrabold ${color}`}>
        {value.toLocaleString()}
        <Text className="text-base font-bold text-muted"> lbs</Text>
      </Text>
      <Text className="mt-0.5 text-xs text-muted">{sublabel}</Text>
    </View>
  );
}

function ChartCard({
  title,
  subtitle,
  header,
  children,
}: {
  title: string;
  subtitle: string;
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4 rounded-2xl bg-surface p-4">
      <View className="mb-3 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-white">{title}</Text>
          <Text className="mt-0.5 text-xs text-muted">{subtitle}</Text>
        </View>
        {header}
      </View>
      {children}
    </View>
  );
}

function EmptyChart() {
  return (
    <View className="h-[150px] items-center justify-center">
      <Text className="text-center text-sm text-muted">
        No sessions in this range yet.
      </Text>
    </View>
  );
}

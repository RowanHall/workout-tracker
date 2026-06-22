import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { LineChart, type LinePoint } from '@/components/LineChart';
import { supabase } from '@/lib/supabase';
import { estimatedOneRepMax } from '@/lib/strength';
import { useAuth } from '@/providers/AuthProvider';

interface SetRow {
  weight: number;
  reps: number;
  workouts: { id: string; ended_at: string } | null;
}

interface SessionBest {
  /** Workout end time in ms, the chart's x value. */
  t: number;
  e1rm: number;
  topWeight: number;
}

interface ExerciseData {
  name: string;
  muscleGroup: string;
  predictedMax: number;
  recordedMax: number;
  e1rmSeries: LinePoint[];
  prSeries: LinePoint[];
  /** Indices into e1rmSeries where a new all-time best was set. */
  prMarkers: number[];
  sessions: number;
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
  full_body: 'Full Body',
};

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [data, setData] = useState<ExerciseData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id || !userId) return;
    let cancelled = false;

    async function load() {
      const [exerciseRes, setsRes] = await Promise.all([
        supabase.from('exercises').select('name, muscle_group').eq('id', id).maybeSingle(),
        supabase
          .from('workout_sets')
          .select('weight, reps, workouts!inner (id, ended_at, user_id)')
          .eq('exercise_id', id)
          .eq('workouts.user_id', userId!)
          .not('workouts.ended_at', 'is', null),
      ]);
      if (cancelled) return;

      const exercise = exerciseRes.data as { name: string; muscle_group: string } | null;
      const sets = (setsRes.data ?? []) as unknown as SetRow[];

      if (!exercise) {
        setData(null);
        setLoaded(true);
        return;
      }

      // Best estimated 1RM and heaviest weight per session.
      const bySession = new Map<string, SessionBest>();
      let predictedMax = 0;
      let recordedMax = 0;
      for (const s of sets) {
        if (!s.workouts) continue;
        const e1rm = estimatedOneRepMax(Number(s.weight), s.reps);
        predictedMax = Math.max(predictedMax, e1rm);
        recordedMax = Math.max(recordedMax, Number(s.weight));
        const key = s.workouts.id;
        const t = new Date(s.workouts.ended_at).getTime();
        const existing = bySession.get(key);
        if (existing) {
          existing.e1rm = Math.max(existing.e1rm, e1rm);
          existing.topWeight = Math.max(existing.topWeight, Number(s.weight));
        } else {
          bySession.set(key, { t, e1rm, topWeight: Number(s.weight) });
        }
      }

      const sessions = [...bySession.values()].sort((a, b) => a.t - b.t);
      const e1rmSeries: LinePoint[] = sessions.map((s) => ({ t: s.t, y: s.e1rm }));

      // PR progression + the indices where a *new* all-time best happened.
      const prSeries: LinePoint[] = [];
      const prMarkers: number[] = [];
      let running = 0;
      sessions.forEach((s, i) => {
        if (s.e1rm > running) {
          prMarkers.push(i);
          running = s.e1rm;
        }
        prSeries.push({ t: s.t, y: running });
      });

      setData({
        name: exercise.name,
        muscleGroup: exercise.muscle_group,
        predictedMax,
        recordedMax,
        e1rmSeries,
        prSeries,
        prMarkers,
        sessions: sessions.length,
      });
      setLoaded(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, userId]);

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

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <Stack.Screen options={{ title: data.name }} />

      <Text className="text-2xl font-extrabold text-white">{data.name}</Text>
      <Text className="mb-4 text-sm capitalize text-muted">
        {MUSCLE_LABELS[data.muscleGroup] ?? data.muscleGroup.replace('_', ' ')} ·{' '}
        {data.sessions} session{data.sessions === 1 ? '' : 's'}
      </Text>

      <View className="mb-4 flex-row gap-3">
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

      <E1rmChart series={data.e1rmSeries} markers={data.prMarkers} />

      <ChartCard title="PR Progression" subtitle="all-time best 1RM over time">
        <LineChart data={data.prSeries} color="#F59E0B" formatLabel={lbsLabel} />
      </ChartCard>
    </ScrollView>
  );
}

function E1rmChart({ series, markers }: { series: LinePoint[]; markers: number[] }) {
  const subtitle =
    markers.length > 0
      ? `best per session · ${markers.length} PR${markers.length === 1 ? '' : 's'} highlighted`
      : 'best per session';

  return (
    <ChartCard title="Estimated 1RM" subtitle={subtitle}>
      <LineChart
        data={series}
        color="#22C55E"
        markers={markers}
        markerColor="#FBBF24"
        formatLabel={lbsLabel}
      />
    </ChartCard>
  );
}

function lbsLabel(v: number): string {
  return String(Math.round(v));
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
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4 rounded-2xl bg-surface p-4">
      <Text className="text-base font-bold text-white">{title}</Text>
      <Text className="mb-3 text-xs text-muted">{subtitle}</Text>
      {children}
    </View>
  );
}

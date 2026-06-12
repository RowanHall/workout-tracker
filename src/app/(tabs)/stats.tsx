import { router, useFocusEffect } from 'expo-router';
import {
  ChevronRight,
  Dumbbell,
  Flame,
  History,
  Layers,
  Star,
  Timer,
  TrendingUp,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WeeklyVolumeChart, type WeekVolume } from '@/components/WeeklyVolumeChart';
import { formatVolume } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const WEEKS_SHOWN = 12;

interface SessionRow {
  total_volume: number;
  total_sets: number;
  started_at: string;
  ended_at: string;
}

interface SetRow {
  weight: number;
  reps: number;
  exercises: { name: string; muscle_group: string } | null;
}

interface Lifetime {
  workouts: number;
  volume: number;
  sets: number;
  reps: number;
  minutes: number;
}

interface Averages {
  volumePerSession: number;
  setsPerSession: number;
  minutesPerSession: number;
  sessionsPerWeek: number;
}

interface Records {
  bestSessionVolume: number;
  heaviestSet: number;
  longestSessionMinutes: number;
  mostSetsInSession: number;
  favoriteExercise: string | null;
}

interface RankedExercise {
  name: string;
  sets: number;
}

interface MuscleShare {
  group: string;
  pct: number;
}

interface BestLift {
  name: string;
  value: number;
}

export default function StatsScreen() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;

  const [lifetime, setLifetime] = useState<Lifetime | null>(null);
  const [averages, setAverages] = useState<Averages | null>(null);
  const [records, setRecords] = useState<Records | null>(null);
  const [weeklyVolume, setWeeklyVolume] = useState<WeekVolume[]>([]);
  const [topExercises, setTopExercises] = useState<RankedExercise[]>([]);
  const [muscleSplit, setMuscleSplit] = useState<MuscleShare[]>([]);
  const [bestLifts, setBestLifts] = useState<BestLift[]>([]);

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
        .select('weight, reps, exercises (name, muscle_group), workouts!inner (user_id, ended_at)')
        .eq('workouts.user_id', userId)
        .not('workouts.ended_at', 'is', null),
      supabase
        .from('personal_records')
        .select('value, exercises (name)')
        .eq('user_id', userId)
        .eq('record_type', 'one_rep_max')
        .order('value', { ascending: false })
        .limit(8),
    ]);

    const workouts = (workoutsRes.data ?? []) as SessionRow[];
    const sets = (setsRes.data ?? []) as unknown as SetRow[];

    const durations = workouts.map(
      (w) => (new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60000
    );
    const totalMinutes = durations.reduce((sum, m) => sum + m, 0);
    const totalVolume = workouts.reduce((sum, w) => sum + Number(w.total_volume), 0);
    const totalSets = workouts.reduce((sum, w) => sum + w.total_sets, 0);

    setLifetime({
      workouts: workouts.length,
      volume: totalVolume,
      sets: totalSets,
      reps: sets.reduce((sum, s) => sum + s.reps, 0),
      minutes: Math.round(totalMinutes),
    });

    if (workouts.length > 0) {
      const firstWorkout = new Date(workouts[0].ended_at);
      const weeksTraining = Math.max(
        1,
        (Date.now() - firstWorkout.getTime()) / (7 * 86_400_000)
      );
      setAverages({
        volumePerSession: totalVolume / workouts.length,
        setsPerSession: totalSets / workouts.length,
        minutesPerSession: totalMinutes / workouts.length,
        sessionsPerWeek: workouts.length / weeksTraining,
      });
    } else {
      setAverages(null);
    }

    const setCounts = new Map<string, number>();
    for (const s of sets) {
      if (!s.exercises) continue;
      setCounts.set(s.exercises.name, (setCounts.get(s.exercises.name) ?? 0) + 1);
    }
    const ranked = [...setCounts.entries()]
      .map(([name, count]) => ({ name, sets: count }))
      .sort((a, b) => b.sets - a.sets);
    setTopExercises(ranked.slice(0, 5));

    setRecords({
      bestSessionVolume: workouts.reduce((max, w) => Math.max(max, Number(w.total_volume)), 0),
      heaviestSet: sets.reduce((max, s) => Math.max(max, Number(s.weight)), 0),
      longestSessionMinutes: Math.round(durations.reduce((max, m) => Math.max(max, m), 0)),
      mostSetsInSession: workouts.reduce((max, w) => Math.max(max, w.total_sets), 0),
      favoriteExercise: ranked[0]?.name ?? null,
    });

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
    );

    setWeeklyVolume(buildWeeklyVolume(workouts));

    setBestLifts(
      ((prsRes.data ?? []) as unknown as { value: number; exercises: { name: string } | null }[])
        .filter((pr) => pr.exercises)
        .map((pr) => ({ name: pr.exercises!.name, value: Number(pr.value) }))
    );
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-4 pb-8">
        <Text className="py-3 text-2xl font-extrabold text-white">Stats</Text>

        {lifetime && (
          <View className="mb-4 flex-row flex-wrap justify-between gap-y-3">
            <StatTile label="Workouts" value={lifetime.workouts.toLocaleString()} />
            <StatTile label="Total Volume" value={formatVolume(lifetime.volume)} />
            <StatTile label="Sets Logged" value={lifetime.sets.toLocaleString()} />
            <StatTile label="Reps Performed" value={lifetime.reps.toLocaleString()} />
            <StatTile label="Time Training" value={formatMinutes(lifetime.minutes)} />
            <StatTile
              label="Best Session"
              value={records ? formatVolume(records.bestSessionVolume) : '—'}
            />
          </View>
        )}

        <Pressable
          className="mb-4 flex-row items-center gap-3 rounded-2xl bg-surface p-4 active:opacity-70"
          onPress={() => router.push('/history')}
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
            <History size={20} color="#22C55E" strokeWidth={1.75} />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-white">Workout History</Text>
            <Text className="text-xs text-muted">
              {lifetime && lifetime.workouts > 0
                ? `Browse all ${lifetime.workouts.toLocaleString()} workout${lifetime.workouts === 1 ? '' : 's'}`
                : 'Your past workouts will appear here'}
            </Text>
          </View>
          <ChevronRight size={18} color="#8B98A9" strokeWidth={2} />
        </Pressable>

        <SectionCard title={`Weekly Volume (${WEEKS_SHOWN} weeks)`}>
          <WeeklyVolumeChart data={weeklyVolume} />
        </SectionCard>

        {averages && (
          <SectionCard title="Per Session">
            <View className="flex-row flex-wrap justify-between gap-y-3">
              <MiniStat label="Avg volume" value={formatVolume(averages.volumePerSession)} />
              <MiniStat label="Avg sets" value={averages.setsPerSession.toFixed(1)} />
              <MiniStat label="Avg length" value={formatMinutes(Math.round(averages.minutesPerSession))} />
              <MiniStat label="Sessions / week" value={averages.sessionsPerWeek.toFixed(1)} />
            </View>
          </SectionCard>
        )}

        {records && lifetime && lifetime.workouts > 0 && (
          <SectionCard title="Records">
            {profile && profile.longest_streak > 0 && (
              <RecordRow
                icon={<Flame size={18} color="#F59E0B" strokeWidth={1.75} />}
                label="Longest streak"
                value={`${profile.longest_streak} day${profile.longest_streak === 1 ? '' : 's'}`}
              />
            )}
            <RecordRow
              icon={<TrendingUp size={18} color="#22C55E" strokeWidth={1.75} />}
              label="Biggest session"
              value={formatVolume(records.bestSessionVolume)}
            />
            <RecordRow
              icon={<Dumbbell size={18} color="#22C55E" strokeWidth={1.75} />}
              label="Heaviest set"
              value={`${records.heaviestSet.toLocaleString()} lbs`}
            />
            <RecordRow
              icon={<Timer size={18} color="#22C55E" strokeWidth={1.75} />}
              label="Longest session"
              value={formatMinutes(records.longestSessionMinutes)}
            />
            <RecordRow
              icon={<Layers size={18} color="#22C55E" strokeWidth={1.75} />}
              label="Most sets in a session"
              value={String(records.mostSetsInSession)}
            />
            {records.favoriteExercise && (
              <RecordRow
                icon={<Star size={18} color="#F59E0B" strokeWidth={1.75} />}
                label="Favorite exercise"
                value={records.favoriteExercise}
              />
            )}
          </SectionCard>
        )}

        {bestLifts.length > 0 && (
          <SectionCard
            title="Best Lifts"
            subtitle="est. 1RM"
          >
            {bestLifts.map((lift, i) => (
              <View
                key={lift.name}
                className="mb-1.5 flex-row items-center rounded-xl bg-surface-2 px-3 py-2.5"
              >
                <Text className="w-7 font-bold text-muted">#{i + 1}</Text>
                <Text className="flex-1 text-white">{lift.name}</Text>
                <Text className="font-bold text-primary">
                  {Math.round(lift.value).toLocaleString()} lbs
                </Text>
              </View>
            ))}
          </SectionCard>
        )}

        {topExercises.length > 0 && (
          <SectionCard title="Top Exercises" subtitle="by sets logged">
            {topExercises.map((exercise) => (
              <BarRow
                key={exercise.name}
                label={exercise.name}
                value={`${exercise.sets} sets`}
                pct={(exercise.sets / topExercises[0].sets) * 100}
                color="#22C55E"
              />
            ))}
          </SectionCard>
        )}

        {muscleSplit.length > 0 && (
          <SectionCard title="Muscle Split" subtitle="share of lifetime volume">
            {muscleSplit.map((share) => (
              <BarRow
                key={share.group}
                label={share.group.replace('_', ' ')}
                value={`${share.pct.toFixed(0)}%`}
                pct={(share.pct / muscleSplit[0].pct) * 100}
                color="#F59E0B"
                capitalize
              />
            ))}
          </SectionCard>
        )}

        {lifetime && lifetime.workouts === 0 && (
          <View className="mt-12 items-center px-8">
            <Text className="mb-1 text-lg font-bold text-white">No stats yet</Text>
            <Text className="text-center text-muted">
              Finish your first workout and this page comes alive.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Volume per Monday-anchored week for the last WEEKS_SHOWN weeks,
 *  zero-filled so the chart shows skipped weeks honestly. */
function buildWeeklyVolume(workouts: SessionRow[]): WeekVolume[] {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  const weeks: WeekVolume[] = [];
  for (let i = WEEKS_SHOWN - 1; i >= 0; i--) {
    const start = new Date(monday);
    start.setDate(monday.getDate() - i * 7);
    weeks.push({ weekStart: start, volume: 0 });
  }

  const firstStart = weeks[0].weekStart.getTime();
  for (const w of workouts) {
    const ended = new Date(w.ended_at);
    if (ended.getTime() < firstStart) continue;
    const index = Math.floor((ended.getTime() - firstStart) / (7 * 86_400_000));
    if (index >= 0 && index < weeks.length) {
      weeks[index].volume += Number(w.total_volume);
    }
  }
  return weeks;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-[48.5%] rounded-2xl bg-surface p-4">
      <Text className="text-xl font-extrabold text-white" numberOfLines={1}>
        {value}
      </Text>
      <Text className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-[48.5%] rounded-xl bg-surface-2 px-3 py-2.5">
      <Text className="text-base font-extrabold text-white" numberOfLines={1}>
        {value}
      </Text>
      <Text className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </Text>
    </View>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4 rounded-2xl bg-surface p-4">
      <Text className="mb-3 text-base font-bold text-white">
        {title}
        {subtitle && <Text className="text-xs font-normal text-muted">  {subtitle}</Text>}
      </Text>
      {children}
    </View>
  );
}

function RecordRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="mb-1.5 flex-row items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2.5">
      {icon}
      <Text className="flex-1 text-muted">{label}</Text>
      <Text className="font-semibold text-white">{value}</Text>
    </View>
  );
}

function BarRow({
  label,
  value,
  pct,
  color,
  capitalize,
}: {
  label: string;
  value: string;
  /** Bar width relative to the largest row, 0-100. */
  pct: number;
  color: string;
  capitalize?: boolean;
}) {
  return (
    <View className="mb-2.5">
      <View className="mb-1 flex-row justify-between">
        <Text className={`text-sm text-white ${capitalize ? 'capitalize' : ''}`}>{label}</Text>
        <Text className="text-sm text-muted">{value}</Text>
      </View>
      <View className="h-3 overflow-hidden rounded-full bg-surface-2">
        <View
          className="h-full rounded-full"
          style={{ width: `${Math.max(3, Math.round(pct))}%`, backgroundColor: color }}
        />
      </View>
    </View>
  );
}

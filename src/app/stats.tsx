import { router, useFocusEffect } from 'expo-router';
import {
  AlertTriangle,
  ChevronRight,
  Hexagon,
  Minus,
  PersonStanding,
  TrendingUp,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { BodyWeightCard } from '@/components/BodyWeightCard';
import { PremiumGate } from '@/components/PremiumGate';
import { WeeklyVolumeChart, type WeekVolume } from '@/components/WeeklyVolumeChart';
import { formatVolume } from '@/lib/format';
import { computeInsights, type Insights } from '@/lib/insights';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const WEEKS_SHOWN = 12;
const MUSCLE_ROWS_SHOWN = 6;

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

  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [weeklyVolume, setWeeklyVolume] = useState<WeekVolume[]>([]);
  const [bestLifts, setBestLifts] = useState<BestLift[]>([]);
  const [muscleSplit, setMuscleSplit] = useState<MuscleShare[]>([]);
  const [records, setRecords] = useState<Records | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);

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

    setWeeklyVolume(buildWeeklyVolume(workouts));

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

    setInsights(
      computeInsights(
        sets
          .filter((s) => s.exercises && s.workouts)
          .map((s) => ({
            weight: Number(s.weight),
            reps: s.reps,
            exerciseId: s.exercise_id,
            exerciseName: s.exercises!.name,
            muscleGroup: s.exercises!.muscle_group,
            endedAt: new Date(s.workouts!.ended_at).getTime(),
          }))
      )
    );
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!profile) return null;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
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

        <Section label="Weekly Volume" eyebrowSuffix={`${WEEKS_SHOWN} weeks`}>
          <View className="rounded-2xl bg-surface p-4">
            <WeeklyVolumeChart data={weeklyVolume} />
          </View>
        </Section>

        {insights && hasInsights(insights) && (
          <Section label="Coach Insights" eyebrowSuffix="Premium">
            <View className="rounded-2xl bg-surface p-4">
              <PremiumGate
                title="Smart Insights"
                description="Spot overdue muscles, stalled lifts, and hot streaks before they bite you."
              >
                <InsightsList insights={insights} />
              </PremiumGate>
            </View>
          </Section>
        )}
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

function InsightsList({ insights }: { insights: Insights }) {
  return (
    <View className="gap-2">
      {insights.overdue.slice(0, 3).map((item) => (
        <InsightRow
          key={`overdue-${item.muscleGroup}`}
          icon={<AlertTriangle size={18} color="#F59E0B" strokeWidth={2} />}
          title={`${MUSCLE_LABELS[item.muscleGroup] ?? item.muscleGroup.replace('_', ' ')} is overdue`}
          subtitle={`${item.daysSince} days since last session · usually every ${item.avgInterval}`}
        />
      ))}
      {insights.hotStreaks.map((item) => (
        <InsightRow
          key={`hot-${item.exerciseId}`}
          icon={<TrendingUp size={18} color="#22C55E" strokeWidth={2} />}
          title={item.exerciseName}
          subtitle={`+${Math.round(item.delta)} lbs e1RM in the last 2 weeks → ${Math.round(item.currentE1rm)} lbs`}
          onPress={() => router.push(`/exercise/${item.exerciseId}`)}
        />
      ))}
      {insights.plateaued.map((item) => (
        <InsightRow
          key={`plateau-${item.exerciseId}`}
          icon={<Minus size={18} color="#8B98A9" strokeWidth={2} />}
          title={item.exerciseName}
          subtitle={`Stalled at ${Math.round(item.currentE1rm)} lbs for ${item.weeksAgo}+ weeks — try a deload or rep change`}
          onPress={() => router.push(`/exercise/${item.exerciseId}`)}
        />
      ))}
    </View>
  );
}

function InsightRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  const content = (
    <View className="flex-row items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-surface">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-white" numberOfLines={1}>
          {title}
        </Text>
        <Text className="mt-0.5 text-xs text-muted" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      {onPress && <ChevronRight size={16} color="#8B98A9" strokeWidth={2} />}
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

function hasInsights(insights: Insights): boolean {
  return (
    insights.overdue.length > 0 ||
    insights.plateaued.length > 0 ||
    insights.hotStreaks.length > 0
  );
}

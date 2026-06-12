import { useFocusEffect } from 'expo-router';
import { Flame, Medal } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TrophyCard } from '@/components/TrophyCard';
import { formatVolume } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { TrophyDefinition, TrophyProgress } from '@/lib/trophies';
import { useAuth } from '@/providers/AuthProvider';

interface Lifetime {
  workouts: number;
  volume: number;
  sets: number;
  reps: number;
  minutes: number;
  bestSessionVolume: number;
}

interface BestLift {
  name: string;
  value: number;
}

export default function StatsScreen() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;

  const [lifetime, setLifetime] = useState<Lifetime | null>(null);
  const [bestLifts, setBestLifts] = useState<BestLift[]>([]);
  const [favoriteExercise, setFavoriteExercise] = useState<string | null>(null);
  const [definitions, setDefinitions] = useState<TrophyDefinition[]>([]);
  const [progressById, setProgressById] = useState<Map<string, TrophyProgress>>(new Map());

  const load = useCallback(async () => {
    if (!userId) return;
    const [workoutsRes, setsRes, prsRes, defsRes, progressRes] = await Promise.all([
      supabase
        .from('workouts')
        .select('total_volume, total_sets, started_at, ended_at')
        .eq('user_id', userId)
        .not('ended_at', 'is', null),
      supabase
        .from('workout_sets')
        .select('reps, exercises (name), workouts!inner (user_id, ended_at)')
        .eq('workouts.user_id', userId)
        .not('workouts.ended_at', 'is', null),
      supabase
        .from('personal_records')
        .select('value, exercises (name)')
        .eq('user_id', userId)
        .eq('record_type', 'one_rep_max')
        .order('value', { ascending: false })
        .limit(4),
      supabase.from('trophy_definitions').select('*').order('sort_order'),
      supabase
        .from('user_trophy_progress')
        .select('trophy_definition_id, current_raw_count, highest_tier_achieved')
        .eq('user_id', userId),
    ]);

    const workouts = (workoutsRes.data ?? []) as {
      total_volume: number;
      total_sets: number;
      started_at: string;
      ended_at: string;
    }[];
    const sets = (setsRes.data ?? []) as unknown as {
      reps: number;
      exercises: { name: string } | null;
    }[];

    const minutes = workouts.reduce(
      (sum, w) =>
        sum + (new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60000,
      0
    );
    setLifetime({
      workouts: workouts.length,
      volume: workouts.reduce((sum, w) => sum + Number(w.total_volume), 0),
      sets: workouts.reduce((sum, w) => sum + w.total_sets, 0),
      reps: sets.reduce((sum, s) => sum + s.reps, 0),
      minutes: Math.round(minutes),
      bestSessionVolume: workouts.reduce((max, w) => Math.max(max, Number(w.total_volume)), 0),
    });

    const setCounts = new Map<string, number>();
    for (const s of sets) {
      if (!s.exercises) continue;
      setCounts.set(s.exercises.name, (setCounts.get(s.exercises.name) ?? 0) + 1);
    }
    const favorite = [...setCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    setFavoriteExercise(favorite ? favorite[0] : null);

    setBestLifts(
      ((prsRes.data ?? []) as unknown as { value: number; exercises: { name: string } | null }[])
        .filter((pr) => pr.exercises)
        .map((pr) => ({ name: pr.exercises!.name, value: Number(pr.value) }))
    );

    setDefinitions((defsRes.data as TrophyDefinition[]) ?? []);
    setProgressById(
      new Map(
        ((progressRes.data as TrophyProgress[]) ?? []).map((p) => [
          p.trophy_definition_id,
          p,
        ])
      )
    );
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const tiersEarned = [...progressById.values()].reduce((sum, p) => {
    const order = ['none', 'bronze', 'silver', 'gold', 'platinum'];
    return sum + order.indexOf(p.highest_tier_achieved);
  }, 0);

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
            <StatTile label="Best Session" value={formatVolume(lifetime.bestSessionVolume)} />
          </View>
        )}

        {(favoriteExercise || (profile && profile.longest_streak > 0)) && (
          <View className="mb-4 rounded-2xl bg-surface p-4">
            <Text className="mb-3 text-base font-bold text-white">Records</Text>
            {profile && profile.longest_streak > 0 && (
              <RecordRow
                icon={<Flame size={18} color="#F59E0B" strokeWidth={1.75} />}
                label="Longest streak"
                value={`${profile.longest_streak} day${profile.longest_streak === 1 ? '' : 's'}`}
              />
            )}
            {favoriteExercise && (
              <RecordRow
                icon={<Medal size={18} color="#22C55E" strokeWidth={1.75} />}
                label="Favorite exercise"
                value={favoriteExercise}
              />
            )}
          </View>
        )}

        {bestLifts.length > 0 && (
          <View className="mb-4 rounded-2xl bg-surface p-4">
            <Text className="mb-3 text-base font-bold text-white">
              Best Lifts <Text className="text-xs font-normal text-muted">(est. 1RM)</Text>
            </Text>
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
          </View>
        )}

        <View className="mb-2 flex-row items-end justify-between">
          <Text className="text-base font-bold text-white">Trophies</Text>
          <Text className="text-xs text-muted">
            {tiersEarned} of {definitions.length * 4} tiers earned
          </Text>
        </View>
        <View className="flex-row flex-wrap justify-between">
          {definitions.map((definition) => (
            <View key={definition.id} className="mb-3 w-[48.5%]">
              <TrophyCard
                definition={definition}
                progress={progressById.get(definition.id) ?? null}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-[48.5%] rounded-2xl bg-surface p-4">
      <Text className="text-lg font-bold text-white" numberOfLines={1}>
        {value}
      </Text>
      <Text className="text-xs text-muted">{label}</Text>
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

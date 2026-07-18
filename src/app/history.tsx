import { router } from 'expo-router';
import { ChevronRight, Medal } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { useHeaderInset } from '@/lib/blurHeader';
import { formatDuration, formatVolume } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Workout } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

const PAGE_SIZE = 30;

interface HistoryWorkout extends Workout {
  workout_sets: { is_pr: boolean }[];
}

export default function HistoryScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const headerInset = useHeaderInset();

  const [workouts, setWorkouts] = useState<HistoryWorkout[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState(false);

  const loadPage = useCallback(
    async (offset: number) => {
      if (!userId) return [];
      const { data } = await supabase
        .from('workouts')
        .select('*, workout_sets (is_pr)')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .order('ended_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      return (data as unknown as HistoryWorkout[]) ?? [];
    },
    [userId]
  );

  useEffect(() => {
    if (!userId) return;
    loadPage(0).then((page) => {
      setWorkouts(page);
      setEndReached(page.length < PAGE_SIZE);
      setLoaded(true);
    });
  }, [userId, loadPage]);

  async function loadMore() {
    if (loadingMore || endReached || !loaded) return;
    setLoadingMore(true);
    const page = await loadPage(workouts.length);
    setWorkouts((prev) => [...prev, ...page]);
    setEndReached(page.length < PAGE_SIZE);
    setLoadingMore(false);
  }

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#22C55E" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerClassName="p-4 pb-8"
        contentContainerStyle={{ paddingTop: headerInset + 16 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => <HistoryRow workout={item} />}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color="#22C55E" className="py-4" />
          ) : null
        }
        ListEmptyComponent={
          <View className="mt-24 items-center px-8">
            <Text className="mb-1 text-lg font-bold text-white">No workouts yet</Text>
            <Text className="text-center text-muted">
              Your finished workouts will show up here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

function HistoryRow({ workout }: { workout: HistoryWorkout }) {
  const prCount = workout.workout_sets.filter((s) => s.is_pr).length;
  const ended = new Date(workout.ended_at!);

  return (
    <Pressable
      className="mb-2.5 flex-row items-center rounded-2xl bg-surface p-4 active:opacity-70"
      onPress={() => router.push(`/workout/${workout.id}`)}
    >
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-bold text-white">{workout.title}</Text>
          {prCount > 0 && (
            <View className="flex-row items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5">
              <Medal size={11} color="#F59E0B" strokeWidth={2} />
              <Text className="text-[11px] font-bold text-accent">{prCount}</Text>
            </View>
          )}
        </View>
        <Text className="mb-1.5 mt-0.5 text-xs text-muted">{formatDate(ended)}</Text>
        <Text className="text-sm text-muted">
          {formatVolume(workout.total_volume)} · {workout.total_sets} sets
          {workout.ended_at && ` · ${formatDuration(workout.started_at, workout.ended_at)}`}
        </Text>
      </View>
      <ChevronRight size={18} color="#8B98A9" strokeWidth={2} />
    </Pressable>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

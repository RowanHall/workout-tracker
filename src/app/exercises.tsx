import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { estimatedOneRepMax } from '@/lib/strength';
import { useAuth } from '@/providers/AuthProvider';

interface ExerciseStat {
  id: number;
  name: string;
  muscleGroup: string;
  sets: number;
  bestE1rm: number;
}

interface SetRow {
  weight: number;
  reps: number;
  exercise_id: number;
  exercises: { name: string; muscle_group: string } | null;
}

export default function ExercisesScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [exercises, setExercises] = useState<ExerciseStat[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('workout_sets')
      .select('weight, reps, exercise_id, exercises (name, muscle_group), workouts!inner (user_id, ended_at)')
      .eq('workouts.user_id', userId)
      .not('workouts.ended_at', 'is', null)
      .then(({ data }) => {
        if (cancelled) return;
        const byId = new Map<number, ExerciseStat>();
        for (const row of (data ?? []) as unknown as SetRow[]) {
          if (!row.exercises) continue;
          const e1rm = estimatedOneRepMax(Number(row.weight), row.reps);
          const existing = byId.get(row.exercise_id);
          if (existing) {
            existing.sets += 1;
            existing.bestE1rm = Math.max(existing.bestE1rm, e1rm);
          } else {
            byId.set(row.exercise_id, {
              id: row.exercise_id,
              name: row.exercises.name,
              muscleGroup: row.exercises.muscle_group,
              sets: 1,
              bestE1rm: e1rm,
            });
          }
        }
        // Favorites first: most sets logged, then alphabetical.
        setExercises(
          [...byId.values()].sort(
            (a, b) => b.sets - a.sets || a.name.localeCompare(b.name)
          )
        );
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises, search]);

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#22C55E" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {exercises.length > 0 && (
        <View className="px-4 pt-4">
          <TextInput
            className="rounded-xl border border-border bg-surface px-4 py-3 text-base text-white"
            placeholder="Search exercises…"
            placeholderTextColor="#8B98A9"
            autoCapitalize="none"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerClassName="p-4"
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            className="mb-2.5 flex-row items-center rounded-2xl bg-surface p-4 active:opacity-70"
            onPress={() => router.push(`/exercise/${item.id}`)}
          >
            <View className="flex-1">
              <Text className="font-bold text-white">{item.name}</Text>
              <Text className="mt-0.5 text-xs capitalize text-muted">
                {item.muscleGroup.replace('_', ' ')} · {item.sets} set{item.sets === 1 ? '' : 's'}
              </Text>
            </View>
            <Text className="mr-2 text-sm font-semibold text-primary">
              {Math.round(item.bestE1rm).toLocaleString()} lbs
            </Text>
            <ChevronRight size={18} color="#8B98A9" strokeWidth={2} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="mt-24 items-center px-8">
            <Text className="mb-1 text-lg font-bold text-white">
              {exercises.length === 0 ? 'No exercises yet' : 'No matches'}
            </Text>
            <Text className="text-center text-muted">
              {exercises.length === 0
                ? 'Log a workout and your exercises will show up here.'
                : 'Try a different search.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

import { router, Stack, useFocusEffect } from 'expo-router';
import { ChevronRight, Plus } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { NewExerciseModal } from '@/components/NewExerciseModal';
import { FREE_CUSTOM_EXERCISE_LIMIT } from '@/lib/limits';
import { matchesSearch } from '@/lib/search';
import { supabase } from '@/lib/supabase';
import { estimatedOneRepMax } from '@/lib/strength';
import type { Exercise, MuscleGroup } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { usePremium } from '@/providers/PremiumProvider';

// Canonical display order for the muscle-group filter chips.
const MUSCLE_GROUP_ORDER: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'full_body',
];

interface ExerciseRow {
  id: number;
  name: string;
  muscleGroup: string;
  isCustom: boolean;
  sets: number;
  bestE1rm: number;
}

interface SetRow {
  weight: number;
  reps: number;
  exercise_id: number;
}

export default function ExercisesScreen() {
  const { session } = useAuth();
  const { isPremium } = usePremium();
  const userId = session?.user.id;

  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'all'>('all');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;

    const [{ data: exercises }, { data: sets }] = await Promise.all([
      supabase
        .from('exercises')
        // Built-in library + the current user's own custom ones (RLS lets every
        // signed-in user read all exercises, but only the owner should see them).
        .select('id, name, muscle_group, is_custom, created_by')
        .or(`is_custom.eq.false,created_by.eq.${userId}`)
        .order('name'),
      supabase
        .from('workout_sets')
        .select('weight, reps, exercise_id, workouts!inner (user_id, ended_at)')
        .eq('workouts.user_id', userId)
        .not('workouts.ended_at', 'is', null),
    ]);

    const stats = new Map<number, { sets: number; bestE1rm: number }>();
    for (const row of (sets ?? []) as unknown as SetRow[]) {
      const e1rm = estimatedOneRepMax(Number(row.weight), row.reps);
      const existing = stats.get(row.exercise_id);
      if (existing) {
        existing.sets += 1;
        existing.bestE1rm = Math.max(existing.bestE1rm, e1rm);
      } else {
        stats.set(row.exercise_id, { sets: 1, bestE1rm: e1rm });
      }
    }

    const merged: ExerciseRow[] = (exercises ?? []).map((ex: any) => {
      const s = stats.get(ex.id);
      return {
        id: ex.id,
        name: ex.name,
        muscleGroup: ex.muscle_group,
        isCustom: !!ex.is_custom,
        sets: s?.sets ?? 0,
        bestE1rm: s?.bestE1rm ?? 0,
      };
    });
    // Used exercises bubble to the top by set count; everything else falls
    // through to alphabetical order.
    merged.sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name));
    setRows(merged);
    setLoaded(true);
  }, [userId]);

  // Refresh on focus so edits/deletes made on the detail screen show up
  // when navigating back.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Only surface chips for groups that actually have exercises, kept in the
  // canonical order above.
  const muscleGroups = useMemo(() => {
    const present = new Set(rows.map((r) => r.muscleGroup));
    return MUSCLE_GROUP_ORDER.filter((g) => present.has(g));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim();
    return rows.filter(
      (e) =>
        (muscleFilter === 'all' || e.muscleGroup === muscleFilter) &&
        (!q || matchesSearch(e.name, search))
    );
  }, [rows, search, muscleFilter]);

  function handleNewPress() {
    const customCount = rows.filter((r) => r.isCustom).length;
    if (!isPremium && customCount >= FREE_CUSTOM_EXERCISE_LIMIT) {
      Alert.alert(
        'Custom exercise limit reached',
        `Free accounts can create up to ${FREE_CUSTOM_EXERCISE_LIMIT} custom exercises. Upgrade to Kova Pro for unlimited.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Go Pro', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }
    setCreating(true);
  }

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Stack.Screen options={{ headerRight: () => null }} />
        <ActivityIndicator color="#22C55E" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              hitSlop={10}
              onPress={handleNewPress}
              className="active:opacity-60"
            >
              <Plus size={24} color="#F59E0B" strokeWidth={2.25} />
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerClassName="p-4"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          // Scrolls with the list rather than staying pinned.
          <View className="mb-4">
            <TextInput
              className="rounded-xl border border-border bg-surface px-4 py-3 text-base text-white"
              placeholder="Search exercises…"
              placeholderTextColor="#8B98A9"
              autoCapitalize="none"
              value={search}
              onChangeText={setSearch}
            />

            <View className="flex-row flex-wrap gap-2 pt-3">
              {(['all', ...muscleGroups] as const).map((group) => {
                const active = muscleFilter === group;
                return (
                  <Pressable
                    key={group}
                    onPress={() => setMuscleFilter(group)}
                    className={`rounded-full px-3.5 py-1.5 active:opacity-70 ${
                      active ? 'bg-primary' : 'bg-surface-2'
                    }`}
                  >
                    <Text
                      className={`text-[13px] font-semibold capitalize ${
                        active ? 'text-background' : 'text-muted'
                      }`}
                    >
                      {group === 'all' ? 'All' : group.replace('_', ' ')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const used = item.sets > 0;
          return (
            <Pressable
              className="mb-2.5 flex-row items-center rounded-2xl bg-surface p-4 active:opacity-70"
              onPress={() => router.push(`/exercise/${item.id}`)}
            >
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="font-bold text-white">{item.name}</Text>
                  {item.isCustom && (
                    <View className="rounded-md bg-accent/15 px-1.5 py-0.5">
                      <Text className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-accent">
                        Custom
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="mt-0.5 text-xs capitalize text-muted">
                  {item.muscleGroup.replace('_', ' ')}
                  {used && ` · ${item.sets} set${item.sets === 1 ? '' : 's'}`}
                </Text>
              </View>
              {used && (
                <Text className="mr-2 text-sm font-semibold text-primary">
                  {Math.round(item.bestE1rm).toLocaleString()} lbs
                </Text>
              )}
              <ChevronRight size={18} color="#8B98A9" strokeWidth={2} />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View className="mt-24 items-center px-8">
            <Text className="mb-1 text-lg font-bold text-white">No matches</Text>
            <Text className="text-center text-muted">Try a different search.</Text>
          </View>
        }
      />

      <NewExerciseModal
        visible={creating}
        userId={userId}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          load();
        }}
      />
    </View>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { matchesSearch } from '@/lib/search';
import { supabase } from '@/lib/supabase';
import type { Exercise, MuscleGroup } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

const MUSCLE_GROUPS: MuscleGroup[] = [
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

function label(group: MuscleGroup): string {
  return group === 'full_body' ? 'full body' : group;
}

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

export function ExercisePicker({ visible, onClose, onSelect }: ExercisePickerProps) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [setCounts, setSetCounts] = useState<Map<number, number>>(new Map());
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<MuscleGroup | null>(null);

  useEffect(() => {
    if (!visible || !userId) return;
    supabase
      .from('exercises')
      .select('*')
      // Built-in library + the current user's own custom ones (RLS lets every
      // signed-in user read all exercises, but only the owner should see them).
      .or(`is_custom.eq.false,created_by.eq.${userId}`)
      .order('name')
      .then(({ data }) => setExercises((data as Exercise[]) ?? []));
    supabase
      .from('workout_sets')
      .select('exercise_id, workouts!inner (user_id, ended_at)')
      .eq('workouts.user_id', userId)
      .not('workouts.ended_at', 'is', null)
      .then(({ data }) => {
        const counts = new Map<number, number>();
        for (const row of (data ?? []) as unknown as { exercise_id: number }[]) {
          counts.set(row.exercise_id, (counts.get(row.exercise_id) ?? 0) + 1);
        }
        setSetCounts(counts);
      });
  }, [visible, userId]);

  const filtered = useMemo(() => {
    const matches = exercises.filter(
      (ex) =>
        (!group || ex.muscle_group === group) &&
        (!search || matchesSearch(ex.name, search))
    );
    // Used exercises bubble to the top by set count; everything else falls
    // through to alphabetical order.
    return matches.sort(
      (a, b) =>
        (setCounts.get(b.id) ?? 0) - (setCounts.get(a.id) ?? 0) ||
        a.name.localeCompare(b.name)
    );
  }, [exercises, setCounts, search, group]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-background px-4 pt-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-white">Add Exercise</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text className="text-base font-semibold text-primary">Done</Text>
          </Pressable>
        </View>

        <TextInput
          className="mb-3 rounded-xl bg-surface-2 px-4 py-3 text-base text-white"
          placeholder="Search exercises…"
          placeholderTextColor="#8B98A9"
          value={search}
          onChangeText={setSearch}
        />

        <View className="mb-2 flex-row flex-wrap gap-2">
          {MUSCLE_GROUPS.map((mg) => {
            const active = group === mg;
            return (
              <Pressable
                key={mg}
                className={`rounded-full px-3.5 py-1.5 ${
                  active ? 'bg-primary' : 'bg-surface-2'
                }`}
                onPress={() => setGroup(active ? null : mg)}
              >
                <Text
                  className={`text-[13px] capitalize ${
                    active ? 'font-semibold text-background' : 'text-muted'
                  }`}
                >
                  {label(mg)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              className="flex-row items-center justify-between border-b border-white/5 py-3.5 active:opacity-70"
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <Text className="text-[15px] text-white">{item.name}</Text>
              <Text className="text-xs capitalize text-muted">
                {label(item.muscle_group)}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text className="mt-8 text-center text-muted">No exercises found</Text>
          }
        />
      </View>
    </Modal>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { matchesSearch } from '@/lib/search';
import { supabase } from '@/lib/supabase';
import type { Exercise, MuscleGroup } from '@/lib/types';

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
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<MuscleGroup | null>(null);

  useEffect(() => {
    if (!visible) return;
    supabase
      .from('exercises')
      .select('*')
      .order('name')
      .then(({ data }) => setExercises((data as Exercise[]) ?? []));
  }, [visible]);

  const filtered = useMemo(
    () =>
      exercises.filter(
        (ex) =>
          (!group || ex.muscle_group === group) &&
          (!search || matchesSearch(ex.name, search))
      ),
    [exercises, search, group]
  );

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
          className="mb-3 rounded-xl border border-border bg-surface px-4 py-3 text-base text-white"
          placeholder="Search exercises…"
          placeholderTextColor="#8B98A9"
          value={search}
          onChangeText={setSearch}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3 max-h-10"
          contentContainerClassName="gap-2"
        >
          {MUSCLE_GROUPS.map((mg) => (
            <Pressable
              key={mg}
              className={`rounded-full border px-3.5 py-1.5 ${
                group === mg ? 'border-primary bg-primary-dim' : 'border-border bg-surface'
              }`}
              onPress={() => setGroup(group === mg ? null : mg)}
            >
              <Text
                className={`text-sm capitalize ${
                  group === mg ? 'font-semibold text-white' : 'text-muted'
                }`}
              >
                {label(mg)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Pressable
              className="mb-2 flex-row items-center justify-between rounded-xl bg-surface px-4 py-3.5 active:opacity-70"
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <Text className="text-base font-medium text-white">{item.name}</Text>
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

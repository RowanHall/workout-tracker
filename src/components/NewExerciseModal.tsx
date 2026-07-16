import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import type { Exercise, ExerciseMuscle, MuscleGroup } from '@/lib/types';

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

/** Best-effort muscle activation for a brand-new custom exercise. We can't
 *  ask the user to map every synergist, so we seed the primary mover that
 *  corresponds to the chosen muscle group — enough to colour the muscle map. */
const DEFAULT_MUSCLES: Record<MuscleGroup, ExerciseMuscle[]> = {
  chest: [{ slug: 'chest', intensity: 2 }],
  back: [{ slug: 'upper-back', intensity: 2 }],
  shoulders: [{ slug: 'deltoids', intensity: 2 }],
  biceps: [{ slug: 'biceps', intensity: 2 }],
  triceps: [{ slug: 'triceps', intensity: 2 }],
  quads: [{ slug: 'quadriceps', intensity: 2 }],
  hamstrings: [{ slug: 'hamstring', intensity: 2 }],
  glutes: [{ slug: 'gluteal', intensity: 2 }],
  calves: [{ slug: 'calves', intensity: 2 }],
  core: [{ slug: 'abs', intensity: 2 }],
  full_body: [],
};

function label(group: MuscleGroup): string {
  return group === 'full_body' ? 'full body' : group;
}

interface Props {
  visible: boolean;
  userId: string | undefined;
  /** When set, the modal edits this custom exercise instead of creating one. */
  exercise?: Exercise | null;
  onClose: () => void;
  onCreated?: (exercise: Exercise) => void;
  onUpdated?: (exercise: Exercise) => void;
  onDeleted?: () => void;
}

export function NewExerciseModal({
  visible,
  userId,
  exercise,
  onClose,
  onCreated,
  onUpdated,
  onDeleted,
}: Props) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [isBodyweight, setIsBodyweight] = useState(false);
  const [saving, setSaving] = useState(false);

  const editing = !!exercise;

  useEffect(() => {
    if (visible && exercise) {
      setName(exercise.name);
      setGroup(exercise.muscle_group);
      setIsBodyweight(exercise.is_bodyweight);
    }
  }, [visible, exercise]);

  function reset() {
    setName('');
    setGroup(null);
    setIsBodyweight(false);
    setSaving(false);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Give your exercise a name.');
      return;
    }
    if (!group) {
      Alert.alert('Pick a muscle group', 'Choose which group this exercise belongs to.');
      return;
    }
    if (!editing && !userId) return;

    setSaving(true);
    const { data, error } = editing
      ? await supabase
          .from('exercises')
          .update({
            name: trimmed,
            muscle_group: group,
            muscles: DEFAULT_MUSCLES[group],
            is_bodyweight: isBodyweight,
          })
          .eq('id', exercise!.id)
          .select('*')
          .single()
      : await supabase
          .from('exercises')
          .insert({
            name: trimmed,
            muscle_group: group,
            muscles: DEFAULT_MUSCLES[group],
            is_custom: true,
            is_bodyweight: isBodyweight,
            created_by: userId,
          })
          .select('*')
          .single();
    setSaving(false);

    if (error) {
      const msg =
        error.code === '23505'
          ? 'An exercise with that name already exists. Try a different name.'
          : error.message;
      Alert.alert('Could not save', msg);
      return;
    }

    if (editing) {
      onUpdated?.(data as Exercise);
    } else {
      onCreated?.(data as Exercise);
    }
    reset();
    onClose();
  }

  function handleDelete() {
    if (!exercise) return;
    Alert.alert(
      'Delete exercise?',
      `"${exercise.name}" will be removed from your library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            const { error } = await supabase
              .from('exercises')
              .delete()
              .eq('id', exercise.id);
            setSaving(false);

            if (error) {
              const msg =
                error.code === '23503'
                  ? 'This exercise has logged sets or lives in a routine, so it can’t be deleted. Remove those first.'
                  : error.message;
              Alert.alert('Could not delete', msg);
              return;
            }

            reset();
            onDeleted?.();
            onClose();
          },
        },
      ]
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        reset();
        onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-background"
      >
        <View className="flex-row items-center justify-between px-5 pb-3 pt-4">
          <Pressable
            hitSlop={8}
            onPress={() => {
              reset();
              onClose();
            }}
          >
            <Text className="text-base font-semibold text-muted">Cancel</Text>
          </Pressable>
          <Text className="text-base font-bold text-white">
            {editing ? 'Edit Exercise' : 'New Exercise'}
          </Text>
          <Pressable hitSlop={8} disabled={saving} onPress={handleSave}>
            <Text
              className={`text-base font-bold ${
                saving ? 'text-muted' : 'text-accent'
              }`}
            >
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
            Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Cable Y-Raise"
            placeholderTextColor="#16803C"
            autoFocus={!editing}
            returnKeyType="done"
            className="border-b border-white/10 pb-2 text-lg font-semibold text-white"
          />

          <Text className="mb-3 mt-7 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
            Muscle group
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {MUSCLE_GROUPS.map((mg) => {
              const active = group === mg;
              return (
                <Pressable
                  key={mg}
                  onPress={() => setGroup(mg)}
                  className={`rounded-full border px-3.5 py-1.5 ${
                    active
                      ? 'border-accent bg-accent/15'
                      : 'border-white/10 bg-surface'
                  }`}
                >
                  <Text
                    className={`text-sm capitalize ${
                      active ? 'font-semibold text-accent' : 'text-muted'
                    }`}
                  >
                    {label(mg)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mb-3 mt-7 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
            Logging
          </Text>
          <Pressable
            className="flex-row items-center justify-between border-b border-white/10 pb-3"
            onPress={() => setIsBodyweight((v) => !v)}
          >
            <View className="flex-1 pr-4">
              <Text className="text-[15px] text-white">Bodyweight movement</Text>
              <Text className="mt-0.5 text-xs leading-4 text-muted">
                Sets default to BW — your logged body weight. Entering a weight
                counts as added load (+45).
              </Text>
            </View>
            <Switch
              value={isBodyweight}
              onValueChange={setIsBodyweight}
              trackColor={{ false: '#1E2630', true: '#22C55E' }}
              thumbColor="#FFFFFF"
            />
          </Pressable>

          {editing ? (
            <Pressable
              hitSlop={8}
              disabled={saving}
              onPress={handleDelete}
              className="mt-8 items-center active:opacity-60"
            >
              <Text className="text-[15px] font-semibold text-danger">
                Delete Exercise
              </Text>
            </Pressable>
          ) : (
            <Text className="mt-6 text-xs leading-5 text-muted">
              Your custom exercise will show up alongside the built-in library and be
              available in routines and active workouts.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

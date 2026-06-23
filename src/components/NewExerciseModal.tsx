import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
  onClose: () => void;
  onCreated: (exercise: Exercise) => void;
}

export function NewExerciseModal({ visible, userId, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setName('');
    setGroup(null);
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
    if (!userId) return;

    setSaving(true);
    const { data, error } = await supabase
      .from('exercises')
      .insert({
        name: trimmed,
        muscle_group: group,
        muscles: DEFAULT_MUSCLES[group],
        is_custom: true,
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

    onCreated(data as Exercise);
    reset();
    onClose();
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
          <Text className="text-base font-bold text-white">New Exercise</Text>
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
            autoFocus
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

          <Text className="mt-6 text-xs leading-5 text-muted">
            Your custom exercise will show up alongside the built-in library and be
            available in routines and active workouts.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExercisePicker } from '@/components/ExercisePicker';
import { MuscleMap } from '@/components/MuscleMap';
import { BlurHeaderBackground } from '@/lib/blurHeader';
import { formatSetWeight, parseSetWeightInput } from '@/lib/format';
import { FREE_ROUTINE_LIMIT } from '@/lib/limits';
import { supabase } from '@/lib/supabase';
import type { Exercise } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { usePremium } from '@/providers/PremiumProvider';

// Evaluate once — iOS 26+ gets real glass, everything else the blur fallback.
const LIQUID_GLASS = isLiquidGlassAvailable();

interface DraftSet {
  weight: string;
  reps: string;
}

interface DraftExercise {
  /** Stable client key — used as React key and to track within the editor. */
  key: string;
  exercise: Exercise;
  sets: DraftSet[];
}

export default function RoutineEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { isPremium } = usePremium();
  const isNew = id === 'new';

  const [title, setTitle] = useState('');
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('routines')
        .select(
          'id, title, routine_exercises ( id, position, exercises (*), routine_sets ( set_number, weight, reps ) )'
        )
        .eq('id', id)
        .single();
      if (cancelled) return;
      if (error || !data) {
        Alert.alert('Could not load routine', error?.message ?? 'Not found.');
        router.back();
        return;
      }
      setTitle(data.title);
      const ex = ((data as any).routine_exercises ?? []) as {
        id: string;
        position: number;
        exercises: Exercise;
        routine_sets: { set_number: number; weight: number; reps: number }[];
      }[];
      setExercises(
        ex
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((re) => ({
            key: re.id,
            exercise: re.exercises,
            sets: (re.routine_sets ?? [])
              .slice()
              .sort((a, b) => a.set_number - b.set_number)
              .map((s) => ({
                weight: formatSetWeight(Number(s.weight), re.exercises.is_bodyweight),
                reps: String(s.reps),
              })),
          }))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  function handleSelectExercise(exercise: Exercise) {
    setExercises((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}-${prev.length}`,
        exercise,
        sets: [{ weight: '', reps: '' }],
      },
    ]);
  }

  function handleAddSet(exerciseKey: string) {
    setExercises((prev) =>
      prev.map((e) =>
        e.key === exerciseKey ? { ...e, sets: [...e.sets, { weight: '', reps: '' }] } : e
      )
    );
  }

  function handleUpdateSet(
    exerciseKey: string,
    setIndex: number,
    patch: Partial<DraftSet>
  ) {
    setExercises((prev) =>
      prev.map((e) =>
        e.key === exerciseKey
          ? {
              ...e,
              sets: e.sets.map((s, i) => (i === setIndex ? { ...s, ...patch } : s)),
            }
          : e
      )
    );
  }

  function handleRemoveSet(exerciseKey: string, setIndex: number) {
    setExercises((prev) =>
      prev.map((e) =>
        e.key === exerciseKey
          ? { ...e, sets: e.sets.filter((_, i) => i !== setIndex) }
          : e
      )
    );
  }

  function handleRemoveExercise(exerciseKey: string) {
    setExercises((prev) => prev.filter((e) => e.key !== exerciseKey));
  }

  async function handleSave() {
    if (!session?.user.id) return;
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('Title required', 'Give your routine a name.');
      return;
    }
    if (exercises.length === 0) {
      Alert.alert('Add an exercise', 'A routine needs at least one exercise.');
      return;
    }

    // Validate + parse sets. Skip empty rows; fail on partial rows so the user
    // doesn't silently lose data.
    const parsed: { exercise: Exercise; sets: { weight: number; reps: number }[] }[] = [];
    for (const ex of exercises) {
      const validSets: { weight: number; reps: number }[] = [];
      for (let i = 0; i < ex.sets.length; i++) {
        const s = ex.sets[i];
        const wStr = s.weight.trim();
        const rStr = s.reps.trim();
        if (!wStr && !rStr) continue;
        // Bodyweight movements accept an empty weight / "BW" as 0 added load.
        const w = parseSetWeightInput(wStr, ex.exercise.is_bodyweight);
        const r = parseInt(rStr, 10);
        if (w === null || Number.isNaN(r) || r <= 0) {
          Alert.alert(
            'Invalid set',
            `Set ${i + 1} of ${ex.exercise.name} needs a weight and reps, or remove it.`
          );
          return;
        }
        validSets.push({ weight: w, reps: r });
      }
      if (validSets.length === 0) {
        Alert.alert(
          'Empty exercise',
          `${ex.exercise.name} has no sets. Add a set or remove the exercise.`
        );
        return;
      }
      parsed.push({ exercise: ex.exercise, sets: validSets });
    }

    setSaving(true);
    try {
      let routineId: string;
      if (isNew) {
        if (!isPremium) {
          const { count, error: cErr } = await supabase
            .from('routines')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', session.user.id);
          if (cErr) throw cErr;
          if ((count ?? 0) >= FREE_ROUTINE_LIMIT) {
            setSaving(false);
            Alert.alert(
              'Routine limit reached',
              `Free accounts can save up to ${FREE_ROUTINE_LIMIT} routines. Upgrade to Kova Pro for unlimited routines.`,
              [
                { text: 'Not now', style: 'cancel' },
                { text: 'Go Pro', onPress: () => router.replace('/paywall') },
              ]
            );
            return;
          }
        }
        const { data, error } = await supabase
          .from('routines')
          .insert({ user_id: session.user.id, title: trimmed })
          .select('id')
          .single();
        if (error) throw error;
        routineId = data.id;
      } else {
        routineId = id as string;
        const { error } = await supabase
          .from('routines')
          .update({ title: trimmed, updated_at: new Date().toISOString() })
          .eq('id', routineId);
        if (error) throw error;
        // Easiest correct update: wipe + re-insert children. Cascades to sets.
        const { error: dErr } = await supabase
          .from('routine_exercises')
          .delete()
          .eq('routine_id', routineId);
        if (dErr) throw dErr;
      }

      for (let i = 0; i < parsed.length; i++) {
        const { exercise, sets } = parsed[i];
        const { data: reRow, error: reErr } = await supabase
          .from('routine_exercises')
          .insert({ routine_id: routineId, exercise_id: exercise.id, position: i })
          .select('id')
          .single();
        if (reErr) throw reErr;
        const setRows = sets.map((s, idx) => ({
          routine_exercise_id: reRow.id,
          set_number: idx + 1,
          weight: s.weight,
          reps: s.reps,
        }));
        const { error: sErr } = await supabase.from('routine_sets').insert(setRows);
        if (sErr) throw sErr;
      }
      router.back();
    } catch (err: any) {
      Alert.alert('Could not save', err.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert('Delete routine?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('routines').delete().eq('id', id);
          if (error) {
            Alert.alert('Could not delete', error.message);
            return;
          }
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#22C55E" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 32,
            paddingTop: headerHeight + 16,
          }}
          scrollIndicatorInsets={{ top: headerHeight }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TextInput
            className="border-b border-white/10 pb-2 text-2xl font-bold text-white"
            placeholder="Routine name"
            placeholderTextColor="#16803C"
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />

          <View className="mt-2">
            {exercises.map((ex, i) => (
              <RoutineExerciseCard
                key={ex.key}
                order={i + 1}
                draft={ex}
                onAddSet={() => handleAddSet(ex.key)}
                onUpdateSet={(idx, patch) => handleUpdateSet(ex.key, idx, patch)}
                onRemoveSet={(idx) => handleRemoveSet(ex.key, idx)}
                onRemoveExercise={() => handleRemoveExercise(ex.key)}
              />
            ))}

            <Pressable
              className="mt-4 flex-row items-center justify-center gap-2 rounded-full border border-white/10 py-5 active:opacity-70"
              onPress={() => setPickerVisible(true)}
            >
              <Plus size={20} color="#22C55E" strokeWidth={2.25} />
              <Text className="text-base font-bold text-primary">
                {exercises.length > 0 ? 'Add Exercise' : 'Add your first exercise'}
              </Text>
            </Pressable>

            {!isNew && (
              <Pressable
                className="mt-6 items-center rounded-2xl border border-danger/30 py-4 active:opacity-70"
                onPress={handleDelete}
              >
                <Text className="font-semibold text-danger">Delete routine</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>

        {/* Floating frosted header — content scrolls under it and feathers out. */}
        <View
          className="absolute left-0 right-0 top-0"
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        >
          <BlurHeaderBackground />
          <View className="flex-row items-center justify-between px-4 pb-3 pt-8">
            <GlassButton onPress={() => router.back()}>
              <Text className="text-base font-semibold text-muted">Cancel</Text>
            </GlassButton>
            <Text className="text-base font-bold text-white">
              {isNew ? 'New Routine' : 'Edit Routine'}
            </Text>
            <GlassButton onPress={handleSave} disabled={saving}>
              <Text className="text-base font-bold text-primary">
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </GlassButton>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ExercisePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleSelectExercise}
      />
    </SafeAreaView>
  );
}

/**
 * A pill-shaped glass button for the floating header. Uses expo-glass-effect on
 * iOS 26+, falling back to a frosted blur capsule with a bright rim + sheen
 * elsewhere. Not true system Liquid Glass — see the design notes.
 */
function GlassButton({
  onPress,
  disabled,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const inner = (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      className="px-4 py-2 active:opacity-60"
    >
      {children}
    </Pressable>
  );

  // expo-glass-effect capsule — no manual blur, rim, or sheen needed here.
  if (LIQUID_GLASS) {
    return (
      <GlassView
        glassEffectStyle="regular"
        isInteractive
        style={{ borderRadius: 999, overflow: 'hidden' }}
      >
        {inner}
      </GlassView>
    );
  }

  // Fallback for iOS < 26 / Android: frosted blur with a bright rim and sheen.
  return (
    <View className="overflow-hidden rounded-full border border-white/20">
      <BlurView
        tint="systemUltraThinMaterialDark"
        intensity={60}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {inner}
    </View>
  );
}

function RoutineExerciseCard({
  order,
  draft,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onRemoveExercise,
}: {
  order: number;
  draft: DraftExercise;
  onAddSet: () => void;
  onUpdateSet: (setIndex: number, patch: Partial<DraftSet>) => void;
  onRemoveSet: (setIndex: number) => void;
  onRemoveExercise: () => void;
}) {
  const muscles = draft.exercise.muscles ?? [];

  return (
    <View className="border-b border-white/5 pb-5 pt-4">
      <View className="mb-3 flex-row items-center gap-3">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-surface">
          <Text className="text-sm font-bold text-primary">{order}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-white">{draft.exercise.name}</Text>
          <Text className="text-xs capitalize text-muted">
            {draft.exercise.muscle_group.replace('_', ' ')}
          </Text>
        </View>
        {muscles.length > 0 && (
          <View style={{ width: 44 }}>
            <MuscleMap muscles={muscles} side="front" />
          </View>
        )}
        <Pressable onPress={onRemoveExercise} hitSlop={10} className="self-start active:opacity-70">
          <X size={16} color="#8B98A9" strokeWidth={2} />
        </Pressable>
      </View>

      {draft.sets.length > 0 && (
        <View className="mb-2 flex-row items-center px-1 pb-1">
          <Text className="w-9 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Set
          </Text>
          <View className="flex-1 flex-row justify-center gap-8">
            <Text className="w-16 text-center text-[10px] font-semibold uppercase tracking-wider text-muted">
              Weight
            </Text>
            <Text className="w-14 text-center text-[10px] font-semibold uppercase tracking-wider text-muted">
              Reps
            </Text>
          </View>
          <View className="w-6" />
        </View>
      )}

      {draft.sets.map((set, i) => (
        <View key={i} className="mb-1.5 flex-row items-center px-1 py-1">
          <Text className="w-9 font-bold text-primary">#{i + 1}</Text>
          <View className="flex-1 flex-row items-center justify-center gap-8">
            <TextInput
              className="w-16 rounded-md bg-surface px-2 py-2 text-center text-base font-semibold text-white"
              value={set.weight}
              onChangeText={(t) => onUpdateSet(i, { weight: t })}
              placeholder={draft.exercise.is_bodyweight ? 'BW' : 'lbs'}
              placeholderTextColor="#16803C"
              keyboardType="decimal-pad"
              selectTextOnFocus
              returnKeyType="next"
            />
            <TextInput
              className="w-14 rounded-md bg-surface px-2 py-2 text-center text-base font-semibold text-white"
              value={set.reps}
              onChangeText={(t) => onUpdateSet(i, { reps: t })}
              placeholder="reps"
              placeholderTextColor="#16803C"
              keyboardType="number-pad"
              selectTextOnFocus
              returnKeyType="done"
            />
          </View>
          <Pressable onPress={() => onRemoveSet(i)} hitSlop={8} className="w-6 items-end">
            <Trash2 size={16} color="#8B98A9" strokeWidth={1.75} />
          </Pressable>
        </View>
      ))}

      <Pressable
        className="mt-1 flex-row items-center justify-center gap-2 rounded-full border border-white/10 py-3 active:opacity-70"
        onPress={onAddSet}
      >
        <Plus size={18} color="#22C55E" strokeWidth={2.25} />
        <Text className="font-bold text-primary">Add Set</Text>
      </Pressable>
    </View>
  );
}

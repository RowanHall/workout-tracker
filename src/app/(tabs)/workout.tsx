import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExercisePicker } from '@/components/ExercisePicker';
import { RestTimer } from '@/components/RestTimer';
import { WorkoutSummaryModal } from '@/components/WorkoutSummaryModal';
import { useActiveWorkout, type WorkoutEntry } from '@/hooks/useActiveWorkout';
import type { WorkoutSummary } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

export default function WorkoutScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const {
    workout,
    entries,
    loading,
    start,
    addExercise,
    logSet,
    deleteSet,
    finish,
    discard,
  } = useActiveWorkout(session?.user.id);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [restTrigger, setRestTrigger] = useState(0);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [finishing, setFinishing] = useState(false);

  async function handleFinish() {
    if (entries.every((e) => e.sets.length === 0)) {
      Alert.alert('Nothing logged', 'Log at least one set, or discard the workout.');
      return;
    }
    setFinishing(true);
    try {
      const result = await finish();
      if (result && !result.discarded) {
        setSummary(result);
        refreshProfile();
      }
    } catch (err: any) {
      Alert.alert('Could not finish workout', err.message);
    } finally {
      setFinishing(false);
    }
  }

  function handleDiscard() {
    Alert.alert('Discard workout?', 'All logged sets will be deleted.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => discard() },
    ]);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#22C55E" />
      </View>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-8">
          <Text className="mb-2 text-6xl">🏋️</Text>
          <Text className="mb-1 text-2xl font-bold text-white">Ready to train?</Text>
          {profile && profile.current_streak > 0 && (
            <Text className="mb-8 text-base text-muted">
              {profile.current_streak}-day streak — keep it alive! 🔥
            </Text>
          )}
          <Pressable
            className="w-full items-center rounded-2xl bg-primary py-5 active:opacity-80"
            onPress={() => start().catch((e) => Alert.alert('Error', e.message))}
          >
            <Text className="text-lg font-bold text-background">Start Workout</Text>
          </Pressable>
        </View>
        <WorkoutSummaryModal summary={summary} onClose={() => setSummary(null)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center justify-between px-4 py-3">
          <View>
            <Text className="text-xl font-bold text-white">{workout.title}</Text>
            <ElapsedTime since={workout.started_at} />
          </View>
          <View className="flex-row gap-2">
            <Pressable
              className="rounded-xl bg-surface px-4 py-2.5 active:opacity-70"
              onPress={handleDiscard}
            >
              <Text className="font-semibold text-danger">Discard</Text>
            </Pressable>
            <Pressable
              className="rounded-xl bg-primary px-4 py-2.5 active:opacity-80 disabled:opacity-50"
              disabled={finishing}
              onPress={handleFinish}
            >
              <Text className="font-bold text-background">
                {finishing ? 'Saving…' : 'Finish'}
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
          {entries.map((entry) => (
            <ExerciseBlock
              key={entry.exercise.id}
              entry={entry}
              onLogSet={async (weight, reps) => {
                await logSet(entry.exercise.id, weight, reps);
                setRestTrigger((t) => t + 1);
              }}
              onDeleteSet={(setId) => deleteSet(entry.exercise.id, setId)}
            />
          ))}

          <Pressable
            className="mb-6 mt-1 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 active:opacity-70"
            onPress={() => setPickerVisible(true)}
          >
            <Ionicons name="add-circle" size={20} color="#22C55E" />
            <Text className="font-semibold text-primary">Add Exercise</Text>
          </Pressable>
        </ScrollView>

        <View className="px-4 pb-2">
          <RestTimer trigger={restTrigger} />
        </View>
      </KeyboardAvoidingView>

      <ExercisePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={addExercise}
      />
      <WorkoutSummaryModal summary={summary} onClose={() => setSummary(null)} />
    </SafeAreaView>
  );
}

function ElapsedTime({ since }: { since: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    <Text className="text-sm text-muted">
      {m}:{s.toString().padStart(2, '0')} elapsed
    </Text>
  );
}

function ExerciseBlock({
  entry,
  onLogSet,
  onDeleteSet,
}: {
  entry: WorkoutEntry;
  onLogSet: (weight: number, reps: number) => Promise<void>;
  onDeleteSet: (setId: string) => void;
}) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [logging, setLogging] = useState(false);

  async function handleLog() {
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (Number.isNaN(w) || w < 0 || Number.isNaN(r) || r <= 0) {
      Alert.alert('Invalid set', 'Enter a weight (0 is OK for bodyweight) and reps.');
      return;
    }
    setLogging(true);
    try {
      await onLogSet(w, r);
      setReps('');
    } catch (err: any) {
      Alert.alert('Could not log set', err.message);
    } finally {
      setLogging(false);
    }
  }

  return (
    <View className="mb-3 rounded-2xl bg-surface p-4">
      <Text className="mb-1 text-base font-bold text-white">{entry.exercise.name}</Text>
      <Text className="mb-3 text-xs capitalize text-muted">
        {entry.exercise.muscle_group.replace('_', ' ')}
      </Text>

      {entry.sets.map((set) => (
        <View
          key={set.id}
          className="mb-1.5 flex-row items-center rounded-xl bg-surface-2 px-3 py-2.5"
        >
          <Text className="w-12 font-bold text-primary">#{set.set_number}</Text>
          <Text className="flex-1 text-white">
            {set.weight} lbs × {set.reps}
          </Text>
          <Pressable onPress={() => onDeleteSet(set.id)} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color="#8B98A9" />
          </Pressable>
        </View>
      ))}

      <View className="mt-2 flex-row items-center gap-2">
        <TextInput
          className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-center text-white"
          placeholder="lbs"
          placeholderTextColor="#8B98A9"
          keyboardType="decimal-pad"
          value={weight}
          onChangeText={setWeight}
        />
        <TextInput
          className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-center text-white"
          placeholder="reps"
          placeholderTextColor="#8B98A9"
          keyboardType="number-pad"
          value={reps}
          onChangeText={setReps}
        />
        <Pressable
          className="rounded-xl bg-primary px-4 py-2.5 active:opacity-80 disabled:opacity-50"
          disabled={logging}
          onPress={handleLog}
        >
          <Ionicons name="checkmark" size={20} color="#0B0F14" />
        </Pressable>
      </View>
    </View>
  );
}

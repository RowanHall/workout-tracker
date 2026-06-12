import { Check, Dumbbell, Flame, Plus, Trash2 } from 'lucide-react-native';
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
import { displayStreak } from '@/lib/exp';
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
  const [expBeforeWorkout, setExpBeforeWorkout] = useState(0);
  const [finishing, setFinishing] = useState(false);

  async function handleFinish() {
    if (entries.every((e) => e.sets.length === 0)) {
      Alert.alert('Nothing logged', 'Log at least one set, or discard the workout.');
      return;
    }
    setFinishing(true);
    const expBefore = profile?.total_exp ?? 0;
    try {
      const result = await finish();
      if (result && !result.discarded) {
        setExpBeforeWorkout(expBefore);
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

  const streak = profile ? displayStreak(profile.current_streak, profile.last_workout_date) : 0;

  if (!workout) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-6 h-24 w-24 items-center justify-center rounded-full border border-border bg-surface">
            <Dumbbell size={40} color="#22C55E" strokeWidth={1.75} />
          </View>
          <Text className="mb-1.5 text-2xl font-bold text-white">Ready to train?</Text>
          <Text className="mb-6 text-center text-base text-muted">
            Start a session and log every set as you go.
          </Text>
          {streak > 0 && (
            <View className="mb-8 flex-row items-center gap-1.5 rounded-full bg-surface px-4 py-2">
              <Flame size={16} color="#F59E0B" strokeWidth={2} />
              <Text className="text-sm font-semibold text-white">{streak}-day streak</Text>
              <Text className="text-sm text-muted">— keep it alive</Text>
            </View>
          )}
          <Pressable
            className="w-full items-center rounded-2xl bg-primary py-5 active:opacity-80"
            onPress={() => start().catch((e) => Alert.alert('Error', e.message))}
          >
            <Text className="text-lg font-bold text-background">Start Workout</Text>
          </Pressable>
        </View>
        <WorkoutSummaryModal
          summary={summary}
          previousTotalExp={expBeforeWorkout}
          onClose={() => setSummary(null)}
        />
      </SafeAreaView>
    );
  }

  const totalSets = entries.reduce((n, e) => n + e.sets.length, 0);
  const totalVolume = entries.reduce(
    (v, e) => v + e.sets.reduce((sum, set) => sum + set.weight * set.reps, 0),
    0
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="px-4 py-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-xl font-bold text-white">{workout.title}</Text>
              <View className="mt-0.5 flex-row items-center gap-1.5">
                <View className="h-1.5 w-1.5 rounded-full bg-primary" />
                <ElapsedTime since={workout.started_at} />
              </View>
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

          <View className="mt-3 flex-row rounded-2xl bg-surface py-3">
            <SummaryStat value={String(entries.length)} label="Exercises" />
            <View className="w-px bg-border" />
            <SummaryStat value={String(totalSets)} label="Sets" />
            <View className="w-px bg-border" />
            <SummaryStat value={totalVolume.toLocaleString()} label="Volume · lbs" />
          </View>
        </View>

        <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
          {entries.map((entry, index) => (
            <ExerciseBlock
              key={entry.exercise.id}
              order={index + 1}
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
            <Plus size={18} color="#22C55E" strokeWidth={2.25} />
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
      <WorkoutSummaryModal
        summary={summary}
        previousTotalExp={expBeforeWorkout}
        onClose={() => setSummary(null)}
      />
    </SafeAreaView>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-lg font-bold text-white">{value}</Text>
      <Text className="text-xs text-muted">{label}</Text>
    </View>
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
  order,
  entry,
  onLogSet,
  onDeleteSet,
}: {
  order: number;
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
      <View className="mb-3 flex-row items-center">
        <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-surface-2">
          <Text className="text-sm font-bold text-primary">{order}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-white">{entry.exercise.name}</Text>
          <Text className="text-xs capitalize text-muted">
            {entry.exercise.muscle_group.replace('_', ' ')}
          </Text>
        </View>
        {entry.sets.length > 0 && (
          <View className="rounded-full bg-surface-2 px-2.5 py-1">
            <Text className="text-xs font-semibold text-muted">
              {entry.sets.length} {entry.sets.length === 1 ? 'set' : 'sets'}
            </Text>
          </View>
        )}
      </View>

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
            <Trash2 size={16} color="#8B98A9" strokeWidth={1.75} />
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
          <Check size={20} color="#0B0F14" strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
}

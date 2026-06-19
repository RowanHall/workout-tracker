import { router, useFocusEffect } from 'expo-router';
import { Check, Dumbbell, Flame, Moon, Plus, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExercisePicker } from '@/components/ExercisePicker';
import { MuscleMap } from '@/components/MuscleMap';
import { RestTimer } from '@/components/RestTimer';
import type { ShareStats } from '@/components/ShareableWorkoutCard';
import { WeekTracker } from '@/components/WeekTracker';
import { WorkoutShareSheet } from '@/components/WorkoutShareSheet';
import { WorkoutSummaryModal } from '@/components/WorkoutSummaryModal';
import { useActiveWorkout, type WorkoutEntry } from '@/hooks/useActiveWorkout';
import { displayStreak } from '@/lib/streak';
import { dateKey, formatDuration } from '@/lib/format';
import { mergeMuscles } from '@/lib/muscles';
import { fireMilestoneIfDue, resetMilestoneTracker } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import type { ExerciseMuscle, WorkoutSummary } from '@/lib/types';
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
  const [summaryMuscles, setSummaryMuscles] = useState<ExerciseMuscle[]>([]);
  const [shareStats, setShareStats] = useState<ShareStats | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [weekWorkoutIds, setWeekWorkoutIds] = useState<Record<string, string>>({});
  const [weekRestDates, setWeekRestDates] = useState<string[]>([]);
  const [loggingRest, setLoggingRest] = useState(false);

  const loadWeek = useCallback(async () => {
    if (!session?.user.id) return;
    const monday = new Date();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const mondayKey = dateKey(monday);
    const [workoutsRes, restRes] = await Promise.all([
      supabase
        .from('workouts')
        .select('id, ended_at')
        .eq('user_id', session.user.id)
        .not('ended_at', 'is', null)
        .gte('ended_at', monday.toISOString())
        .order('ended_at', { ascending: true }),
      supabase
        .from('rest_days')
        .select('rest_date')
        .eq('user_id', session.user.id)
        .gte('rest_date', mondayKey),
    ]);
    const ids: Record<string, string> = {};
    for (const w of (workoutsRes.data ?? []) as { id: string; ended_at: string }[]) {
      ids[dateKey(new Date(w.ended_at))] = w.id;
    }
    setWeekWorkoutIds(ids);
    setWeekRestDates(
      ((restRes.data ?? []) as { rest_date: string }[]).map((r) => r.rest_date)
    );
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      loadWeek();
    }, [loadWeek])
  );

  const weekDates = Object.keys(weekWorkoutIds);
  const todayKey = dateKey(new Date());
  const workedToday = todayKey in weekWorkoutIds;
  const restedToday = weekRestDates.includes(todayKey);
  const restCapReached = weekRestDates.length >= 5;
  const canLogRest = !workedToday && !restedToday && !restCapReached;

  async function handleLogRestDay() {
    setLoggingRest(true);
    try {
      const { error } = await supabase.rpc('log_rest_day', { p_today: dateKey(new Date()) });
      if (error) throw error;
      await Promise.all([refreshProfile(), loadWeek()]);
    } catch (err: any) {
      Alert.alert('Could not log rest day', err.message);
    } finally {
      setLoggingRest(false);
    }
  }

  async function handleFinish() {
    if (entries.every((e) => e.sets.length === 0)) {
      Alert.alert('Nothing logged', 'Log at least one set, or discard the workout.');
      return;
    }
    setFinishing(true);
    // Captured before finish() clears the active workout, so the share card can
    // show its title and duration, and the summary muscle map can render.
    const finishedWorkout = workout;
    const mergedMuscles = mergeMuscles(
      entries.filter((e) => e.sets.length > 0).map((e) => e.exercise.muscles ?? [])
    );
    try {
      const result = await finish();
      if (result && !result.discarded) {
        const endedIso = new Date().toISOString();
        setSummaryMuscles(mergedMuscles);
        setShareStats({
          title: finishedWorkout?.title ?? 'Workout',
          dateIso: endedIso,
          volume: result.total_volume,
          sets: result.total_sets,
          durationLabel: finishedWorkout
            ? formatDuration(finishedWorkout.started_at, endedIso)
            : null,
          prCount: result.prs.length,
          streak: result.streak,
          athleteName: profile?.display_name ?? profile?.username ?? null,
        });
        setSummary(result);
        refreshProfile();
        loadWeek();
        if (result.streak === 1) await resetMilestoneTracker();
        fireMilestoneIfDue(result.streak);
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
    let restHelper: string | null = null;
    if (restedToday) restHelper = 'Rest day logged — streak safe.';
    else if (workedToday) restHelper = "You're already logged today.";
    else if (restCapReached) restHelper = 'Rest day cap (5/week) reached.';

    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-4 pt-3">
          <View className="rounded-2xl bg-surface p-4">
            <Text className="mb-3 text-base font-bold text-white">This Week</Text>
            <WeekTracker
              workoutDates={weekDates}
              restDates={weekRestDates}
              workoutIds={weekWorkoutIds}
              onDayPress={(id) => router.push(`/workout/${id}`)}
            />
          </View>
        </View>
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
          <Pressable
            className="mt-3 w-full flex-row items-center justify-center gap-2 rounded-2xl border border-border py-4 active:opacity-70 disabled:opacity-40"
            disabled={!canLogRest || loggingRest}
            onPress={handleLogRestDay}
          >
            <Moon size={18} color="#8B98A9" strokeWidth={2} />
            <Text className="font-semibold text-muted">
              {loggingRest ? 'Logging…' : 'Log Rest Day'}
            </Text>
          </Pressable>
          {restHelper && (
            <Text className="mt-3 text-xs text-muted">{restHelper}</Text>
          )}
        </View>
        <WorkoutSummaryModal
          summary={summary}
          muscles={summaryMuscles}
          onClose={() => setSummary(null)}
          onShare={shareStats ? () => setShareOpen(true) : undefined}
        />
        <WorkoutShareSheet
          visible={shareOpen}
          stats={shareStats}
          onClose={() => setShareOpen(false)}
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

        <ExercisePager
          entries={entries}
          onAddPress={() => setPickerVisible(true)}
          onLogSet={async (exerciseId, weight, reps) => {
            await logSet(exerciseId, weight, reps);
            setRestTrigger((t) => t + 1);
          }}
          onDeleteSet={(exerciseId, setId) => deleteSet(exerciseId, setId)}
        />

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
        muscles={summaryMuscles}
        onClose={() => setSummary(null)}
        onShare={shareStats ? () => setShareOpen(true) : undefined}
      />
      <WorkoutShareSheet
        visible={shareOpen}
        stats={shareStats}
        onClose={() => setShareOpen(false)}
      />
    </SafeAreaView>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-xl font-extrabold text-white">{value}</Text>
      <Text className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </Text>
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

interface PageItem {
  kind: 'exercise' | 'add';
  entry?: WorkoutEntry;
}

function ExercisePager({
  entries,
  onAddPress,
  onLogSet,
  onDeleteSet,
}: {
  entries: WorkoutEntry[];
  onAddPress: () => void;
  onLogSet: (exerciseId: number, weight: number, reps: number) => Promise<void>;
  onDeleteSet: (exerciseId: number, setId: string) => void;
}) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<PageItem>>(null);
  const [page, setPage] = useState(0);
  const prevEntryCount = useRef(entries.length);

  const pages = useMemo<PageItem[]>(
    () => [...entries.map((e) => ({ kind: 'exercise' as const, entry: e })), { kind: 'add' as const }],
    [entries]
  );

  // Auto-scroll to a freshly added exercise so the user lands on its card.
  useEffect(() => {
    if (entries.length > prevEntryCount.current) {
      const target = entries.length - 1;
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: target, animated: true });
      });
    }
    prevEntryCount.current = entries.length;
  }, [entries.length]);

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== page) setPage(next);
  }

  return (
    <View className="flex-1">
      <FlatList
        ref={listRef}
        data={pages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        keyExtractor={(item) =>
          item.kind === 'add' ? 'add' : `ex-${item.entry!.exercise.id}`
        }
        renderItem={({ item, index }) =>
          item.kind === 'add' ? (
            <AddExercisePage width={width} onPress={onAddPress} hasExercises={entries.length > 0} />
          ) : (
            <ExerciseCard
              width={width}
              order={index + 1}
              entry={item.entry!}
              onLogSet={(weight, reps) => onLogSet(item.entry!.exercise.id, weight, reps)}
              onDeleteSet={(setId) => onDeleteSet(item.entry!.exercise.id, setId)}
            />
          )
        }
      />
      <PageDots count={pages.length} active={page} />
    </View>
  );
}

function PageDots({ count, active }: { count: number; active: number }) {
  return (
    <View className="flex-row items-center justify-center gap-1.5 py-2">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          className={`h-1.5 rounded-full ${
            i === active ? 'w-5 bg-primary' : 'w-1.5 bg-border'
          }`}
        />
      ))}
    </View>
  );
}

function AddExercisePage({
  width,
  onPress,
  hasExercises,
}: {
  width: number;
  onPress: () => void;
  hasExercises: boolean;
}) {
  return (
    <View style={{ width }} className="items-center justify-center px-6">
      <Pressable
        className="h-32 w-32 items-center justify-center rounded-full bg-primary active:opacity-80"
        onPress={onPress}
      >
        <Plus size={56} color="#0B0F14" strokeWidth={2.5} />
      </Pressable>
      <Text className="mt-5 text-lg font-bold text-white">
        {hasExercises ? 'Add another exercise' : 'Pick your first exercise'}
      </Text>
      <Text className="mt-1 text-center text-sm text-muted">
        {hasExercises ? 'Swipe back to keep logging sets.' : 'Tap the + to choose what you’re training.'}
      </Text>
    </View>
  );
}

function ExerciseCard({
  width,
  order,
  entry,
  onLogSet,
  onDeleteSet,
}: {
  width: number;
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
    <View style={{ width }} className="px-4">
      <ScrollView
        className="flex-1 rounded-2xl bg-surface"
        contentContainerClassName="p-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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

        <View className="mb-2 flex-row items-center gap-2">
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

        <View className="mt-3">
          <MuscleMap muscles={entry.exercise.muscles ?? []} />
        </View>
      </ScrollView>
    </View>
  );
}

import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { Moon, Plus, Trash2, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { MuscleMap } from '@/components/MuscleMap';
import { RestTimer } from '@/components/RestTimer';
import { RestTimerLocked } from '@/components/RestTimerLocked';
import type { ShareStats } from '@/components/ShareableWorkoutCard';
import { WeekTracker } from '@/components/WeekTracker';
import { WorkoutShareSheet } from '@/components/WorkoutShareSheet';
import {
  WorkoutSummaryModal,
  type SelectedPhoto,
  type WorkoutVisibility,
} from '@/components/WorkoutSummaryModal';
import { useActiveWorkout, type WorkoutEntry } from '@/hooks/useActiveWorkout';
import {
  dateKey,
  formatDuration,
  formatSetWeight,
  parseSetWeightInput,
} from '@/lib/format';
import { mergeMuscles } from '@/lib/muscles';
import { fireMilestoneIfDue, resetMilestoneTracker } from '@/lib/notifications';
import { FREE_ROUTINE_LIMIT } from '@/lib/limits';
import { supabase } from '@/lib/supabase';
import type { ExerciseMuscle, WorkoutSet, WorkoutSummary } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { usePremium } from '@/providers/PremiumProvider';

export default function WorkoutScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const { isPremium } = usePremium();
  const {
    workout,
    entries,
    loading,
    start,
    startFromRoutine,
    addExercise,
    removeExercise,
    logSet,
    updateSet,
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
  const [summaryPhotos, setSummaryPhotos] = useState<SelectedPhoto[]>([]);
  const [summaryVisibility, setSummaryVisibility] = useState<WorkoutVisibility>('public');
  const [summaryTitle, setSummaryTitle] = useState('');
  const [summaryDefaultTitle, setSummaryDefaultTitle] = useState('');
  const [savingSummary, setSavingSummary] = useState(false);
  const [routines, setRoutines] = useState<{ id: string; title: string; exerciseCount: number }[]>([]);
  const [startingRoutineId, setStartingRoutineId] = useState<string | null>(null);
  // Latest logged body weight (lbs). Bodyweight exercises count it toward the
  // live volume preview, matching what finish_workout does server-side.
  const [bodyWeight, setBodyWeight] = useState(0);

  useEffect(() => {
    if (!session?.user.id) return;
    supabase
      .from('body_weights')
      .select('weight')
      .eq('user_id', session.user.id)
      .order('recorded_on', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setBodyWeight(data ? Number(data.weight) : 0));
  }, [session?.user.id]);

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

  const loadRoutines = useCallback(async () => {
    if (!session?.user.id) return;
    const { data } = await supabase
      .from('routines')
      .select('id, title, routine_exercises ( id )')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setRoutines(
      ((data as any[]) ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        exerciseCount: r.routine_exercises?.length ?? 0,
      }))
    );
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      loadWeek();
      loadRoutines();
    }, [loadWeek, loadRoutines])
  );

  async function handleStartRoutine(routineId: string) {
    setStartingRoutineId(routineId);
    try {
      await startFromRoutine(routineId);
    } catch (err: any) {
      Alert.alert('Could not start routine', err.message);
    } finally {
      setStartingRoutineId(null);
    }
  }

  function handleNewRoutine() {
    if (!isPremium && routines.length >= FREE_ROUTINE_LIMIT) {
      Alert.alert(
        'Routine limit reached',
        `Free accounts can save up to ${FREE_ROUTINE_LIMIT} routines. Upgrade to Kova Pro for unlimited routines.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Go Pro', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }
    router.push('/routine/new');
  }

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
    setSummaryDefaultTitle(workout?.title ?? '');
    setSummaryTitle('');
    const mergedMuscles = mergeMuscles(
      entries.filter((e) => e.sets.length > 0).map((e) => e.exercise.muscles ?? [])
    );
    try {
      const result = await finish();
      if (result && !result.discarded) {
        const endedIso = new Date().toISOString();
        setSummaryMuscles(mergedMuscles);
        setShareStats({
          workoutId: finishedWorkout?.id ?? '',
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
          muscles: mergedMuscles,
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

  async function handleAddPhoto() {
    if (summaryPhotos.length >= 6) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos access needed', 'Allow photo access to attach a workout photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;
    setSummaryPhotos((prev) => [...prev, { uri: asset.uri, base64: asset.base64 ?? null }]);
  }

  function handleRemovePhoto(index: number) {
    setSummaryPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  // Persist the photos + visibility chosen on the summary modal. Returns true
  // on success; false if anything blew up (in which case the modal stays open
  // so the user doesn't lose their selection).
  async function commitSummaryEdits(): Promise<boolean> {
    const workoutId = shareStats?.workoutId;
    const uid = session?.user.id;
    if (!workoutId || !uid) return true;
    setSavingSummary(true);
    try {
      const trimmedTitle = summaryTitle.trim();
      const titleChanged = trimmedTitle.length > 0 && trimmedTitle !== summaryDefaultTitle;
      const visibilityChanged = summaryVisibility !== 'public';
      if (titleChanged || visibilityChanged) {
        const patch: Record<string, string> = {};
        if (titleChanged) patch.title = trimmedTitle;
        if (visibilityChanged) patch.visibility = summaryVisibility;
        const { error } = await supabase.from('workouts').update(patch).eq('id', workoutId);
        if (error) throw error;
        if (titleChanged) {
          setShareStats((prev) => (prev ? { ...prev, title: trimmedTitle } : prev));
        }
      }
      for (let i = 0; i < summaryPhotos.length; i++) {
        const photo = summaryPhotos[i];
        if (!photo.base64) continue;
        const path = `${uid}/${workoutId}/${Date.now()}-${i}.jpg`;
        const { error: upErr } = await supabase.storage
          .from('workout-photos')
          .upload(path, decode(photo.base64), {
            contentType: 'image/jpeg',
            upsert: false,
          });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from('workout-photos').getPublicUrl(path);
        const { error: rowErr } = await supabase.from('workout_photos').insert({
          workout_id: workoutId,
          user_id: uid,
          photo_url: data.publicUrl,
          position: i,
        });
        if (rowErr) throw rowErr;
      }
      return true;
    } catch (err: any) {
      Alert.alert('Could not save', err?.message ?? 'Something went wrong.');
      return false;
    } finally {
      setSavingSummary(false);
    }
  }

  function resetSummaryState() {
    setSummary(null);
    setSummaryPhotos([]);
    setSummaryVisibility('public');
    setSummaryTitle('');
    setSummaryDefaultTitle('');
  }

  async function handleCloseSummary() {
    if (savingSummary) return;
    const ok = await commitSummaryEdits();
    if (!ok) return;
    resetSummaryState();
  }

  // iOS won't present a second <Modal> over a visible one, so dismiss the
  // summary modal first and wait for its dismiss animation before opening
  // the share sheet. Photo uploads and visibility changes are persisted first
  // so the share reflects the user's choices.
  async function handleOpenShare() {
    if (savingSummary) return;
    const ok = await commitSummaryEdits();
    if (!ok) return;
    resetSummaryState();
    setTimeout(() => setShareOpen(true), 350);
  }

  function handleRemoveExercise(entry: WorkoutEntry) {
    const remove = () =>
      removeExercise(entry.exercise.id).catch((err: any) =>
        Alert.alert('Could not remove exercise', err.message)
      );
    if (entry.sets.length === 0) {
      remove();
      return;
    }
    Alert.alert(
      `Remove ${entry.exercise.name}?`,
      `${entry.sets.length} logged ${entry.sets.length === 1 ? 'set' : 'sets'} will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: remove },
      ]
    );
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
    let restHelper: string | null = null;
    if (restedToday) restHelper = 'Rest day logged — streak safe.';
    else if (workedToday) restHelper = "You're already logged today.";
    else if (restCapReached) restHelper = 'Rest day cap (5/week) reached.';

    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          <Section label="This Week">
            <WeekTracker
              workoutDates={weekDates}
              restDates={weekRestDates}
              workoutIds={weekWorkoutIds}
              onDayPress={(id) => router.push(`/workout/${id}`)}
            />
          </Section>

          <View className="px-5 pt-7">
            <Pressable
              className="w-full items-center rounded-2xl bg-primary py-5 active:opacity-80"
              onPress={() => start().catch((e) => Alert.alert('Error', e.message))}
            >
              <Text className="text-lg font-bold text-background">Start Empty Workout</Text>
            </Pressable>
            <Pressable
              className="mt-3 w-full flex-row items-center justify-center gap-2 rounded-2xl border border-white/10 py-4 active:opacity-70 disabled:opacity-40"
              disabled={!canLogRest || loggingRest}
              onPress={handleLogRestDay}
            >
              <Moon size={18} color="#8B98A9" strokeWidth={2} />
              <Text className="font-semibold text-muted">
                {loggingRest ? 'Logging…' : 'Log Rest Day'}
              </Text>
            </Pressable>
            {restHelper && (
              <Text className="mt-3 text-center text-xs text-muted">{restHelper}</Text>
            )}
          </View>

          <RoutinesSection
            routines={routines}
            startingRoutineId={startingRoutineId}
            isPremium={isPremium}
            onStartRoutine={handleStartRoutine}
            onEditRoutine={(id) => router.push(`/routine/${id}`)}
            onNewRoutine={handleNewRoutine}
          />

        </ScrollView>
        <WorkoutSummaryModal
          summary={summary}
          muscles={summaryMuscles}
          onClose={handleCloseSummary}
          onShare={shareStats ? handleOpenShare : undefined}
          photos={summaryPhotos}
          onAddPhoto={handleAddPhoto}
          onRemovePhoto={handleRemovePhoto}
          visibility={summaryVisibility}
          onChangeVisibility={setSummaryVisibility}
          title={summaryTitle}
          onChangeTitle={setSummaryTitle}
          defaultTitle={summaryDefaultTitle}
          saving={savingSummary}
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
    (v, e) =>
      v +
      e.sets.reduce(
        (sum, set) =>
          sum + (Number(set.weight) + (e.exercise.is_bodyweight ? bodyWeight : 0)) * set.reps,
        0
      ),
    0
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="px-5 py-3">
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
            <View className="w-px bg-white/10" />
            <SummaryStat value={String(totalSets)} label="Sets" />
            <View className="w-px bg-white/10" />
            <SummaryStat value={totalVolume.toLocaleString()} label="Volume · lbs" />
          </View>

          <View className="mt-3">
            {isPremium ? (
              <RestTimer trigger={restTrigger} />
            ) : (
              <RestTimerLocked trigger={restTrigger} />
            )}
          </View>
        </View>

        <ExerciseList
          entries={entries}
          onAddPress={() => setPickerVisible(true)}
          onLogSet={async (exerciseId, weight, reps) => {
            await logSet(exerciseId, weight, reps);
            setRestTrigger((t) => t + 1);
          }}
          onUpdateSet={(exerciseId, setId, patch) => updateSet(exerciseId, setId, patch)}
          onDeleteSet={(exerciseId, setId) => deleteSet(exerciseId, setId)}
          onRemoveExercise={handleRemoveExercise}
        />
      </KeyboardAvoidingView>

      <ExercisePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={addExercise}
      />
      <WorkoutSummaryModal
        summary={summary}
        muscles={summaryMuscles}
        onClose={handleCloseSummary}
        onShare={shareStats ? handleOpenShare : undefined}
        photos={summaryPhotos}
        onAddPhoto={handleAddPhoto}
        onRemovePhoto={handleRemovePhoto}
        visibility={summaryVisibility}
        onChangeVisibility={setSummaryVisibility}
        saving={savingSummary}
      />
      <WorkoutShareSheet
        visible={shareOpen}
        stats={shareStats}
        onClose={() => setShareOpen(false)}
      />
    </SafeAreaView>
  );
}

function RoutinesSection({
  routines,
  startingRoutineId,
  isPremium,
  onStartRoutine,
  onEditRoutine,
  onNewRoutine,
}: {
  routines: { id: string; title: string; exerciseCount: number }[];
  startingRoutineId: string | null;
  isPremium: boolean;
  onStartRoutine: (id: string) => void;
  onEditRoutine: (id: string) => void;
  onNewRoutine: () => void;
}) {
  const atLimit = !isPremium && routines.length >= FREE_ROUTINE_LIMIT;
  const suffix = isPremium
    ? routines.length > 0
      ? String(routines.length)
      : null
    : `${routines.length}/${FREE_ROUTINE_LIMIT}`;

  return (
    <Section label="Routines" eyebrowSuffix={suffix ?? undefined}>
      {routines.map((r) => {
        const starting = startingRoutineId === r.id;
        return (
          <View
            key={r.id}
            className="flex-row items-center border-b border-white/5 py-3.5"
          >
            <Pressable
              onPress={() => onEditRoutine(r.id)}
              className="flex-1 pr-3 active:opacity-70"
            >
              <Text className="text-[15px] font-semibold text-white" numberOfLines={1}>
                {r.title}
              </Text>
              <Text className="mt-0.5 text-xs text-muted">
                {r.exerciseCount} {r.exerciseCount === 1 ? 'exercise' : 'exercises'}
              </Text>
            </Pressable>
            <Pressable
              className="rounded-xl bg-primary px-3.5 py-2 active:opacity-80 disabled:opacity-50"
              disabled={starting}
              onPress={() => onStartRoutine(r.id)}
            >
              <Text className="text-sm font-bold text-background">
                {starting ? 'Starting…' : 'Start'}
              </Text>
            </Pressable>
          </View>
        );
      })}

      <Pressable
        className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface/40 py-4 active:opacity-70"
        onPress={onNewRoutine}
      >
        <Plus size={18} color="#22C55E" strokeWidth={2.25} />
        <Text className="font-bold text-primary">New Routine</Text>
      </Pressable>

      {atLimit && (
        <Text className="mt-3 text-center text-xs text-muted">
          Free limit reached. Go Pro for unlimited routines.
        </Text>
      )}
    </Section>
  );
}

function Section({
  label,
  eyebrowSuffix,
  children,
}: {
  label: string;
  eyebrowSuffix?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="px-5 pt-7">
      <View className="mb-3 flex-row items-baseline justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
          {label}
        </Text>
        {eyebrowSuffix && (
          <Text className="text-[11px] font-medium uppercase tracking-[1.5px] text-muted/70">
            {eyebrowSuffix}
          </Text>
        )}
      </View>
      {children}
    </View>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text
        className="text-xl font-extrabold text-white"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
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

function ExerciseList({
  entries,
  onAddPress,
  onLogSet,
  onUpdateSet,
  onDeleteSet,
  onRemoveExercise,
}: {
  entries: WorkoutEntry[];
  onAddPress: () => void;
  onLogSet: (exerciseId: number, weight: number, reps: number) => Promise<void>;
  onUpdateSet: (
    exerciseId: number,
    setId: string,
    patch: { weight?: number; reps?: number }
  ) => Promise<void>;
  onDeleteSet: (exerciseId: number, setId: string) => void;
  onRemoveExercise: (entry: WorkoutEntry) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const prevEntryCount = useRef(entries.length);

  // After a new exercise is added the user almost always wants to land on it,
  // so scroll to the bottom where it just appeared.
  useEffect(() => {
    if (entries.length > prevEntryCount.current) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
    prevEntryCount.current = entries.length;
  }, [entries.length]);

  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {entries.map((entry, i) => (
        <ExerciseCard
          key={entry.exercise.id}
          order={i + 1}
          entry={entry}
          onLogSet={(weight, reps) => onLogSet(entry.exercise.id, weight, reps)}
          onUpdateSet={(setId, patch) => onUpdateSet(entry.exercise.id, setId, patch)}
          onDeleteSet={(setId) => onDeleteSet(entry.exercise.id, setId)}
          onRemove={() => onRemoveExercise(entry)}
        />
      ))}
      <AddExerciseButton hasExercises={entries.length > 0} onPress={onAddPress} />
    </ScrollView>
  );
}

function AddExerciseButton({
  hasExercises,
  onPress,
}: {
  hasExercises: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="mt-1 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface/40 py-5 active:opacity-70"
      onPress={onPress}
    >
      <Plus size={20} color="#22C55E" strokeWidth={2.25} />
      <Text className="text-base font-bold text-primary">
        {hasExercises ? 'Add Exercise' : 'Add your first exercise'}
      </Text>
    </Pressable>
  );
}

function ExerciseCard({
  order,
  entry,
  onLogSet,
  onUpdateSet,
  onDeleteSet,
  onRemove,
}: {
  order: number;
  entry: WorkoutEntry;
  onLogSet: (weight: number, reps: number) => Promise<void>;
  onUpdateSet: (setId: string, patch: { weight?: number; reps?: number }) => Promise<void>;
  onDeleteSet: (setId: string) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState<{ weight: string; reps: string } | null>(null);
  const [committing, setCommitting] = useState(false);

  // Suggestion for the *next* set: same position from the previous workout,
  // else that workout's final set. Used as a faded green placeholder hint.
  const suggestion =
    entry.previousSets[entry.sets.length] ??
    entry.previousSets[entry.previousSets.length - 1] ??
    null;

  function handleAddSet() {
    if (draft !== null) return;
    setDraft({ weight: '', reps: '' });
  }

  const isBodyweight = entry.exercise.is_bodyweight;

  async function commitDraft() {
    if (!draft || committing) return;
    // For bodyweight movements an empty weight is valid: it commits as 0
    // added load, i.e. a plain bodyweight set.
    const w = parseSetWeightInput(draft.weight, isBodyweight);
    const r = parseInt(draft.reps, 10);
    if (w === null) return;
    if (Number.isNaN(r) || r <= 0) return;
    setCommitting(true);
    try {
      await onLogSet(w, r);
      setDraft(null);
    } catch (err: any) {
      Alert.alert('Could not add set', err.message);
    } finally {
      setCommitting(false);
    }
  }

  const muscles = entry.exercise.muscles ?? [];

  return (
    <View className="mb-3 rounded-2xl bg-surface p-4">
      <View className="mb-3 flex-row items-center gap-3">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-surface-2">
          <Text className="text-sm font-bold text-primary">{order}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-white">{entry.exercise.name}</Text>
          <Text className="text-xs capitalize text-muted">
            {entry.exercise.muscle_group.replace('_', ' ')}
          </Text>
        </View>
        {muscles.length > 0 && (
          <View style={{ width: 44 }}>
            <MuscleMap muscles={muscles} side="front" />
          </View>
        )}
        <Pressable onPress={onRemove} hitSlop={10} className="self-start active:opacity-70">
          <X size={16} color="#8B98A9" strokeWidth={2} />
        </Pressable>
      </View>

      {(entry.sets.length > 0 || draft !== null) && (
        <View className="mb-2 flex-row items-center px-3 pb-1">
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

      {entry.sets.map((set) => (
        <SetRow
          key={set.id}
          set={set}
          isBodyweight={isBodyweight}
          onUpdate={(patch) => onUpdateSet(set.id, patch)}
          onDelete={() => onDeleteSet(set.id)}
        />
      ))}

      {draft && (
        <DraftSetRow
          setNumber={entry.sets.length + 1}
          isBodyweight={isBodyweight}
          suggestion={suggestion}
          draft={draft}
          onChange={setDraft}
          onCommit={commitDraft}
          onRemove={() => setDraft(null)}
        />
      )}

      <Pressable
        className="mt-1 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-2/50 py-3.5 active:opacity-70 disabled:opacity-40"
        disabled={draft !== null || committing}
        onPress={handleAddSet}
      >
        <Plus size={18} color="#22C55E" strokeWidth={2.25} />
        <Text className="font-bold text-primary">Add Set</Text>
      </Pressable>
    </View>
  );
}

function DraftSetRow({
  setNumber,
  isBodyweight,
  suggestion,
  draft,
  onChange,
  onCommit,
  onRemove,
}: {
  setNumber: number;
  isBodyweight: boolean;
  suggestion: { weight: number; reps: number } | null;
  draft: { weight: string; reps: string };
  onChange: (next: { weight: string; reps: string }) => void;
  onCommit: () => Promise<void>;
  onRemove: () => void;
}) {
  const weightPlaceholder = suggestion
    ? formatSetWeight(suggestion.weight, isBodyweight)
    : isBodyweight
      ? 'BW'
      : '';
  const repsPlaceholder = suggestion ? String(suggestion.reps) : '';
  return (
    <View className="mb-1.5 flex-row items-center rounded-xl border border-primary-dim/40 bg-surface-2 px-3 py-2">
      <Text className="w-9 font-bold text-primary/60">#{setNumber}</Text>
      <View className="flex-1 flex-row items-center justify-center gap-8">
        <TextInput
          className="w-16 rounded-md bg-surface px-2 py-2 text-center text-base font-semibold text-white"
          value={draft.weight}
          onChangeText={(t) => onChange({ ...draft, weight: t })}
          onBlur={onCommit}
          placeholder={weightPlaceholder}
          placeholderTextColor="#16803C"
          keyboardType="decimal-pad"
          selectTextOnFocus
          returnKeyType="next"
        />
        <TextInput
          className="w-14 rounded-md bg-surface px-2 py-2 text-center text-base font-semibold text-white"
          value={draft.reps}
          onChangeText={(t) => onChange({ ...draft, reps: t })}
          onBlur={onCommit}
          placeholder={repsPlaceholder}
          placeholderTextColor="#16803C"
          keyboardType="number-pad"
          selectTextOnFocus
          returnKeyType="done"
        />
      </View>
      <Pressable onPress={onRemove} hitSlop={8} className="w-6 items-end">
        <Trash2 size={16} color="#8B98A9" strokeWidth={1.75} />
      </Pressable>
    </View>
  );
}

function SetRow({
  set,
  isBodyweight,
  onUpdate,
  onDelete,
}: {
  set: WorkoutSet;
  isBodyweight: boolean;
  onUpdate: (patch: { weight?: number; reps?: number }) => Promise<void>;
  onDelete: () => void;
}) {
  const [weightDraft, setWeightDraft] = useState(
    formatSetWeight(Number(set.weight), isBodyweight)
  );
  const [repsDraft, setRepsDraft] = useState(String(set.reps));

  // Reflect external updates (other tabs, undo, etc.) back into the inputs.
  useEffect(() => {
    setWeightDraft(formatSetWeight(Number(set.weight), isBodyweight));
  }, [set.weight, isBodyweight]);
  useEffect(() => {
    setRepsDraft(String(set.reps));
  }, [set.reps]);

  async function commitWeight() {
    const next = parseSetWeightInput(weightDraft, isBodyweight);
    if (next === null || next === Number(set.weight)) {
      setWeightDraft(formatSetWeight(Number(set.weight), isBodyweight));
      return;
    }
    try {
      await onUpdate({ weight: next });
    } catch (err: any) {
      Alert.alert('Could not save', err.message);
      setWeightDraft(formatSetWeight(Number(set.weight), isBodyweight));
    }
  }

  async function commitReps() {
    const next = parseInt(repsDraft, 10);
    if (Number.isNaN(next) || next <= 0) {
      setRepsDraft(String(set.reps));
      return;
    }
    if (next === set.reps) return;
    try {
      await onUpdate({ reps: next });
    } catch (err: any) {
      Alert.alert('Could not save', err.message);
      setRepsDraft(String(set.reps));
    }
  }

  return (
    <View className="mb-1.5 flex-row items-center rounded-xl bg-surface-2 px-3 py-2">
      <Text className="w-9 font-bold text-primary">#{set.set_number}</Text>
      <View className="flex-1 flex-row items-center justify-center gap-8">
        <TextInput
          className="w-16 rounded-md bg-surface px-2 py-2 text-center text-base font-semibold text-white"
          value={weightDraft}
          onChangeText={setWeightDraft}
          onBlur={commitWeight}
          keyboardType="decimal-pad"
          selectTextOnFocus
          returnKeyType="done"
        />
        <TextInput
          className="w-14 rounded-md bg-surface px-2 py-2 text-center text-base font-semibold text-white"
          value={repsDraft}
          onChangeText={setRepsDraft}
          onBlur={commitReps}
          keyboardType="number-pad"
          selectTextOnFocus
          returnKeyType="done"
        />
      </View>
      <Pressable onPress={onDelete} hitSlop={8} className="w-6 items-end">
        <Trash2 size={16} color="#8B98A9" strokeWidth={1.75} />
      </Pressable>
    </View>
  );
}

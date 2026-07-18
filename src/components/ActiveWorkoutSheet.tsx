import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { ChevronDown, Plus, Trash2, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExercisePicker } from '@/components/ExercisePicker';
import { MuscleMap } from '@/components/MuscleMap';
import { RestTimer } from '@/components/RestTimer';
import { RestTimerLocked } from '@/components/RestTimerLocked';
import type { ShareStats } from '@/components/ShareableWorkoutCard';
import { WorkoutShareSheet } from '@/components/WorkoutShareSheet';
import { BlurHeaderBackground } from '@/lib/blurHeader';
import {
  WorkoutSummaryModal,
  type SelectedPhoto,
  type WorkoutVisibility,
} from '@/components/WorkoutSummaryModal';
import { type WorkoutEntry } from '@/hooks/useActiveWorkout';
import { useActiveWorkoutContext } from '@/providers/ActiveWorkoutProvider';
import { formatDuration, formatSetWeight, parseSetWeightInput } from '@/lib/format';
import { mergeMuscles } from '@/lib/muscles';
import { fireMilestoneIfDue, resetMilestoneTracker } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import type { ExerciseMuscle, WorkoutSet, WorkoutSummary } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { usePremium } from '@/providers/PremiumProvider';

/**
 * The active workout, mounted once at the root as a pull-up sheet that floats
 * over whatever screen the user is on. Tapping the floating pill pulls it up to
 * full screen; the down-chevron in its header drops it back to the pill,
 * leaving the workout running and the user exactly where they were.
 *
 * The summary + share modals live here (not gated on the sheet being up) so the
 * post-finish flow survives the sheet dropping away when the workout clears.
 */
export function ActiveWorkoutSheet() {
  const { session, profile, refreshProfile } = useAuth();
  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const {
    workout,
    entries,
    expanded,
    collapse,
    addExercise,
    removeExercise,
    logSet,
    updateSet,
    deleteSet,
    finish,
    discard,
  } = useActiveWorkoutContext();

  // Height of the floating compact header (elapsed + actions), so the exercise
  // list rests below it but scrolls *under* the blur.
  const [activeHeaderHeight, setActiveHeaderHeight] = useState(insets.top + 64);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [restTrigger, setRestTrigger] = useState(0);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [summaryMuscles, setSummaryMuscles] = useState<ExerciseMuscle[]>([]);
  const [shareStats, setShareStats] = useState<ShareStats | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [summaryPhotos, setSummaryPhotos] = useState<SelectedPhoto[]>([]);
  const [summaryVisibility, setSummaryVisibility] = useState<WorkoutVisibility>('public');
  const [summaryTitle, setSummaryTitle] = useState('');
  const [summaryDefaultTitle, setSummaryDefaultTitle] = useState('');
  const [savingSummary, setSavingSummary] = useState(false);
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

  // Slide the sheet up to full screen when expanded, down off-screen otherwise.
  const translateY = useSharedValue(height);
  useEffect(() => {
    translateY.value = withTiming(expanded ? 0 : height, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, height, translateY]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

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
    <>
      {workout && (
        <Animated.View
          pointerEvents={expanded ? 'auto' : 'none'}
          style={[StyleSheet.absoluteFill, animStyle]}
        >
          <View className="flex-1 bg-background">
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              className="flex-1"
            >
              <ExerciseList
                entries={entries}
                topInset={activeHeaderHeight}
                ListHeader={
                  <View className="pb-1 pt-3">
                    <View className="flex-row items-center rounded-xl bg-surface py-2">
                      <SummaryStat value={String(entries.length)} label="Exercises" />
                      <View className="h-6 w-px bg-white/10" />
                      <SummaryStat value={String(totalSets)} label="Sets" />
                      <View className="h-6 w-px bg-white/10" />
                      <SummaryStat value={totalVolume.toLocaleString()} label="Volume · lbs" />
                    </View>

                    <View className="mb-1 mt-3">
                      {isPremium ? (
                        <RestTimer trigger={restTrigger} />
                      ) : (
                        <RestTimerLocked trigger={restTrigger} />
                      )}
                    </View>
                  </View>
                }
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

            {/* Floating compact header: the list (incl. its title/stats/timer
                header) blurs under it as you scroll. */}
            <View
              onLayout={(e) => setActiveHeaderHeight(e.nativeEvent.layout.height)}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top }}
            >
              <BlurHeaderBackground />
              {/* Compact bar — always visible. The down-chevron drops the sheet
                  back to the pill, leaving the workout running so the user can
                  do other things and resume from the pill. */}
              <View className="flex-row items-center justify-between px-4 py-3">
                <View className="flex-row items-center gap-1.5">
                  <Pressable
                    className="-ml-1 h-9 w-9 items-center justify-center rounded-full active:opacity-60"
                    onPress={collapse}
                    hitSlop={6}
                  >
                    <ChevronDown size={26} color="#FFFFFF" strokeWidth={2} />
                  </Pressable>
                  <View className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <ElapsedTime since={workout.started_at} />
                </View>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    className="h-10 w-10 items-center justify-center rounded-full bg-surface active:opacity-70"
                    onPress={handleDiscard}
                  >
                    <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                  </Pressable>
                  <Pressable
                    className="rounded-full bg-primary px-5 py-2.5 active:opacity-80 disabled:opacity-50"
                    disabled={finishing}
                    onPress={handleFinish}
                  >
                    <Text className="font-bold text-background">
                      {finishing ? 'Saving…' : 'Finish'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

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
    </>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text
        className="text-[15px] font-bold text-white"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
      <Text className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted">
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
    <Text
      className="text-sm font-semibold text-white/80"
      style={{ fontVariant: ['tabular-nums'] }}
    >
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
  topInset,
  ListHeader,
}: {
  entries: WorkoutEntry[];
  onAddPress: () => void;
  topInset: number;
  ListHeader?: React.ReactNode;
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
      contentContainerStyle={{ paddingTop: topInset, paddingHorizontal: 20, paddingBottom: 24 }}
      scrollIndicatorInsets={{ top: topInset }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {ListHeader}
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
      className="mt-4 flex-row items-center justify-center gap-2 rounded-full border border-white/10 py-5 active:opacity-70"
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
  // A freshly added exercise (no logged sets yet) opens with an empty draft row
  // already showing — the user almost always wants at least one set, so they can
  // start typing immediately instead of tapping "Add Set" first. The initializer
  // only runs on mount (the card is keyed by exercise id), so committing or
  // removing this first draft won't make it reappear.
  const [draft, setDraft] = useState<{ weight: string; reps: string } | null>(
    entry.sets.length === 0 ? { weight: '', reps: '' } : null
  );
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
    <View className="border-b border-white/5 pb-5 pt-4">
      <View className="mb-3 flex-row items-center gap-3">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-surface">
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
        className="mt-1 flex-row items-center justify-center gap-2 rounded-full border border-white/10 py-3 active:opacity-70 disabled:opacity-40"
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
    <View className="mb-1.5 flex-row items-center px-1 py-1">
      <Text className="w-9 font-bold text-primary/60">#{setNumber}</Text>
      <View className="flex-1 flex-row items-center justify-center gap-8">
        <TextInput
          className="w-16 rounded-md border border-primary-dim/50 bg-surface px-2 py-2 text-center text-base font-semibold text-white"
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
          className="w-14 rounded-md border border-primary-dim/50 bg-surface px-2 py-2 text-center text-base font-semibold text-white"
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
    <View className="mb-1.5 flex-row items-center px-1 py-1">
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

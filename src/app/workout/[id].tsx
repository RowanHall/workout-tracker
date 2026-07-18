import { router, useLocalSearchParams } from 'expo-router';
import { Medal, Share2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { MuscleMap } from '@/components/MuscleMap';
import type { ShareStats } from '@/components/ShareableWorkoutCard';
import { WorkoutOptionsMenu } from '@/components/WorkoutOptionsMenu';
import { WorkoutPhotosCarousel } from '@/components/WorkoutPhotosCarousel';
import { WorkoutShareSheet } from '@/components/WorkoutShareSheet';
import { useHeaderInset } from '@/lib/blurHeader';
import { formatDuration, formatVolume, timeAgo } from '@/lib/format';
import { mergeMuscles } from '@/lib/muscles';
import { supabase } from '@/lib/supabase';
import type { ExerciseMuscle, MuscleGroup, Workout, WorkoutSet } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';

interface DetailSet extends WorkoutSet {
  created_at: string;
  exercises: {
    name: string;
    muscle_group: MuscleGroup;
    muscles: ExerciseMuscle[];
    is_bodyweight: boolean;
  };
}

interface WorkoutDetail extends Workout {
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  workout_sets: DetailSet[];
  workout_photos: { photo_url: string; position: number }[];
}

interface ExerciseGroup {
  name: string;
  muscleGroup: MuscleGroup;
  muscles: ExerciseMuscle[];
  sets: DetailSet[];
}

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  full_body: 'Full Body',
};

function groupByExercise(sets: DetailSet[]): ExerciseGroup[] {
  const ordered = [...sets].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const groups = new Map<number, ExerciseGroup>();
  for (const set of ordered) {
    let group = groups.get(set.exercise_id);
    if (!group) {
      group = {
        name: set.exercises.name,
        muscleGroup: set.exercises.muscle_group,
        muscles: set.exercises.muscles ?? [],
        sets: [],
      };
      groups.set(set.exercise_id, group);
    }
    group.sets.push(set);
  }
  for (const group of groups.values()) {
    group.sets.sort((a, b) => a.set_number - b.set_number);
  }
  return [...groups.values()];
}

interface MuscleGroupSlice {
  group: MuscleGroup;
  pct: number;
}

/**
 * Share of the workout per muscle group, by volume (weight × reps). Pure
 * bodyweight workouts (all zero volume) fall back to set counts so the split
 * still reflects where the effort went.
 */
function muscleGroupBreakdown(exercises: ExerciseGroup[]): MuscleGroupSlice[] {
  const totals = new Map<MuscleGroup, number>();
  for (const ex of exercises) {
    let volume = 0;
    for (const set of ex.sets) volume += Number(set.weight) * set.reps;
    totals.set(ex.muscleGroup, (totals.get(ex.muscleGroup) ?? 0) + volume);
  }
  let total = [...totals.values()].reduce((sum, v) => sum + v, 0);
  if (total === 0) {
    totals.clear();
    for (const ex of exercises) {
      totals.set(ex.muscleGroup, (totals.get(ex.muscleGroup) ?? 0) + ex.sets.length);
    }
    total = [...totals.values()].reduce((sum, v) => sum + v, 0);
  }
  return [...totals.entries()]
    .map(([group, v]) => ({ group, pct: total === 0 ? 0 : (v / total) * 100 }))
    .sort((a, b) => b.pct - a.pct);
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const myId = session?.user.id ?? null;
  const headerInset = useHeaderInset();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('workouts')
      .select(
        `*,
         profiles (username, display_name, avatar_url),
         workout_sets (*, exercises (name, muscle_group, muscles, is_bodyweight)),
         workout_photos (photo_url, position)`
      )
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setWorkout(data as unknown as WorkoutDetail | null);
        setLoaded(true);
      });
  }, [id]);

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#22C55E" size="large" />
      </View>
    );
  }

  if (!workout) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="mb-1 text-lg font-bold text-white">Workout not found</Text>
        <Text className="text-center text-muted">
          It may have been deleted, or you may not follow this lifter anymore.
        </Text>
      </View>
    );
  }

  const name = workout.profiles.display_name ?? workout.profiles.username;
  const exercises = groupByExercise(workout.workout_sets);
  const combinedMuscles = mergeMuscles(exercises.map((e) => e.muscles));
  const prCount = workout.workout_sets.filter((s) => s.is_pr).length;
  const durationLabel = workout.ended_at
    ? formatDuration(workout.started_at, workout.ended_at)
    : null;
  const photoUrls = [...(workout.workout_photos ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((p) => p.photo_url);
  const breakdown = muscleGroupBreakdown(exercises);

  const shareStats: ShareStats = {
    workoutId: workout.id,
    title: workout.title,
    dateIso: workout.ended_at ?? workout.started_at,
    volume: workout.total_volume,
    sets: workout.total_sets,
    durationLabel,
    prCount,
    streak: null,
    athleteName: name,
    muscles: combinedMuscles,
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingTop: headerInset, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <IdentityRow
          name={name}
          username={workout.profiles.username}
          avatarUrl={workout.profiles.avatar_url}
          dateIso={workout.ended_at ?? workout.started_at}
          onAvatarPress={() => router.push(`/user/${workout.user_id}`)}
          onSharePress={() => setShareOpen(true)}
          optionsMenu={
            myId ? (
              <WorkoutOptionsMenu
                workoutId={workout.id}
                workoutOwnerId={workout.user_id}
                workoutOwnerUsername={workout.profiles.username}
                currentUserId={myId}
                onBlocked={() => router.back()}
                iconColor="#FFFFFF"
              />
            ) : null
          }
        />

        <View className="px-5 pt-6">
          <Text
            className="text-[22px] font-bold text-white"
            style={{ letterSpacing: -0.4 }}
          >
            {workout.title}
          </Text>
        </View>

        <View className="mt-3 mx-5 border-y border-white/5">
          <View className="flex-row py-4">
            {durationLabel && (
              <>
                <PillStat label="Time" value={durationLabel} />
                <VBar />
              </>
            )}
            <PillStat label="Volume" value={formatVolume(workout.total_volume)} />
            <VBar />
            <PillStat label="Sets" value={String(workout.total_sets)} />
            <VBar />
            <PillStat label="PRs" value={String(prCount)} highlight={prCount > 0} />
          </View>
        </View>

        {photoUrls.length > 0 && (
          <View className="mt-5 px-4">
            <WorkoutPhotosCarousel urls={photoUrls} />
          </View>
        )}

        {combinedMuscles.length > 0 && (
          <Section label="Muscles Worked">
            <View className="flex-row items-center gap-4">
              <View className="w-[130px] rounded-2xl bg-background">
                <MuscleMap muscles={combinedMuscles} />
              </View>
              {breakdown.length > 0 && (
                <View className="flex-1 gap-2.5">
                  {breakdown.slice(0, 6).map((row) => (
                    <BarRow
                      key={row.group}
                      label={MUSCLE_LABELS[row.group]}
                      pct={row.pct}
                      width={(row.pct / breakdown[0].pct) * 100}
                    />
                  ))}
                </View>
              )}
            </View>
          </Section>
        )}

        <Section label="Exercises" eyebrowSuffix={`${exercises.length} total`}>
          {exercises.length === 0 ? (
            <Text className="text-muted">No sets were logged.</Text>
          ) : (
            exercises.map((exercise, i) => (
              <ExerciseBlock key={exercise.name} exercise={exercise} divider={i > 0} />
            ))
          )}
        </Section>
      </ScrollView>
      <WorkoutShareSheet
        visible={shareOpen}
        stats={shareStats}
        onClose={() => setShareOpen(false)}
      />
    </>
  );
}

function IdentityRow({
  name,
  username,
  avatarUrl,
  dateIso,
  onAvatarPress,
  onSharePress,
  optionsMenu,
}: {
  name: string;
  username: string;
  avatarUrl?: string | null;
  dateIso: string;
  onAvatarPress: () => void;
  onSharePress: () => void;
  optionsMenu?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between px-5 pt-3">
      <Pressable
        onPress={onAvatarPress}
        className="flex-1 flex-row items-center gap-3 active:opacity-70"
        hitSlop={4}
      >
        <Avatar url={avatarUrl} name={name} size={40} />
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-white" numberOfLines={1}>
            {name}
          </Text>
          <Text className="text-xs text-muted" numberOfLines={1}>
            @{username} · {timeAgo(dateIso)}
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={onSharePress}
        className="ml-3 flex-row items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-2 active:opacity-70"
        hitSlop={6}
      >
        <Share2 size={14} color="#22C55E" strokeWidth={2.5} />
        <Text className="text-xs font-bold text-primary">Share</Text>
      </Pressable>

      {optionsMenu && <View className="ml-2.5">{optionsMenu}</View>}
    </View>
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
    <View className="px-5 pt-8">
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

function PillStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View className="flex-1 items-center px-1">
      <Text
        className={`text-[17px] font-extrabold ${highlight ? 'text-accent' : 'text-white'}`}
        style={{ letterSpacing: -0.3, fontVariant: ['tabular-nums'] }}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text className="mt-0.5 text-[9px] font-semibold uppercase tracking-[1.5px] text-muted">
        {label}
      </Text>
    </View>
  );
}

function VBar() {
  return <View className="w-px bg-white/5" />;
}

function BarRow({ label, pct, width }: { label: string; pct: number; width: number }) {
  return (
    <View>
      <View className="mb-1.5 flex-row items-baseline justify-between">
        <Text className="text-[13px] text-white" numberOfLines={1}>
          {label}
        </Text>
        <Text className="text-[13px] text-muted" style={{ fontVariant: ['tabular-nums'] }}>
          {pct.toFixed(0)}%
        </Text>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(3, Math.round(width))}%` }}
        />
      </View>
    </View>
  );
}

function ExerciseBlock({
  exercise,
  divider,
}: {
  exercise: ExerciseGroup;
  divider: boolean;
}) {
  return (
    <View
      className={
        divider
          ? 'mt-6 border-t border-white/5 pt-6'
          : 'mt-1'
      }
    >
      <View className="mb-3 flex-row items-baseline justify-between gap-3">
        <Text
          className="flex-1 text-lg font-bold text-white"
          style={{ letterSpacing: -0.3 }}
          numberOfLines={1}
        >
          {exercise.name}
        </Text>
        <Text className="text-[11px] font-medium uppercase tracking-[1.5px] text-muted/70">
          {MUSCLE_LABELS[exercise.muscleGroup]}
        </Text>
      </View>

      {exercise.sets.map((set) => (
        <SetLine key={set.id} set={set} />
      ))}
    </View>
  );
}

function setLoadLabel(set: DetailSet): string {
  const weight = Number(set.weight);
  if (!set.exercises.is_bodyweight) return `${weight.toLocaleString()} lbs`;
  return weight === 0 ? 'BW' : `BW +${weight.toLocaleString()} lbs`;
}

function SetLine({ set }: { set: DetailSet }) {
  return (
    <View className="flex-row items-center border-b border-white/5 py-2.5">
      <Text
        className="w-10 text-sm text-muted"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        #{set.set_number}
      </Text>
      <Text
        className="flex-1 text-[15px] font-semibold text-white"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {setLoadLabel(set)} × {set.reps}
      </Text>
      {set.is_pr && (
        <View className="flex-row items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5">
          <Medal size={11} color="#F59E0B" strokeWidth={2.25} />
          <Text className="text-[10px] font-bold uppercase tracking-wider text-accent">
            PR
          </Text>
        </View>
      )}
    </View>
  );
}

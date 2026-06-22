import { router, useLocalSearchParams } from 'expo-router';
import { Medal, Share2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { MuscleMap } from '@/components/MuscleMap';
import type { ShareStats } from '@/components/ShareableWorkoutCard';
import { WorkoutPhotosCarousel } from '@/components/WorkoutPhotosCarousel';
import { WorkoutShareSheet } from '@/components/WorkoutShareSheet';
import { formatDuration, formatVolume, timeAgo } from '@/lib/format';
import { mergeMuscles } from '@/lib/muscles';
import { supabase } from '@/lib/supabase';
import type { ExerciseMuscle, MuscleGroup, Workout, WorkoutSet } from '@/lib/types';

interface DetailSet extends WorkoutSet {
  created_at: string;
  exercises: { name: string; muscle_group: MuscleGroup; muscles: ExerciseMuscle[] };
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

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
         workout_sets (*, exercises (name, muscle_group, muscles)),
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
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <IdentityRow
          name={name}
          username={workout.profiles.username}
          avatarUrl={workout.profiles.avatar_url}
          dateIso={workout.ended_at ?? workout.started_at}
          onAvatarPress={() => router.push(`/user/${workout.user_id}`)}
          onSharePress={() => setShareOpen(true)}
        />

        <View className="px-5 pt-6">
          <Text
            className="text-[28px] font-bold text-white"
            style={{ letterSpacing: -0.5 }}
          >
            {workout.title}
          </Text>
        </View>

        {photoUrls.length > 0 && (
          <View className="mt-5 px-4">
            <WorkoutPhotosCarousel urls={photoUrls} />
          </View>
        )}

        <View className="mt-2 mx-5 border-y border-white/5">
          <View className="flex-row py-5">
            <PillStat label="Volume" value={formatVolume(workout.total_volume)} />
            <VBar />
            <PillStat label="Sets" value={String(workout.total_sets)} />
            {durationLabel && (
              <>
                <VBar />
                <PillStat label="Time" value={durationLabel} />
              </>
            )}
            <VBar />
            <PillStat label="PRs" value={String(prCount)} highlight={prCount > 0} />
          </View>
        </View>

        {combinedMuscles.length > 0 && (
          <Section label="Muscles Worked">
            <View className="items-center rounded-2xl bg-surface py-5">
              <MuscleMap muscles={combinedMuscles} />
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
}: {
  name: string;
  username: string;
  avatarUrl?: string | null;
  dateIso: string;
  onAvatarPress: () => void;
  onSharePress: () => void;
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
        className={`text-[22px] font-extrabold ${highlight ? 'text-accent' : 'text-white'}`}
        style={{ letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text className="mt-0.5 text-[10px] font-semibold uppercase tracking-[2px] text-muted">
        {label}
      </Text>
    </View>
  );
}

function VBar() {
  return <View className="w-px bg-white/5" />;
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
        {Number(set.weight).toLocaleString()} lbs × {set.reps}
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

import { router, useLocalSearchParams } from 'expo-router';
import { Medal, Share2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import type { ShareStats } from '@/components/ShareableWorkoutCard';
import { WorkoutShareSheet } from '@/components/WorkoutShareSheet';
import { Avatar } from '@/components/Avatar';
import { MuscleMap } from '@/components/MuscleMap';
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
         workout_sets (*, exercises (name, muscle_group, muscles))`
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
  const shareStats: ShareStats = {
    workoutId: workout.id,
    title: workout.title,
    dateIso: workout.ended_at ?? workout.started_at,
    volume: workout.total_volume,
    sets: workout.total_sets,
    durationLabel: workout.ended_at
      ? formatDuration(workout.started_at, workout.ended_at)
      : null,
    prCount,
    streak: null,
    athleteName: name,
    muscles: combinedMuscles,
  };

  return (
    <>
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <View className="mb-4 rounded-2xl bg-surface p-4">
        <Pressable
          className="mb-3 flex-row items-center active:opacity-70"
          onPress={() => router.push(`/user/${workout.user_id}`)}
        >
          <View className="mr-3">
            <Avatar url={workout.profiles.avatar_url} name={name} size={40} />
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-white">{name}</Text>
            <Text className="text-xs text-muted">
              @{workout.profiles.username} · {timeAgo(workout.ended_at ?? workout.started_at)}
            </Text>
          </View>
        </Pressable>

        <Text className="mb-3 text-xl font-bold text-white">{workout.title}</Text>
        <View className="flex-row items-end justify-between">
          <View className="flex-row gap-4">
            <Stat label="Volume" value={formatVolume(workout.total_volume)} />
            <Stat label="Sets" value={String(workout.total_sets)} />
            {workout.ended_at && (
              <Stat label="Time" value={formatDuration(workout.started_at, workout.ended_at)} />
            )}
          </View>
          <Pressable
            className="flex-row items-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 active:opacity-70"
            onPress={() => setShareOpen(true)}
            hitSlop={6}
          >
            <Share2 size={16} color="#22C55E" strokeWidth={2.25} />
            <Text className="text-xs font-semibold text-primary">Share</Text>
          </Pressable>
        </View>

        {combinedMuscles.length > 0 && (
          <View className="mt-4 rounded-2xl bg-surface-2 p-4">
            <Text className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-muted">
              Muscles Worked
            </Text>
            <MuscleMap muscles={combinedMuscles} />
          </View>
        )}
      </View>

      {exercises.map((exercise) => (
        <View key={exercise.name} className="mb-3 rounded-2xl bg-surface p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="flex-1 text-base font-bold text-white">{exercise.name}</Text>
            <View className="rounded-full bg-surface-2 px-2.5 py-1">
              <Text className="text-xs font-semibold text-muted">
                {MUSCLE_LABELS[exercise.muscleGroup]}
              </Text>
            </View>
          </View>

          {exercise.sets.map((set) => (
            <View
              key={set.id}
              className="flex-row items-center border-t border-border py-2.5"
            >
              <Text className="w-14 text-sm text-muted">Set {set.set_number}</Text>
              <Text className="flex-1 text-sm font-semibold text-white">
                {Number(set.weight).toLocaleString()} lbs × {set.reps}
              </Text>
              {set.is_pr && (
                <View className="flex-row items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1">
                  <Medal size={12} color="#F59E0B" strokeWidth={2} />
                  <Text className="text-xs font-bold text-accent">PR</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ))}

      {exercises.length === 0 && (
        <Text className="mt-8 text-center text-muted">No sets were logged.</Text>
      )}
    </ScrollView>
    <WorkoutShareSheet
      visible={shareOpen}
      stats={shareStats}
      onClose={() => setShareOpen(false)}
    />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </Text>
      <Text className="text-base font-extrabold text-white">{value}</Text>
    </View>
  );
}

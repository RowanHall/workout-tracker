import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { formatDuration, formatVolume, timeAgo } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { MuscleGroup, Workout, WorkoutSet } from '@/lib/types';

interface DetailSet extends WorkoutSet {
  created_at: string;
  exercises: { name: string; muscle_group: MuscleGroup };
}

interface WorkoutDetail extends Workout {
  profiles: {
    username: string;
    display_name: string | null;
    current_level: number;
  };
  workout_sets: DetailSet[];
}

interface ExerciseGroup {
  name: string;
  muscleGroup: MuscleGroup;
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

  useEffect(() => {
    if (!id) return;
    supabase
      .from('workouts')
      .select(
        `*,
         profiles (username, display_name, current_level),
         workout_sets (*, exercises (name, muscle_group))`
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

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <View className="mb-4 rounded-2xl bg-surface p-4">
        <View className="mb-3 flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary-dim">
            <Text className="font-bold text-white">{name.charAt(0).toUpperCase()}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-white">{name}</Text>
            <Text className="text-xs text-muted">
              @{workout.profiles.username} · {timeAgo(workout.ended_at ?? workout.started_at)}
            </Text>
          </View>
          <View className="rounded-full bg-surface-2 px-2.5 py-1">
            <Text className="text-xs font-bold text-primary">
              LVL {workout.profiles.current_level}
            </Text>
          </View>
        </View>

        <Text className="mb-3 text-xl font-bold text-white">{workout.title}</Text>
        <View className="flex-row gap-4">
          <Stat label="Volume" value={formatVolume(workout.total_volume)} />
          <Stat label="Sets" value={String(workout.total_sets)} />
          {workout.ended_at && (
            <Stat label="Time" value={formatDuration(workout.started_at, workout.ended_at)} />
          )}
          <Stat label="EXP" value={`+${workout.exp_earned}`} highlight />
        </View>
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
                <View className="rounded-full bg-accent/20 px-2.5 py-1">
                  <Text className="text-xs font-bold text-accent">🏅 PR</Text>
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
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View>
      <Text className="text-xs text-muted">{label}</Text>
      <Text className={`font-bold ${highlight ? 'text-primary' : 'text-white'}`}>
        {value}
      </Text>
    </View>
  );
}

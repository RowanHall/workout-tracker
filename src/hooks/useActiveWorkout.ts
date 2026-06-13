import { useCallback, useEffect, useState } from 'react';

import { dateKey, workoutTitleForNow } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Exercise, Workout, WorkoutSet, WorkoutSummary } from '@/lib/types';

export interface WorkoutEntry {
  exercise: Exercise;
  sets: WorkoutSet[];
}

/**
 * Manages the in-progress workout. Sets are written to Supabase as they are
 * logged so nothing is lost if the app closes; an unfinished workout is
 * resumed on mount.
 */
export function useActiveWorkout(userId: string | undefined) {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [entries, setEntries] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function resume() {
      const { data: open } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId!)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled && open) {
        const { data: sets } = await supabase
          .from('workout_sets')
          .select('*, exercises(*)')
          .eq('workout_id', open.id)
          .order('created_at');

        const byExercise = new Map<number, WorkoutEntry>();
        for (const row of (sets as any[]) ?? []) {
          const { exercises: exercise, ...set } = row;
          if (!byExercise.has(exercise.id)) {
            byExercise.set(exercise.id, { exercise, sets: [] });
          }
          byExercise.get(exercise.id)!.sets.push(set as WorkoutSet);
        }
        setWorkout(open as Workout);
        setEntries([...byExercise.values()]);
      }
      if (!cancelled) setLoading(false);
    }

    resume();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const start = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('workouts')
      .insert({ user_id: userId, title: workoutTitleForNow() })
      .select()
      .single();
    if (error) throw error;
    setWorkout(data as Workout);
    setEntries([]);
  }, [userId]);

  const addExercise = useCallback((exercise: Exercise) => {
    setEntries((prev) =>
      prev.some((e) => e.exercise.id === exercise.id)
        ? prev
        : [...prev, { exercise, sets: [] }]
    );
  }, []);

  const logSet = useCallback(
    async (exerciseId: number, weight: number, reps: number) => {
      if (!workout) return;
      const entry = entries.find((e) => e.exercise.id === exerciseId);
      const setNumber = (entry?.sets.length ?? 0) + 1;
      const { data, error } = await supabase
        .from('workout_sets')
        .insert({
          workout_id: workout.id,
          exercise_id: exerciseId,
          set_number: setNumber,
          weight,
          reps,
        })
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) =>
          e.exercise.id === exerciseId
            ? { ...e, sets: [...e.sets, data as WorkoutSet] }
            : e
        )
      );
    },
    [workout, entries]
  );

  const deleteSet = useCallback(async (exerciseId: number, setId: string) => {
    await supabase.from('workout_sets').delete().eq('id', setId);
    setEntries((prev) =>
      prev.map((e) =>
        e.exercise.id === exerciseId
          ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
          : e
      )
    );
  }, []);

  const finish = useCallback(async (): Promise<WorkoutSummary | null> => {
    if (!workout) return null;
    const { data, error } = await supabase.rpc('finish_workout', {
      p_workout_id: workout.id,
      p_today: dateKey(new Date()),
    });
    if (error) throw error;
    setWorkout(null);
    setEntries([]);
    return data as WorkoutSummary;
  }, [workout]);

  const discard = useCallback(async () => {
    if (!workout) return;
    await supabase.from('workouts').delete().eq('id', workout.id);
    setWorkout(null);
    setEntries([]);
  }, [workout]);

  return { workout, entries, loading, start, addExercise, logSet, deleteSet, finish, discard };
}

import { useCallback, useEffect, useState } from 'react';

import { dateKey, workoutTitleForNow } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Exercise, Workout, WorkoutSet, WorkoutSummary } from '@/lib/types';


export interface PreviousSet {
  set_number: number;
  weight: number;
  reps: number;
}

export interface WorkoutEntry {
  exercise: Exercise;
  sets: WorkoutSet[];
  /** Sets from the user's most recent finished workout that included this
   *  exercise, used to suggest weight/reps for the current session. Empty
   *  when there's no prior history. */
  previousSets: PreviousSet[];
}

async function fetchPreviousSets(
  userId: string,
  exerciseId: number,
  excludeWorkoutId: string
): Promise<PreviousSet[]> {
  const { data: latest } = await supabase
    .from('workout_sets')
    .select('workout_id, workouts!inner(ended_at, user_id)')
    .eq('exercise_id', exerciseId)
    .eq('workouts.user_id', userId)
    .not('workouts.ended_at', 'is', null)
    .neq('workout_id', excludeWorkoutId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestId = (latest as { workout_id?: string } | null)?.workout_id;
  if (!latestId) return [];

  const { data: sets } = await supabase
    .from('workout_sets')
    .select('set_number, weight, reps')
    .eq('workout_id', latestId)
    .eq('exercise_id', exerciseId)
    .order('set_number', { ascending: true });

  return ((sets as PreviousSet[] | null) ?? []).map((s) => ({
    set_number: s.set_number,
    weight: Number(s.weight),
    reps: s.reps,
  }));
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
            byExercise.set(exercise.id, { exercise, sets: [], previousSets: [] });
          }
          byExercise.get(exercise.id)!.sets.push(set as WorkoutSet);
        }
        const resumed = [...byExercise.values()];
        const withPrev = await Promise.all(
          resumed.map(async (e) => ({
            ...e,
            previousSets: await fetchPreviousSets(userId!, e.exercise.id, open.id),
          }))
        );
        if (cancelled) return;
        setWorkout(open as Workout);
        setEntries(withPrev);
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

  // Starts a workout from a saved routine. The routine's planned sets are
  // loaded into each entry's `previousSets`, so the existing draft-set
  // placeholder pattern shows them as faded green hints (135 / 8) on the
  // empty set rows. No sets are pre-committed.
  const startFromRoutine = useCallback(
    async (routineId: string) => {
      if (!userId) return;
      const { data: routine, error: rErr } = await supabase
        .from('routines')
        .select(
          'id, title, routine_exercises ( id, position, exercises (*), routine_sets ( set_number, weight, reps ) )'
        )
        .eq('id', routineId)
        .single();
      if (rErr) throw rErr;

      const { data: newWorkout, error: wErr } = await supabase
        .from('workouts')
        .insert({ user_id: userId, title: routine.title })
        .select()
        .single();
      if (wErr) throw wErr;

      const routineExercises = ((routine as any).routine_exercises ?? []) as {
        id: string;
        position: number;
        exercises: Exercise;
        routine_sets: { set_number: number; weight: number; reps: number }[];
      }[];
      const ordered = [...routineExercises].sort((a, b) => a.position - b.position);
      const newEntries: WorkoutEntry[] = ordered.map((re) => ({
        exercise: re.exercises,
        sets: [],
        previousSets: (re.routine_sets ?? [])
          .slice()
          .sort((a, b) => a.set_number - b.set_number)
          .map((s) => ({
            set_number: s.set_number,
            weight: Number(s.weight),
            reps: s.reps,
          })),
      }));

      setWorkout(newWorkout as Workout);
      setEntries(newEntries);
    },
    [userId]
  );

  const addExercise = useCallback(
    async (exercise: Exercise) => {
      if (!userId || !workout) return;
      let alreadyHas = false;
      setEntries((prev) => {
        alreadyHas = prev.some((e) => e.exercise.id === exercise.id);
        return alreadyHas
          ? prev
          : [...prev, { exercise, sets: [], previousSets: [] }];
      });
      if (alreadyHas) return;
      const previousSets = await fetchPreviousSets(userId, exercise.id, workout.id);
      if (previousSets.length === 0) return;
      setEntries((prev) =>
        prev.map((e) =>
          e.exercise.id === exercise.id ? { ...e, previousSets } : e
        )
      );
    },
    [userId, workout]
  );

  const removeExercise = useCallback(
    async (exerciseId: number) => {
      if (!workout) return;
      const { error } = await supabase
        .from('workout_sets')
        .delete()
        .eq('workout_id', workout.id)
        .eq('exercise_id', exerciseId);
      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.exercise.id !== exerciseId));
    },
    [workout]
  );

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

  const updateSet = useCallback(
    async (exerciseId: number, setId: string, patch: { weight?: number; reps?: number }) => {
      const { error } = await supabase.from('workout_sets').update(patch).eq('id', setId);
      if (error) throw error;
      setEntries((prev) =>
        prev.map((e) =>
          e.exercise.id === exerciseId
            ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
            : e
        )
      );
    },
    []
  );

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

  return {
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
  };
}

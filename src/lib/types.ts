export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'full_body';

// Levels / EXP / trophies are paused: the columns and tables still exist in
// the database, but the app no longer reads them, so they are omitted here.
export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  current_streak: number;
  longest_streak: number;
  last_workout_date: string | null;
  preferred_unit: 'lbs' | 'kg';
}

export interface Exercise {
  id: number;
  name: string;
  muscle_group: MuscleGroup;
  is_custom: boolean;
}

export interface Workout {
  id: string;
  user_id: string;
  title: string;
  started_at: string;
  ended_at: string | null;
  total_volume: number;
  total_sets: number;
}

export interface WorkoutSet {
  id: string;
  workout_id: string;
  exercise_id: number;
  set_number: number;
  weight: number;
  reps: number;
  is_pr: boolean;
}

export interface BodyWeight {
  user_id: string;
  recorded_on: string;
  weight: number;
  created_at: string;
  updated_at: string;
}

export interface FeedInteraction {
  id: string;
  workout_id: string;
  user_id: string;
  type: 'cheer' | 'comment';
  content: string | null;
  created_at: string;
  profiles?: { username: string } | null;
}

export interface FeedWorkout extends Workout {
  profiles: {
    username: string;
    display_name: string | null;
  };
  workout_sets: { id: string; is_pr: boolean }[];
  feed_interactions: FeedInteraction[];
}

/** Payload of the finish_workout RPC. The function also returns paused
 *  gamification fields (exp_earned, leveled_up, new_tiers, …) which the app
 *  currently ignores. */
export interface WorkoutSummary {
  discarded?: boolean;
  total_volume: number;
  total_sets: number;
  streak: number;
  prs: { exercise: string; type: string; value: number }[];
}

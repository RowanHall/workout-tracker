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

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  current_level: number;
  total_exp: number;
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
  exp_earned: number;
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

export interface Trophy {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
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
    current_level: number;
  };
  workout_sets: { id: string; is_pr: boolean }[];
  feed_interactions: FeedInteraction[];
}

export interface WorkoutSummary {
  discarded?: boolean;
  exp_earned: number;
  total_volume: number;
  total_sets: number;
  streak: number;
  leveled_up: boolean;
  new_level: number;
  prs: { exercise: string; type: string; value: number }[];
  new_trophies: { code: string; name: string; icon: string }[];
}

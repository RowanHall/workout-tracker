import type { MuscleGroup } from '@/lib/types';

/**
 * Fine-grained muscle regions used by the body figure. These are more specific
 * than the broad `MuscleGroup` on an exercise (e.g. a bench press hits the
 * *mid* and *lower* chest, not just "chest"), so the figure can light up the
 * exact areas an exercise trains.
 */
export type MuscleRegion =
  | 'traps'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'upper_chest'
  | 'mid_chest'
  | 'lower_chest'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'lats'
  | 'mid_back'
  | 'lower_back'
  | 'abs'
  | 'obliques'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'adductors'
  | 'calves';

/** Intensity (0–1) each region is worked. 1 = primary mover, lower = assisting. */
export type Activation = Partial<Record<MuscleRegion, number>>;

export const MUSCLE_LABELS: Record<MuscleRegion, string> = {
  traps: 'Traps',
  front_delts: 'Front Delts',
  side_delts: 'Side Delts',
  rear_delts: 'Rear Delts',
  upper_chest: 'Upper Chest',
  mid_chest: 'Mid Chest',
  lower_chest: 'Lower Chest',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  lats: 'Lats',
  mid_back: 'Mid Back',
  lower_back: 'Lower Back',
  abs: 'Abs',
  obliques: 'Obliques',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  adductors: 'Adductors',
  calves: 'Calves',
};

/**
 * Per-exercise muscle activation, keyed by the exercise name in the seeded
 * library. Primary movers ≈ 1.0, synergists ≈ 0.4–0.7, stabilisers ≈ 0.2–0.4.
 * Unknown / custom exercises fall back to {@link GROUP_FALLBACK}.
 */
export const EXERCISE_ACTIVATION: Record<string, Activation> = {
  // Chest
  'Bench Press': { mid_chest: 1, lower_chest: 0.55, front_delts: 0.5, triceps: 0.45 },
  'Incline Bench Press': { upper_chest: 1, mid_chest: 0.4, front_delts: 0.6, triceps: 0.4 },
  'Dumbbell Bench Press': { mid_chest: 1, lower_chest: 0.5, front_delts: 0.5, triceps: 0.4 },
  'Incline Dumbbell Press': { upper_chest: 1, mid_chest: 0.35, front_delts: 0.6, triceps: 0.35 },
  'Dumbbell Fly': { mid_chest: 1, upper_chest: 0.5, front_delts: 0.3 },
  'Cable Crossover': { mid_chest: 0.9, lower_chest: 0.8, upper_chest: 0.4 },
  'Push-Up': { mid_chest: 0.9, lower_chest: 0.5, front_delts: 0.45, triceps: 0.5, abs: 0.3 },
  'Chest Dip': { lower_chest: 1, mid_chest: 0.6, triceps: 0.6, front_delts: 0.4 },
  'Machine Chest Press': { mid_chest: 1, lower_chest: 0.4, front_delts: 0.45, triceps: 0.45 },

  // Back
  Deadlift: { lower_back: 1, glutes: 0.8, hamstrings: 0.8, traps: 0.6, lats: 0.5, forearms: 0.4, quads: 0.4 },
  'Barbell Row': { lats: 1, mid_back: 0.8, rear_delts: 0.5, biceps: 0.5, traps: 0.4, lower_back: 0.4 },
  'Pull-Up': { lats: 1, mid_back: 0.6, biceps: 0.6, rear_delts: 0.4, forearms: 0.4 },
  'Chin-Up': { lats: 1, biceps: 0.8, mid_back: 0.5, forearms: 0.4 },
  'Lat Pulldown': { lats: 1, mid_back: 0.5, biceps: 0.5, rear_delts: 0.35 },
  'Seated Cable Row': { mid_back: 1, lats: 0.8, rear_delts: 0.5, biceps: 0.45, traps: 0.4 },
  'Dumbbell Row': { lats: 1, mid_back: 0.7, rear_delts: 0.4, biceps: 0.45, traps: 0.35 },
  'T-Bar Row': { mid_back: 1, lats: 0.85, biceps: 0.45, rear_delts: 0.45, traps: 0.4 },

  // Shoulders
  'Overhead Press': { front_delts: 1, side_delts: 0.6, triceps: 0.5, traps: 0.4, upper_chest: 0.3 },
  'Dumbbell Shoulder Press': { front_delts: 1, side_delts: 0.65, triceps: 0.45, traps: 0.35 },
  'Arnold Press': { front_delts: 1, side_delts: 0.7, triceps: 0.4, traps: 0.3 },
  'Lateral Raise': { side_delts: 1, front_delts: 0.35, traps: 0.3 },
  'Front Raise': { front_delts: 1, side_delts: 0.3, upper_chest: 0.3 },
  'Rear Delt Fly': { rear_delts: 1, mid_back: 0.5, traps: 0.3 },
  'Face Pull': { rear_delts: 1, traps: 0.5, mid_back: 0.45 },
  'Barbell Shrug': { traps: 1, forearms: 0.3 },

  // Biceps
  'Barbell Curl': { biceps: 1, forearms: 0.5 },
  'Dumbbell Curl': { biceps: 1, forearms: 0.45 },
  'Hammer Curl': { biceps: 0.9, forearms: 0.7 },
  'Preacher Curl': { biceps: 1, forearms: 0.4 },
  'Cable Curl': { biceps: 1, forearms: 0.4 },

  // Triceps
  'Close-Grip Bench Press': { triceps: 1, mid_chest: 0.5, front_delts: 0.4 },
  'Tricep Pushdown': { triceps: 1, forearms: 0.3 },
  'Skull Crusher': { triceps: 1, forearms: 0.25 },
  'Overhead Tricep Extension': { triceps: 1, forearms: 0.25 },
  'Tricep Dip': { triceps: 1, lower_chest: 0.5, front_delts: 0.4 },

  // Quads
  Squat: { quads: 1, glutes: 0.7, hamstrings: 0.45, lower_back: 0.4, adductors: 0.4, abs: 0.3, calves: 0.25 },
  'Front Squat': { quads: 1, glutes: 0.6, abs: 0.4, lower_back: 0.4, adductors: 0.35 },
  'Leg Press': { quads: 1, glutes: 0.6, hamstrings: 0.4, adductors: 0.35 },
  'Leg Extension': { quads: 1 },
  'Bulgarian Split Squat': { quads: 1, glutes: 0.8, hamstrings: 0.4, adductors: 0.35, calves: 0.25 },
  'Hack Squat': { quads: 1, glutes: 0.55, adductors: 0.35 },
  'Walking Lunge': { quads: 1, glutes: 0.75, hamstrings: 0.45, calves: 0.3 },
  'Goblet Squat': { quads: 1, glutes: 0.6, adductors: 0.4, abs: 0.35 },

  // Hamstrings
  'Romanian Deadlift': { hamstrings: 1, glutes: 0.7, lower_back: 0.6, traps: 0.3, forearms: 0.3 },
  'Lying Leg Curl': { hamstrings: 1, calves: 0.3 },
  'Seated Leg Curl': { hamstrings: 1, calves: 0.3 },
  'Good Morning': { hamstrings: 1, lower_back: 0.8, glutes: 0.6 },

  // Glutes
  'Hip Thrust': { glutes: 1, hamstrings: 0.5, quads: 0.3 },
  'Glute Bridge': { glutes: 1, hamstrings: 0.45, abs: 0.3 },
  'Cable Kickback': { glutes: 1, hamstrings: 0.4 },

  // Calves
  'Standing Calf Raise': { calves: 1 },
  'Seated Calf Raise': { calves: 1 },

  // Core
  Plank: { abs: 1, obliques: 0.6, lower_back: 0.3, front_delts: 0.2 },
  Crunch: { abs: 1, obliques: 0.4 },
  'Hanging Leg Raise': { abs: 1, obliques: 0.5, forearms: 0.3 },
  'Russian Twist': { obliques: 1, abs: 0.7 },
  'Ab Wheel Rollout': { abs: 1, obliques: 0.5, lats: 0.3, lower_back: 0.3 },
  'Cable Crunch': { abs: 1, obliques: 0.4 },

  // Full body
  'Clean and Press': {
    traps: 0.8, front_delts: 0.7, quads: 0.6, glutes: 0.6, lower_back: 0.6,
    hamstrings: 0.5, triceps: 0.4, forearms: 0.4, calves: 0.3,
  },
  'Kettlebell Swing': {
    glutes: 1, hamstrings: 0.8, lower_back: 0.6, quads: 0.4, front_delts: 0.4, forearms: 0.4, abs: 0.4,
  },
  "Farmer's Carry": { forearms: 1, traps: 0.8, abs: 0.5, glutes: 0.4, quads: 0.4, calves: 0.3 },
};

/** Reasonable default regions for an exercise we don't have a precise map for. */
export const GROUP_FALLBACK: Record<MuscleGroup, Activation> = {
  chest: { mid_chest: 1, upper_chest: 0.6, lower_chest: 0.6, front_delts: 0.4, triceps: 0.4 },
  back: { lats: 1, mid_back: 0.7, lower_back: 0.5, rear_delts: 0.4, biceps: 0.4, traps: 0.4 },
  shoulders: { front_delts: 1, side_delts: 0.8, rear_delts: 0.6, traps: 0.4 },
  biceps: { biceps: 1, forearms: 0.5 },
  triceps: { triceps: 1, forearms: 0.3 },
  quads: { quads: 1, glutes: 0.5, adductors: 0.4, hamstrings: 0.3 },
  hamstrings: { hamstrings: 1, glutes: 0.5, lower_back: 0.4 },
  glutes: { glutes: 1, hamstrings: 0.5 },
  calves: { calves: 1 },
  core: { abs: 1, obliques: 0.7, lower_back: 0.3 },
  full_body: {
    quads: 0.7, glutes: 0.7, lower_back: 0.6, traps: 0.6, front_delts: 0.5,
    hamstrings: 0.5, abs: 0.5, forearms: 0.5,
  },
};

/** Activation for a single exercise (by name, falling back to its group). */
export function activationFor(name: string, group: MuscleGroup): Activation {
  return EXERCISE_ACTIVATION[name] ?? GROUP_FALLBACK[group] ?? {};
}

export interface ExerciseLoad {
  name: string;
  group: MuscleGroup;
  /** Relative emphasis, e.g. number of sets or total volume. Defaults to 1. */
  weight?: number;
}

/**
 * Combine several exercises into one activation map (for a whole workout).
 * Each exercise's activation is scaled by its `weight` (sets/volume), summed,
 * then normalised so the hardest-worked region reads as 1.0.
 */
export function aggregateActivation(items: ExerciseLoad[]): Activation {
  const totals: Partial<Record<MuscleRegion, number>> = {};
  for (const item of items) {
    const w = item.weight ?? 1;
    const activation = activationFor(item.name, item.group);
    for (const [region, value] of Object.entries(activation) as [MuscleRegion, number][]) {
      totals[region] = (totals[region] ?? 0) + value * w;
    }
  }
  const max = Math.max(0, ...Object.values(totals));
  if (max === 0) return {};
  const out: Activation = {};
  for (const [region, value] of Object.entries(totals) as [MuscleRegion, number][]) {
    out[region] = value / max;
  }
  return out;
}

/** The most-worked regions, strongest first — handy for a compact legend. */
export function topMuscles(activation: Activation, limit = 5): MuscleRegion[] {
  return (Object.entries(activation) as [MuscleRegion, number][])
    .filter(([, v]) => v > 0.01)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([region]) => region);
}

const HEAT_BASE = '#26333F'; // faint muscle tone when unworked
const HEAT_STOPS: { t: number; c: [number, number, number] }[] = [
  { t: 0.001, c: [34, 197, 94] }, // primary green
  { t: 0.5, c: [245, 158, 11] }, // accent amber
  { t: 1, c: [239, 68, 68] }, // danger red
];

function toHex([r, g, b]: number[]): string {
  return '#' + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');
}

/**
 * Map an intensity (0–1) to a colour: unworked → faint grey, then a
 * green → amber → red heat ramp as the muscle is worked harder.
 */
export function heatColor(intensity: number): string {
  if (intensity <= 0) return HEAT_BASE;
  if (intensity <= HEAT_STOPS[0].t) return toHex(HEAT_STOPS[0].c);
  for (let i = 1; i < HEAT_STOPS.length; i++) {
    if (intensity <= HEAT_STOPS[i].t) {
      const a = HEAT_STOPS[i - 1];
      const b = HEAT_STOPS[i];
      const f = (intensity - a.t) / (b.t - a.t);
      return toHex(a.c.map((ch, k) => ch + (b.c[k] - ch) * f));
    }
  }
  return toHex(HEAT_STOPS[HEAT_STOPS.length - 1].c);
}

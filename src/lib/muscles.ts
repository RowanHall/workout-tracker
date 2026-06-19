import type { ExerciseMuscle, MuscleSlug } from '@/lib/types';

/**
 * Union muscle activation across multiple exercises. When the same slug
 * appears more than once, the highest intensity wins so a primary mover in
 * any exercise stays bright in the combined view.
 */
export function mergeMuscles(perExercise: ExerciseMuscle[][]): ExerciseMuscle[] {
  const max = new Map<MuscleSlug, 1 | 2>();
  for (const muscles of perExercise) {
    for (const m of muscles) {
      const prev = max.get(m.slug);
      if (prev === undefined || m.intensity > prev) max.set(m.slug, m.intensity);
    }
  }
  return [...max.entries()].map(([slug, intensity]) => ({ slug, intensity }));
}

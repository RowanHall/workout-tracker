/** Epley estimated 1RM. Mirrors the formula in finish_workout (003): the
 *  weight you could theoretically lift for a single rep, extrapolated from a
 *  multi-rep set. Equals the weight itself for a true 1-rep set. */
export function estimatedOneRepMax(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

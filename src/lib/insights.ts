import { estimatedOneRepMax } from '@/lib/strength';

interface InsightSet {
  weight: number;
  reps: number;
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string;
  /** Workout end time, ms epoch. */
  endedAt: number;
}

export interface OverdueInsight {
  muscleGroup: string;
  daysSince: number;
  avgInterval: number;
}

export interface PlateauInsight {
  exerciseId: number;
  exerciseName: string;
  currentE1rm: number;
  /** The best e1RM that had already been hit by `weeksAgo` weeks ago. */
  e1rmWeeksAgo: number;
  weeksAgo: number;
}

export interface HotStreakInsight {
  exerciseId: number;
  exerciseName: string;
  /** Lift in estimated 1RM since the start of the lookback window. */
  delta: number;
  currentE1rm: number;
}

export interface Insights {
  overdue: OverdueInsight[];
  plateaued: PlateauInsight[];
  hotStreaks: HotStreakInsight[];
}

const DAY = 86_400_000;
/** A muscle is flagged "overdue" once it's gone this much longer than the
 *  user's typical gap between sessions hitting it, with a floor so we don't
 *  nag people who train everything daily. */
const OVERDUE_MULTIPLIER = 1.6;
const OVERDUE_MIN_DAYS = 5;
const PLATEAU_WEEKS = 4;
/** Treat ≤1% change over the plateau window as flat — well under noise. */
const PLATEAU_TOLERANCE = 0.01;
/** Need this many sessions in window for a plateau call to be meaningful. */
const PLATEAU_MIN_SESSIONS = 4;
const HOT_STREAK_DAYS = 14;
const HOT_STREAK_MIN_GAIN_LBS = 5;

/**
 * Pure compute over a flat set list: which muscle groups are overdue vs the
 * user's training cadence, which exercises have stalled, which are climbing.
 * Caller decides what to show — we just rank.
 */
export function computeInsights(sets: InsightSet[]): Insights {
  const now = Date.now();

  return {
    overdue: computeOverdue(sets, now),
    plateaued: computePlateaus(sets, now),
    hotStreaks: computeHotStreaks(sets, now),
  };
}

function computeOverdue(sets: InsightSet[], now: number): OverdueInsight[] {
  // For each muscle group, the sorted list of distinct session timestamps.
  const sessionsByGroup = new Map<string, Set<number>>();
  for (const s of sets) {
    const set = sessionsByGroup.get(s.muscleGroup) ?? new Set();
    set.add(s.endedAt);
    sessionsByGroup.set(s.muscleGroup, set);
  }

  const out: OverdueInsight[] = [];
  for (const [muscleGroup, sessionSet] of sessionsByGroup) {
    const sessions = [...sessionSet].sort((a, b) => a - b);
    if (sessions.length < 3) continue; // not enough history to set a baseline

    const gaps: number[] = [];
    for (let i = 1; i < sessions.length; i++) {
      gaps.push((sessions[i] - sessions[i - 1]) / DAY);
    }
    const avgInterval = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
    const last = sessions[sessions.length - 1];
    const daysSince = (now - last) / DAY;

    if (daysSince >= OVERDUE_MIN_DAYS && daysSince >= avgInterval * OVERDUE_MULTIPLIER) {
      out.push({
        muscleGroup,
        daysSince: Math.round(daysSince),
        avgInterval: Math.round(avgInterval * 10) / 10,
      });
    }
  }

  // Most overdue (relative to baseline) first.
  return out.sort((a, b) => b.daysSince / b.avgInterval - a.daysSince / a.avgInterval);
}

function computePlateaus(sets: InsightSet[], now: number): PlateauInsight[] {
  const cutoff = now - PLATEAU_WEEKS * 7 * DAY;

  // Group sets by exercise, then by session, taking the best e1RM per session.
  const sessionsByExercise = new Map<
    number,
    { name: string; sessions: { t: number; e1rm: number }[] }
  >();

  for (const s of sets) {
    const entry = sessionsByExercise.get(s.exerciseId) ?? {
      name: s.exerciseName,
      sessions: [] as { t: number; e1rm: number }[],
    };
    const e1rm = estimatedOneRepMax(s.weight, s.reps);
    const existing = entry.sessions.find((x) => x.t === s.endedAt);
    if (existing) existing.e1rm = Math.max(existing.e1rm, e1rm);
    else entry.sessions.push({ t: s.endedAt, e1rm });
    sessionsByExercise.set(s.exerciseId, entry);
  }

  const out: PlateauInsight[] = [];
  for (const [exerciseId, { name, sessions }] of sessionsByExercise) {
    if (sessions.length < PLATEAU_MIN_SESSIONS) continue;
    sessions.sort((a, b) => a.t - b.t);

    // Need at least one session before the cutoff to meaningfully compare.
    const before = sessions.filter((s) => s.t <= cutoff);
    if (before.length === 0) continue;

    const e1rmWeeksAgo = Math.max(...before.map((s) => s.e1rm));
    const currentE1rm = Math.max(...sessions.map((s) => s.e1rm));

    if (currentE1rm > 0 && (currentE1rm - e1rmWeeksAgo) / e1rmWeeksAgo <= PLATEAU_TOLERANCE) {
      out.push({
        exerciseId,
        exerciseName: name,
        currentE1rm,
        e1rmWeeksAgo,
        weeksAgo: PLATEAU_WEEKS,
      });
    }
  }

  // Heaviest stalled lifts first — they're the ones the user cares about most.
  return out.sort((a, b) => b.currentE1rm - a.currentE1rm).slice(0, 5);
}

function computeHotStreaks(sets: InsightSet[], now: number): HotStreakInsight[] {
  const cutoff = now - HOT_STREAK_DAYS * DAY;

  const sessionsByExercise = new Map<
    number,
    { name: string; sessions: { t: number; e1rm: number }[] }
  >();

  for (const s of sets) {
    const entry = sessionsByExercise.get(s.exerciseId) ?? {
      name: s.exerciseName,
      sessions: [] as { t: number; e1rm: number }[],
    };
    const e1rm = estimatedOneRepMax(s.weight, s.reps);
    const existing = entry.sessions.find((x) => x.t === s.endedAt);
    if (existing) existing.e1rm = Math.max(existing.e1rm, e1rm);
    else entry.sessions.push({ t: s.endedAt, e1rm });
    sessionsByExercise.set(s.exerciseId, entry);
  }

  const out: HotStreakInsight[] = [];
  for (const [exerciseId, { name, sessions }] of sessionsByExercise) {
    sessions.sort((a, b) => a.t - b.t);
    const before = sessions.filter((s) => s.t <= cutoff);
    const recent = sessions.filter((s) => s.t > cutoff);
    if (before.length === 0 || recent.length === 0) continue;

    const baseline = Math.max(...before.map((s) => s.e1rm));
    const currentE1rm = Math.max(...recent.map((s) => s.e1rm));
    const delta = currentE1rm - baseline;
    if (delta >= HOT_STREAK_MIN_GAIN_LBS) {
      out.push({ exerciseId, exerciseName: name, delta, currentE1rm });
    }
  }

  return out.sort((a, b) => b.delta - a.delta).slice(0, 5);
}

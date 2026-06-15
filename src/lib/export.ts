import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { supabase } from './supabase';

interface ExportRow {
  title: string;
  started_at: string;
  ended_at: string | null;
  workout_sets: {
    set_number: number;
    weight: number;
    reps: number;
    is_pr: boolean;
    exercises: { name: string; muscle_group: string } | null;
  }[];
}

const HEADERS = [
  'Date',
  'Workout',
  'Started At',
  'Ended At',
  'Exercise',
  'Muscle Group',
  'Set',
  'Weight (lbs)',
  'Reps',
  'Set Volume (lbs)',
  'PR',
];

/** Quote a CSV field, escaping embedded quotes, per RFC 4180. */
function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(rows: ExportRow[]): string {
  const lines = [HEADERS.join(',')];
  for (const w of rows) {
    const date = w.started_at.slice(0, 10);
    const sets = [...w.workout_sets].sort((a, b) => a.set_number - b.set_number);
    for (const s of sets) {
      lines.push(
        [
          date,
          w.title,
          w.started_at,
          w.ended_at ?? '',
          s.exercises?.name ?? '',
          s.exercises?.muscle_group ?? '',
          s.set_number,
          s.weight,
          s.reps,
          Math.round(s.weight * s.reps),
          s.is_pr ? 'Yes' : '',
        ]
          .map(csvField)
          .join(',')
      );
    }
  }
  return lines.join('\n');
}

/**
 * Builds a CSV of every set the user has logged and opens the native share
 * sheet so they can save it to Files, email it, or open it in Excel/Sheets.
 * Throws a user-friendly Error if there's nothing to export.
 */
export async function exportWorkoutsCsv(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('workouts')
    .select(
      'title,started_at,ended_at,workout_sets(set_number,weight,reps,is_pr,exercises(name,muscle_group))'
    )
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as ExportRow[];
  if (rows.length === 0 || rows.every((w) => w.workout_sets.length === 0)) {
    throw new Error('No finished workouts to export yet.');
  }

  const csv = buildCsv(rows);

  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `kova-workouts-${stamp}.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Kova workouts',
    UTI: 'public.comma-separated-values-text',
  });
}

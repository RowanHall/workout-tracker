export function formatVolume(volume: number): string {
  return `${Math.round(volume).toLocaleString()} lbs`;
}

/** Body weight: drop a trailing .0 but keep one decimal otherwise. */
export function formatWeight(weight: number): string {
  return Number.isInteger(weight) ? String(weight) : weight.toFixed(1);
}

/** Set weight for display. Bodyweight movements store only the added load,
 *  so 0 reads as "BW" and 45 as "+45"; everything else is the plain number. */
export function formatSetWeight(weight: number, isBodyweight: boolean): string {
  if (!isBodyweight) return formatWeight(weight);
  return weight === 0 ? 'BW' : `+${formatWeight(weight)}`;
}

/** Parse a weight input into the stored value, or null when invalid. For
 *  bodyweight movements an empty field or "BW" means no added load (0), and
 *  a "+" prefix is tolerated so "+45" round-trips from formatSetWeight. */
export function parseSetWeightInput(text: string, isBodyweight: boolean): number | null {
  const trimmed = text.trim().replace(/^\+/, '');
  if (isBodyweight && (trimmed === '' || trimmed.toUpperCase() === 'BW')) return 0;
  const n = parseFloat(trimmed);
  return Number.isNaN(n) || n < 0 ? null : n;
}

export function formatDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Local-timezone YYYY-MM-DD key, for grouping things by calendar day. */
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function workoutTitleForNow(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Morning Workout';
  if (hour < 17) return 'Afternoon Workout';
  return 'Evening Workout';
}

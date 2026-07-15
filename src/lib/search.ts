/**
 * Loose name matching for exercise search: punctuation-insensitive and
 * word-order-insensitive, so "pull up" finds "Pull-Up" and "curl hammer"
 * finds "Hammer Curl".
 */
export function matchesSearch(name: string, query: string): boolean {
  const target = name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .every((token) => target.includes(token));
}

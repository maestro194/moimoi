/** Difficulty colours, one table for both apps. Keys in both cases, as the data uses either. */
const BASE = { BAS: '#3fb950', ADV: '#d4a017', EXP: '#f64861', MAS: '#9f51dc', REMAS: '#e4b7eb', UTAGE: '#bf1b5e' } as const;

export const DIFF_COLOR: Record<string, string> = {
  ...BASE,
  ...Object.fromEntries(Object.entries(BASE).map(([k, v]) => [k.toLowerCase(), v])),
};

/** A difficulty's colour in any casing; grey when unknown. */
export function difficultyColor(diff?: string | null, fallback = '#9ca3af'): string {
  return (diff && DIFF_COLOR[diff.toUpperCase()]) || fallback;
}

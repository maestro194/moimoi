export const COLORS = {
  bg: '#0b0f19',
  surface: '#111827',
  surfaceLight: '#1f2937',
  border: '#374151',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  text: '#f9fafb',
  textMuted: '#9ca3af',
  textSubtle: '#6b7280',
  purple: '#7c3aed',
  purpleLight: '#c084fc',
  pink: '#f472b6',
  cyan: '#22d3ee',
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
};

export const DIFF_COLOR: Record<string, string> = {
  BAS: '#3fb950',
  ADV: '#d4a017',
  EXP: '#f64861',
  MAS: '#9f51dc',
  REMAS: '#e4b7eb', // Standardized Re:Master color
  UTAGE: '#bf1b5e',
  // Lowercase variants
  bas: '#3fb950',
  adv: '#d4a017',
  exp: '#f64861',
  mas: '#9f51dc',
  remas: '#e4b7eb',
  utage: '#bf1b5e',
};

export function getDifficultyColor(diff?: string | null): string {
  if (!diff) return '#9ca3af';
  const key = diff.toUpperCase();
  return DIFF_COLOR[key] ?? '#9ca3af';
}

export function getRankBadge(achievement: number): { label: string; color: string; bg: string } {
  if (achievement >= 100.5) return { label: 'SSS+', color: '#ffe4e6', bg: '#e11d48' };
  if (achievement >= 100.0) return { label: 'SSS', color: '#ffe4e6', bg: '#f43f5e' };
  if (achievement >= 99.5) return { label: 'SS+', color: '#fef3c7', bg: '#d97706' };
  if (achievement >= 99.0) return { label: 'SS', color: '#fef3c7', bg: '#f59e0b' };
  if (achievement >= 98.0) return { label: 'S+', color: '#e0e7ff', bg: '#4f46e5' };
  if (achievement >= 97.0) return { label: 'S', color: '#e0e7ff', bg: '#6366f1' };
  if (achievement >= 94.0) return { label: 'AAA', color: '#dcfce7', bg: '#16a34a' };
  if (achievement >= 90.0) return { label: 'AA', color: '#dcfce7', bg: '#22c55e' };
  if (achievement >= 80.0) return { label: 'A', color: '#f3f4f6', bg: '#4b5563' };
  return { label: 'B', color: '#9ca3af', bg: '#1f2937' };
}

export function formatAchievement(achievement: number): string {
  // Always floor to 2 decimal places to match web app standard
  const floored = Math.floor(achievement * 100) / 100;
  return floored.toFixed(2) + '%';
}

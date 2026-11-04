import { rankGlyphs } from '@maimai-suite/core';

export const COLORS = {
  bg: '#0b0f19',
  surface: '#111827',
  surfaceLight: '#1f2937',
  border: '#374151',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  text: '#f9fafb',
  textMuted: '#9ca3af',
  // 4.5:1 or better on bg, surface and surfaceLight
  textSubtle: '#8b93a1',
  purple: '#7c3aed',
  purpleLight: '#c084fc',
  pink: '#f472b6',
  cyan: '#22d3ee',
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
  white: '#ffffff',
  black: '#000000',
  success: '#4ade80',
  rankPill: 'rgba(0, 0, 0, 0.45)',
  // Player title plate on Dashboard
  titlePlate: '#3b3839',
  titlePlateBorder: '#555555',
  // B15 / B35 badges on Scores
  b15: '#f43f5e',
  b15Text: '#fda4af',
  b35: '#06b6d4',
  b35Text: '#67e8f9',
  rankOutline: '#0b0f19',
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
  if (!diff) return COLORS.textMuted;
  const key = diff.toUpperCase();
  return DIFF_COLOR[key] ?? COLORS.textMuted;
}

/** maimai rank thresholds (achievement %), best first. */
const RANKS: [number, string][] = [
  [100.5, 'SSS+'], [100.0, 'SSS'], [99.5, 'SS+'], [99.0, 'SS'], [98.0, 'S+'], [97.0, 'S'],
  [94.0, 'AAA'], [90.0, 'AA'], [80.0, 'A'], [75.0, 'BBB'], [70.0, 'BB'], [60.0, 'B'], [50.0, 'C'],
];

/**
 * The rank for an achievement, drawn as on the web B50: coloured letters (components/RankLetters) on a
 * dark translucent pill. `color` is the first letter's colour, for places that need one colour.
 */
export function getRankBadge(achievement: number): { label: string; color: string; bg: string } {
  const label = RANKS.find(([min]) => achievement >= min)?.[1] ?? 'D';
  return { label, color: rankGlyphs(label)[0][1], bg: COLORS.rankPill };
}

export function formatAchievement(achievement: number): string {
  // Always floor to 2 decimal places to match web app standard
  const floored = Math.floor(achievement * 100) / 100;
  return floored.toFixed(2) + '%';
}

/** Arcade skill tier colours (recommendations). */
export const SKILL_TIER_COLOR: Record<string, string> = {
  'SSS+': COLORS.b15, SSS: COLORS.b15, SS: COLORS.amber, S: '#6366f1', AAA: '#22c55e',
};

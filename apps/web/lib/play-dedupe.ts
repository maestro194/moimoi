// Matching rule for "is this official maimai NET play the same as a play already in play_log?"
// Shared by the sync (lib/maimai-sync.ts) and the one-off cleanup (scripts/dedupe-manual-plays.ts).

import type { SelectPlayLog } from './db/schema';
import { sameChart } from '@maimai-suite/core';

/** Manual entries are typed in after the fact, so their time is only approximate. */
export const MANUAL_MATCH_WINDOW_MS = 30 * 60 * 1000;

export interface PlayKey {
  songTitle: string;
  difficulty: string;
  songType: string;
  track: number | null;
  achievement: string | number;
  playedAt: Date;
}

export function isManualPlay(row: Pick<SelectPlayLog, 'isManual' | 'details'>): boolean {
  return row.isManual === true || (row.details as { isManual?: boolean } | null)?.isManual === true;
}

function sameAchievement(a: string | number, b: string | number): boolean {
  return Math.abs(Number(a) - Number(b)) < 0.00005; // achievements have 4 decimals
}

/** Same chart, same track and same achievement — the play's identity apart from its time. */
export function isSamePlay(a: PlayKey, b: PlayKey): boolean {
  return sameChart(a, b)
    && a.track === b.track
    && sameAchievement(a.achievement, b.achievement);
}

/** The closest manual row that is the same play as `official` within the match window, if any. */
export function findManualDuplicate<T extends SelectPlayLog>(official: PlayKey, rows: T[]): T | null {
  let best: T | null = null;
  let bestDiff = Infinity;
  for (const row of rows) {
    if (!isManualPlay(row) || !isSamePlay(official, row)) continue;
    const diff = Math.abs(row.playedAt.getTime() - official.playedAt.getTime());
    if (diff <= MANUAL_MATCH_WINDOW_MS && diff < bestDiff) { best = row; bestDiff = diff; }
  }
  return best;
}

/** Manual-entry details carry an `isManual` flag; drop it once the row becomes an official play. */
export function stripManualFlag(details: unknown): unknown {
  if (!details || typeof details !== 'object') return details ?? null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isManual, ...rest } = details as Record<string, unknown>;
  return Object.keys(rest).length > 0 ? rest : null;
}

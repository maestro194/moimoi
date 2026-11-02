/**
 * Foil effects for B50 cards. Shared by web and mobile so both apps always agree on which card gets what.
 *
 * Neither clear marks nor achievement % decide the tier: rating caps achievement at 100.5% (AP only adds +1),
 * and in a B50 made of SSS/SSS+ those barely separate cards. Fixed constant cut-offs don't work either, since
 * constants don't scale evenly. Instead each card is ranked against the player's own B50:
 * - tier: rating rank inside its pool (B15 / B35), top 10% secret, next 20% gold, next 20% silver;
 * - freshness: a recent best shimmers, fading to nothing over FOIL_FADE_DAYS.
 */

import { chartKey } from './chart';

export type FoilTier = 'secret' | 'gold' | 'silver';

export interface FoilInfo {
  tier: FoilTier | null;
  /** 1 on the day the best was set, falling to 0 after FOIL_FADE_DAYS. */
  freshness: number;
  /** Whole days since the best was set (0 = same day in UTC+7). */
  ageDays: number;
  /** Show the "NEW · …" tag (best set within FOIL_TAG_DAYS). */
  tagged: boolean;
  /** Highest-rated chart of the whole B50 (first one if tied). */
  isTop1: boolean;
}

export const FOIL_FADE_DAYS = 30;
export const FOIL_TAG_DAYS = 7;
/** Cumulative share of a pool for each tier: top 10% secret, next 20% gold, next 20% silver. */
const TIER_BANDS: Array<[FoilTier, number]> = [['secret', 0.1], ['gold', 0.3], ['silver', 0.5]];

interface FoilChart {
  songTitle: string;
  difficulty: string;
  songType?: string | null;
  rating: number;
  playedAt: Date | string;
}

/** Foil info is keyed by chart identity (chartKey). */
export const foilKey = chartKey;

const DAY_MS = 86_400_000;
const UTC7_MS = 7 * 3_600_000;
const localDay = (t: number) => Math.floor((t + UTC7_MS) / DAY_MS);

function tierFor(pool: FoilChart[], rating: number): FoilTier | null {
  // Ties share the better tier: rank by the first chart with this rating (pools are sorted by rating, high first)
  const rank = pool.findIndex(c => c.rating === rating);
  for (const [tier, share] of TIER_BANDS) {
    if (rank < Math.ceil(pool.length * share)) return tier;
  }
  return null;
}

/**
 * Foil info for every B50 chart, keyed by foilKey(). Pass the pools as RatingData.newCharts / oldCharts
 * (sorted by rating, high first).
 */
export function computeFoil(newCharts: FoilChart[], oldCharts: FoilChart[], now: Date | number = Date.now()): Map<string, FoilInfo> {
  const nowMs = typeof now === 'number' ? now : now.getTime();
  const out = new Map<string, FoilInfo>();
  const all = [...newCharts, ...oldCharts];
  const topRating = all.length ? Math.max(...all.map(c => c.rating)) : -1;
  let crowned = false;

  for (const pool of [newCharts, oldCharts]) {
    for (const c of pool) {
      const playedMs = new Date(c.playedAt).getTime();
      const age = Math.max(0, (nowMs - playedMs) / DAY_MS);
      const freshness = Number.isFinite(age) ? Math.max(0, 1 - age / FOIL_FADE_DAYS) : 0;
      const isTop1 = !crowned && c.rating === topRating;
      if (isTop1) crowned = true;
      out.set(foilKey(c), {
        tier: tierFor(pool, c.rating),
        freshness,
        ageDays: Number.isFinite(age) ? Math.max(0, localDay(nowMs) - localDay(playedMs)) : Infinity,
        tagged: freshness > 0 && age <= FOIL_TAG_DAYS,
        isTop1,
      });
    }
  }
  return out;
}

/** Tag text for a fresh card, e.g. "NEW · TODAY" or "NEW · 3D AGO". */
export const foilTagLabel = (info: FoilInfo) => (info.ageDays === 0 ? 'NEW · TODAY' : `NEW · ${info.ageDays}D AGO`);

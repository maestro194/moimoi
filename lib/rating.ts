import type { RankDef, Difficulty, Song, Score, ScoreWithRating, RatingData, RatingPool } from './types';

// ─── Rank definitions (from myjian/mai-tools) ───────────────────────────────
export const RANK_DEFINITIONS: RankDef[] = [
  { minAchv: 100.5, factor: 0.224, title: 'SSS+' },
  { minAchv: 100.0, factor: 0.216, title: 'SSS'  },
  { minAchv:  99.5, factor: 0.211, title: 'SS+' },
  { minAchv:  99.0, factor: 0.208, title: 'SS' },
  { minAchv:  98.0, factor: 0.203, title: 'S+' },
  { minAchv:  97.0, factor: 0.200, title: 'S' },
  { minAchv:  94.0, factor: 0.168, title: 'AAA' },
  { minAchv:  90.0, factor: 0.152, title: 'AA' },
  { minAchv:  80.0, factor: 0.136, title: 'A' },
  { minAchv:  75.0, factor: 0.120, title: 'BBB' },
  { minAchv:  70.0, factor: 0.112, title: 'BB' },
  { minAchv:  60.0, factor: 0.096, title: 'B' },
  { minAchv:  50.0, factor: 0.080, title: 'C' },
  { minAchv:   0.0, factor: 0.000, title: 'D' },
];

export const NUM_TOP_NEW = 15;
export const NUM_TOP_OLD = 35;

// ─── Rank utilities ──────────────────────────────────────────────────────────

export function getRankDef(achievement: number): RankDef {
  for (const rank of RANK_DEFINITIONS) {
    if (achievement >= rank.minAchv) return rank;
  }
  return RANK_DEFINITIONS[RANK_DEFINITIONS.length - 1];
}

export function getRankTitle(achievement: number): string {
  return getRankDef(achievement).title;
}

/**
 * Return the exact rank factor for a given achievement score.
 * Maimai DX uses static factors per bracket.
 */
export function getRankFactor(achievement: number): number {
  return getRankDef(achievement).factor;
}

// ─── Rating calculation ──────────────────────────────────────────────────────

/**
 * Calculate the DX Rating contribution of a single chart.
 * formula: floor(internalLevel * factor * 100) / 100
 * Capped at internal level 15.0 for calculation purposes.
 */
export function calcSingleRating(internalLevel: number, achievement: number, fc?: string | null): { floored: number; raw: number } {
  const factor = getRankFactor(achievement);
  // Official DX Rating formula: floor(internalLevel * min(achievement, 100.5) * rankFactor / 100)
  // Our 'factor' table already divides the rankFactor by 100 (e.g. 0.224 instead of 22.4)
  // To avoid floating point precision issues rounding down incorrectly, we add a tiny epsilon
  let rating = internalLevel * Math.min(achievement, 100.5) * factor + 1e-9;
  
  // +1 bonus for AP / AP+
  if (fc === 'AP' || fc === 'AP+') {
    rating += 1;
  }
  
  return {
    floored: Math.floor(rating),
    raw: rating
  };
}

/**
 * Parse internal level string (e.g. "14.9", "15.0") to a number.
 * Returns the display level (e.g. "14+") parsed as a number as fallback.
 */
export function parseInternalLevel(internalLv: string | undefined, displayLv: string | undefined): number {
  if (internalLv) {
    const parsed = parseFloat(internalLv);
    if (!isNaN(parsed)) return parsed;
  }
  if (displayLv) {
    const clean = displayLv.replace('+', '.7');
    const parsed = parseFloat(clean);
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

/**
 * Get the internal level for a specific difficulty from a Song object.
 *
 * @param song - The song entry from the song DB.
 * @param difficulty - Chart difficulty (BAS/ADV/EXP/MAS/REMAS).
 * @param songType - 'DX' (default) or 'STD'. For songs with both STD and DX
 *   charts, 'DX' uses the preserved `dx_lev_*_i` fields so the correct
 *   internal level is used for rating calculation.
 */
export function getSongInternalLevel(
  song: Song,
  difficulty: Difficulty,
  songType: 'STD' | 'DX' = 'DX',
): number {
  // For DX charts: prefer the explicit DX internal level field.
  // Falls back to the normalized lev_*_i (which equals the DX level for DX-only songs).
  if (songType === 'DX') {
    const dxMap: Record<Difficulty, string | undefined> = {
      BAS:   song.dx_lev_bas_i   ?? song.lev_bas_i,
      ADV:   song.dx_lev_adv_i   ?? song.lev_adv_i,
      EXP:   song.dx_lev_exp_i   ?? song.lev_exp_i,
      MAS:   song.dx_lev_mas_i   ?? song.lev_mas_i,
      REMAS: song.dx_lev_remas_i ?? song.lev_remas_i,
    };
    const dxDisplay: Record<Difficulty, string | undefined> = {
      BAS:   song.dx_lev_bas   ?? song.lev_bas,
      ADV:   song.dx_lev_adv   ?? song.lev_adv,
      EXP:   song.dx_lev_exp   ?? song.lev_exp,
      MAS:   song.dx_lev_mas   ?? song.lev_mas,
      REMAS: song.dx_lev_remas ?? song.lev_remas,
    };
    return parseInternalLevel(dxMap[difficulty], dxDisplay[difficulty]);
  }

  // For STD charts: use only the STD (lev_*) fields.
  const stdMap: Record<Difficulty, string | undefined> = {
    BAS:   song.lev_bas_i,
    ADV:   song.lev_adv_i,
    EXP:   song.lev_exp_i,
    MAS:   song.lev_mas_i,
    REMAS: song.lev_remas_i,
  };
  const stdDisplay: Record<Difficulty, string | undefined> = {
    BAS:   song.lev_bas,
    ADV:   song.lev_adv,
    EXP:   song.lev_exp,
    MAS:   song.lev_mas,
    REMAS: song.lev_remas,
  };
  return parseInternalLevel(stdMap[difficulty], stdDisplay[difficulty]);
}

/**
 * Derive all unique "big" versions (multiples of 500) present in the song DB,
 * sorted descending. E.g. [26500, 26000, 25500, 25000, …]
 *
 * A "big version" is a major maimai DX release (PRiSM, CiRCLE, etc.).
 * Mid-update songs (version 26001, 26002 …) are folded into their parent
 * big version via floor-to-nearest-500.
 */
export function deriveBigVersions(songDb: Map<string, Song>): number[] {
  const seen = new Set<number>();
  for (const song of songDb.values()) {
    const v = parseInt(song.version, 10);
    if (!isNaN(v) && v > 0) {
      seen.add(Math.floor(v / 500) * 500);
    }
  }
  return Array.from(seen).sort((a, b) => b - a);
}

/**
 * Compute the pool threshold for the "new" (B15) pool.
 *
 * The new pool covers the 2 most recent big versions at or before `currentVersion`
 * and ALL their mid-update songs.
 *
 * Examples (with all big versions [26500, 26000, 25500, 25000, …]):
 *   currentVersion = 26500 → threshold = 26000  (CiRCLE + CiRCLE PLUS are new)
 *   currentVersion = 25500 → threshold = 25000  (PRiSM + PRiSM PLUS are new)
 *
 * When a user overrides the version in Settings, this function automatically
 * adjusts which pool songs fall into.
 */
export function getNewPoolThreshold(songDb: Map<string, Song>, currentVersion: number): number {
  const bigVersions = deriveBigVersions(songDb);
  // Keep only big versions at or below the selected/detected current version
  const relevant = bigVersions.filter(v => v <= currentVersion);
  // relevant[0] = current big version, relevant[1] = previous big version
  return relevant[1] ?? relevant[0] ?? 0;
}

// ─── Full DX Rating computation ──────────────────────────────────────────────

/**
 * Given a list of best scores with their songs, compute the full DX Rating.
 * Automatically splits by NEW (current + previous big version) vs OLD.
 */
export function computeRating(
  scores: Score[],
  songDb: Map<string, Song>,
  currentVersion: number
): RatingData & { allScores: ScoreWithRating[] } {
  // Derive pool threshold from the big versions at or before currentVersion.
  // This respects the user's version override from Settings:
  // e.g. if override = 25500 (PRiSM PLUS), threshold = 25000 (PRiSM).
  const poolThreshold = getNewPoolThreshold(songDb, currentVersion);

  const scored: ScoreWithRating[] = scores.map(score => {
    const song = songDb.get(score.songTitle);
    const internalLevel = song
      ? getSongInternalLevel(song, score.difficulty, score.songType ?? 'DX')
      : 0;
    const achievement = typeof score.achievement === 'string'
      ? parseFloat(score.achievement)
      : score.achievement;
    const rating = calcSingleRating(internalLevel, achievement, score.fc);

    // Song is "new" if its version is in the 2 most recent big versions
    // (i.e. version number >= the second-latest big version)
    const pool: RatingPool = song && parseInt(song.version) >= poolThreshold ? 'new' : 'old';

    return {
      ...score,
      internalLevel,
      rating: rating.floored,
      rawRating: rating.raw,
      pool,
      rank: getRankTitle(achievement),
      song,
    };
  });

  // Deduplicate to best score per (song, difficulty) before pool filtering
  const allBestScores = deduplicateBest(scored);

  const newPool = allBestScores.filter(s => s.pool === 'new');
  const oldPool = allBestScores.filter(s => s.pool === 'old');

  const sortScores = (a: ScoreWithRating & { rawRating?: number }, b: ScoreWithRating & { rawRating?: number }) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    
    // Tiebreaker 1: Unfloored (raw) rating
    if (a.rawRating !== undefined && b.rawRating !== undefined) {
      if (Math.abs(b.rawRating - a.rawRating) > 1e-6) {
        return b.rawRating - a.rawRating;
      }
    }
    
    // Tiebreaker 2: Achievement percentage
    const achA = typeof a.achievement === 'string' ? parseFloat(a.achievement) : a.achievement;
    const achB = typeof b.achievement === 'string' ? parseFloat(b.achievement) : b.achievement;
    return achB - achA;
  };

  newPool.sort(sortScores);
  oldPool.sort(sortScores);

  const topNew = newPool.slice(0, NUM_TOP_NEW);
  const topOld = oldPool.slice(0, NUM_TOP_OLD);

  const newRating = Math.floor(topNew.reduce((sum, s) => sum + s.rating, 0));
  const oldRating = Math.floor(topOld.reduce((sum, s) => sum + s.rating, 0));

  return {
    totalRating: newRating + oldRating,
    newRating,
    oldRating,
    newCharts: topNew,
    oldCharts: topOld,
    allScores: [...newPool, ...oldPool],
  };
}

/** Keep only the best score (by rating) per song+difficulty combo */
function deduplicateBest(scores: ScoreWithRating[]): ScoreWithRating[] {
  const map = new Map<string, ScoreWithRating>();
  for (const score of scores) {
    const key = `${score.songTitle}::${score.difficulty}`;
    const existing = map.get(key);
    if (!existing || score.rating > existing.rating) {
      map.set(key, score);
    }
  }
  return Array.from(map.values());
}

// ─── Target suggestions ──────────────────────────────────────────────────────

export interface TargetSuggestion {
  songTitle: string;
  difficulty: Difficulty;
  internalLevel: number;
  currentAchievement: number;
  currentRank: string;
  currentRating: number;
  targetRank: string;
  targetAchievement: number;
  targetRating: number;
  ratingGain: number;
  totalRatingGain: number;
  efficiency: number;
  song?: Song;
  fc?: string | null;
  fs?: string | null;
}

/**
 * Generate suggestions for the biggest rating gains the user can make.
 * Looks at the boundary score of each pool and finds charts where
 * improving to the next rank threshold would push them into the top pool.
 */
export function getTargetSuggestions(
  ratingData: RatingData,
  allScores: ScoreWithRating[],
  limit = 10,
): TargetSuggestion[] {
  const suggestions: TargetSuggestion[] = [];

  // The minimum rating in the current top pools
  const newCutoff = ratingData.newCharts.length === NUM_TOP_NEW
    ? ratingData.newCharts[NUM_TOP_NEW - 1].rating
    : 0;
  const oldCutoff = ratingData.oldCharts.length === NUM_TOP_OLD
    ? ratingData.oldCharts[NUM_TOP_OLD - 1].rating
    : 0;

  for (const score of allScores) {
    const cutoff = score.pool === 'new' ? newCutoff : oldCutoff;
    const nextRankDef = getNextRankTarget(score.achievement);
    if (!nextRankDef) continue;

    const targetRating = calcSingleRating(score.internalLevel, nextRankDef.minAchv).floored;
    const ratingGain = targetRating - score.rating;
    if (ratingGain <= 0) continue;

    const isNew = score.pool === 'new';
    const topList = isNew ? ratingData.newCharts : ratingData.oldCharts;
    const maxLen = isNew ? NUM_TOP_NEW : NUM_TOP_OLD;
    
    // Only suggest if it would improve or enter the top pool
    if (targetRating <= cutoff && topList.length >= maxLen) continue;

    const inTopList = topList.some(s => s.songTitle === score.songTitle && s.difficulty === score.difficulty);
    const totalRatingGain = inTopList ? targetRating - score.rating : targetRating - cutoff;

    if (totalRatingGain <= 0) continue;

    const currentAchievement = typeof score.achievement === 'string'
      ? parseFloat(score.achievement)
      : score.achievement;
      
    // Efficiency calculation similar to Tomomai
    const efficiency = totalRatingGain / Math.max(nextRankDef.minAchv - currentAchievement, 0.1);

    suggestions.push({
      songTitle: score.songTitle,
      difficulty: score.difficulty,
      internalLevel: score.internalLevel,
      currentAchievement,
      currentRank: score.rank,
      currentRating: score.rating,
      targetRank: nextRankDef.title,
      targetAchievement: nextRankDef.minAchv,
      targetRating,
      ratingGain,
      totalRatingGain,
      efficiency,
      song: score.song,
      fc: score.fc,
      fs: score.fs,
    });
  }

  // Sort by efficiency (rating gain per % of accuracy needed), fallback to absolute gain
  suggestions.sort((a, b) => {
    if (Math.abs(a.efficiency - b.efficiency) < 0.1) {
      return b.totalRatingGain - a.totalRatingGain;
    }
    return b.efficiency - a.efficiency;
  });
  
  return suggestions.slice(0, limit);
}

function getNextRankTarget(achievement: number): RankDef | null {
  const ranks = RANK_DEFINITIONS;
  for (let i = ranks.length - 1; i >= 0; i--) {
    if (ranks[i].minAchv > achievement) return ranks[i];
  }
  return null;
}

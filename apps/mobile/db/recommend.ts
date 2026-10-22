import type { ScoreRow, SongRow } from './schema';
import { calcSingleRating, normalizeTitle } from '@maimai-suite/core';

export type SkillAxis = 'TAP' | 'SPIN' | 'SPEED' | 'STAMINA' | 'TECH' | 'ACCURACY';

export type SkillTier = 'AA' | 'AAA' | 'S' | 'SS' | 'SSS' | 'SSS+';

export type TargetChallengeTier = 'Peak' | 'Development' | 'Consolidation';

export interface ChartSkillProfile {
  songTitle: string;
  difficulty: 'EXP' | 'MAS' | 'REMAS';
  songType: 'DX' | 'STD';
  constant: number;
  skills: Record<SkillAxis, number>;
  primarySkills: { skill: SkillAxis; value: number }[];
}

export interface PlayerSkillProfile {
  stats: Record<SkillAxis, number>;
  tiers: Record<SkillAxis, SkillTier>;
  weakestSkill: SkillAxis;
  strongestSkill: SkillAxis;
  ratedPlayCount: number;
}

export interface RecommendedTarget {
  songTitle: string;
  artist: string;
  imageUrl: string | null;
  difficulty: 'EXP' | 'MAS' | 'REMAS';
  songType: 'DX' | 'STD';
  constant: number;
  primarySkills: { skill: SkillAxis; value: number }[];
  predictedAchievement: number;
  targetAchievement: number;
  targetRank: 'S+' | 'SS' | 'SSS' | 'SSS+';
  challengeTier: TargetChallengeTier;
  gainType: 'rating' | 'stat';
  gainValue: number;
  gainDetail: string;
  reason: string;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function getSkillTier(stat: number): SkillTier {
  if (stat >= 100.5) return 'SSS+';
  if (stat >= 100.0) return 'SSS';
  if (stat >= 99.0) return 'SS';
  if (stat >= 97.0) return 'S';
  if (stat >= 90.0) return 'AAA';
  return 'AA';
}

/**
 * Extract chart constant for EXP, MAS, or REMAS
 */
export function getChartConstant(
  song: SongRow,
  difficulty: 'EXP' | 'MAS' | 'REMAS',
  songType: 'DX' | 'STD' = 'DX'
): number {
  let raw: string | null = null;
  if (difficulty === 'MAS') {
    raw = songType === 'DX' ? (song.dx_lev_mas_i || song.lev_mas_i) : (song.lev_mas_i || song.dx_lev_mas_i);
    if (!raw) raw = songType === 'DX' ? song.dx_lev_mas : song.lev_mas;
  } else if (difficulty === 'EXP') {
    raw = songType === 'DX' ? (song.dx_lev_exp_i || song.lev_exp_i) : (song.lev_exp_i || song.dx_lev_exp_i);
    if (!raw) raw = songType === 'DX' ? song.dx_lev_exp : song.lev_exp;
  } else if (difficulty === 'REMAS') {
    raw = song.lev_remas_i || song.lev_remas;
  }

  if (!raw) return 11.0;

  const parsed = parseFloat(raw.replace('+', '.7'));
  return isNaN(parsed) ? 11.0 : parsed;
}

/**
 * Compute multi-metric physical skill profile for a single chart.
 * Based on notes breakdown (tap, hold, slide, touch, break), BPM, and constant.
 */
export function computeChartSkillProfile(
  song: SongRow,
  difficulty: 'EXP' | 'MAS' | 'REMAS',
  songType: 'DX' | 'STD' = 'DX'
): ChartSkillProfile {
  const constant = getChartConstant(song, difficulty, songType);
  const base = (constant / 15.0) * 101.0;

  let bpm = 175;
  if (song.bpm) {
    const parsedBpm = parseFloat(song.bpm);
    if (!isNaN(parsedBpm) && parsedBpm > 50) bpm = parsedBpm;
  }

  // Parse sheets if available
  let tap = 450;
  let hold = 30;
  let slide = 80;
  let touch = 0;
  let breakCount = 25;
  let total = 600;

  if (song.sheets) {
    try {
      const sheetsList = typeof song.sheets === 'string' ? JSON.parse(song.sheets) : song.sheets;
      if (Array.isArray(sheetsList)) {
        const diffKey = difficulty.toLowerCase() === 'mas' ? 'master' :
                        difficulty.toLowerCase() === 'exp' ? 'expert' : 'remaster';
        const match = sheetsList.find(
          (sh: any) =>
            sh.difficulty?.toLowerCase() === diffKey &&
            (sh.type?.toLowerCase() === songType.toLowerCase() || !sh.type)
        );
        if (match && match.noteCounts) {
          tap = match.noteCounts.tap ?? tap;
          hold = match.noteCounts.hold ?? hold;
          slide = match.noteCounts.slide ?? slide;
          touch = match.noteCounts.touch ?? touch;
          breakCount = match.noteCounts.break ?? breakCount;
          total = match.noteCounts.total ?? (tap + hold + slide + touch + breakCount);
        }
      }
    } catch {
      // Ignore json parse error, fall back to defaults
    }
  }

  const rSlide = total > 0 ? slide / total : 0.16;
  const rTap = total > 0 ? tap / total : 0.62;
  const rTouch = total > 0 ? touch / total : 0.0;
  const rHold = total > 0 ? hold / total : 0.08;
  const rBreak = total > 0 ? breakCount / total : 0.04;

  // 1. SPIN
  const dSpinRatio = (rSlide - 0.16) * 22.0;
  const dSpinVol = clamp((slide - 150) / 50, -2.0, 3.0);
  const dSpinTouch = rTouch * 2.0;
  const spin = clamp(base + dSpinRatio + dSpinVol + dSpinTouch, 0, 101);

  // 2. TAP
  const dTapRatio = (rTap - 0.62) * 16.0;
  const dTapDensity = clamp((tap - 500) / 200, -2.0, 2.5);
  const dTapVel = ((bpm - 180) / 50) * 1.5;
  const tapVal = clamp(base + dTapRatio + dTapDensity + dTapVel, 0, 101);

  // 3. SPEED
  const dSpeedBpm = ((bpm - 175) / 40) * 3.0;
  const dSpeedStream = clamp((rTap * bpm - 110) / 30, -2.0, 2.5);
  const speed = clamp(base + dSpeedBpm + dSpeedStream, 0, 101);

  // 4. STAMINA
  const expectedNotes = 500 + Math.max(0, constant - 8.0) * 70;
  const dStaminaCount = clamp(((total - expectedNotes) / 180) * 4.0, -6.0, 6.0);
  const dStaminaWorkload = clamp((hold + slide - 180) / 70, -2.0, 2.0);
  const stamina = clamp(base + dStaminaCount + dStaminaWorkload, 0, 101);

  // 5. TECH
  const dTechTouch = rTouch * 12.0;
  const dTechInterleave = (rSlide * rHold - 0.03) * 40.0;
  const dTechReading = clamp((160 - bpm) / 30, 0, 2.5);
  const tech = clamp(base + dTechTouch + dTechInterleave + dTechReading, 0, 101);

  // 6. ACCURACY
  const dAccBreakRatio = (rBreak - 0.04) * 35.0;
  const dAccBreakCount = clamp((breakCount - 35) / 15, -2.0, 3.0);
  const accuracy = clamp(base + dAccBreakRatio + dAccBreakCount, 0, 101);

  const skills: Record<SkillAxis, number> = {
    SPIN: Math.round(spin * 10) / 10,
    TAP: Math.round(tapVal * 10) / 10,
    SPEED: Math.round(speed * 10) / 10,
    STAMINA: Math.round(stamina * 10) / 10,
    TECH: Math.round(tech * 10) / 10,
    ACCURACY: Math.round(accuracy * 10) / 10,
  };

  const sortedSkills = (Object.keys(skills) as SkillAxis[])
    .map(k => ({ skill: k, value: skills[k] }))
    .sort((a, b) => b.value - a.value);

  return {
    songTitle: song.title,
    difficulty,
    songType,
    constant,
    skills,
    primarySkills: sortedSkills.slice(0, 2),
  };
}

/**
 * Compute player's 6-axis skill stats from their Top 15 EXP/MAS/REMAS plays.
 */
export function computePlayerSkillProfile(
  scores: ScoreRow[],
  songMap: Map<string, SongRow>
): PlayerSkillProfile {
  const eligibleScores = scores.filter(
    s => ['EXP', 'MAS', 'REMAS'].includes(s.difficulty) && s.achievement >= 75.0
  );

  const skillPlays: Record<SkillAxis, number[]> = {
    TAP: [],
    SPIN: [],
    SPEED: [],
    STAMINA: [],
    TECH: [],
    ACCURACY: [],
  };

  for (const s of eligibleScores) {
    const song = songMap.get(normalizeTitle(s.song_title));
    if (!song) continue;

    const profile = computeChartSkillProfile(
      song,
      s.difficulty as 'EXP' | 'MAS' | 'REMAS',
      (s.song_type ?? 'DX') as 'DX' | 'STD'
    );

    const mult = Math.min(1.005, s.achievement / 100.0);

    for (const axis of Object.keys(skillPlays) as SkillAxis[]) {
      const playPerf = profile.skills[axis] * mult;
      skillPlays[axis].push(playPerf);
    }
  }

  const stats: Record<SkillAxis, number> = {} as any;
  const tiers: Record<SkillAxis, SkillTier> = {} as any;

  const weights = [1.2, 1.2, 1.2, 1.1, 1.1, 1.0, 1.0, 1.0, 0.9, 0.9, 0.8, 0.8, 0.8, 0.7, 0.7];

  for (const axis of Object.keys(skillPlays) as SkillAxis[]) {
    const sorted = [...skillPlays[axis]].sort((a, b) => b - a).slice(0, 15);

    if (sorted.length === 0) {
      stats[axis] = 85.0; // Baseline default
    } else {
      let weightSum = 0;
      let totalVal = 0;
      for (let i = 0; i < sorted.length; i++) {
        const w = weights[i] ?? 0.6;
        totalVal += sorted[i] * w;
        weightSum += w;
      }
      stats[axis] = Math.round((totalVal / weightSum) * 10) / 10;
    }

    tiers[axis] = getSkillTier(stats[axis]);
  }

  const axes = Object.keys(stats) as SkillAxis[];
  axes.sort((a, b) => stats[a] - stats[b]);
  const weakestSkill = axes[0];
  const strongestSkill = axes[axes.length - 1];

  return {
    stats,
    tiers,
    weakestSkill,
    strongestSkill,
    ratedPlayCount: eligibleScores.length,
  };
}

/**
 * Predict achievement score for a player on a given chart.
 */
export function predictAchievement(
  playerProfile: PlayerSkillProfile,
  chartProfile: ChartSkillProfile,
  scores: ScoreRow[]
): number {
  // 1. Calculate player baseline near this constant
  const nearby = scores.filter(s => {
    return ['EXP', 'MAS', 'REMAS'].includes(s.difficulty) && s.achievement >= 80.0;
  });

  let baseline = 98.5;
  if (nearby.length > 0) {
    const totalAchv = nearby.reduce((sum, s) => sum + s.achievement, 0);
    baseline = totalAchv / nearby.length;
  } else {
    if (chartProfile.constant >= 14.5) baseline = 96.5;
    else if (chartProfile.constant >= 14.0) baseline = 97.8;
    else if (chartProfile.constant >= 13.5) baseline = 99.0;
    else if (chartProfile.constant >= 13.0) baseline = 99.8;
    else baseline = 100.2;
  }

  // 2. Adjust by skill affinity
  const p1 = chartProfile.primarySkills[0];
  const p2 = chartProfile.primarySkills[1];
  let delta = 0;

  if (p1) {
    delta += (playerProfile.stats[p1.skill] - p1.value) * 0.04;
  }
  if (p2) {
    delta += (playerProfile.stats[p2.skill] - p2.value) * 0.02;
  }

  return Math.round(clamp(baseline + delta, 85.0, 101.0) * 100) / 100;
}

/**
 * Get personalized target recommendations.
 */
export function getRecommendations(
  mode: 'push_skillset' | 'farm_rating',
  playerProfile: PlayerSkillProfile,
  scores: ScoreRow[],
  songs: SongRow[],
  b50FloorRating: number = 280
): RecommendedTarget[] {
  const playedKeys = new Set(
    scores.map(s => `${normalizeTitle(s.song_title)}_${s.difficulty}_${s.song_type ?? 'DX'}`)
  );

  const candidates: RecommendedTarget[] = [];
  const targetWeakSkill = playerProfile.weakestSkill;

  for (const song of songs) {
    const difficulties: Array<'MAS' | 'EXP' | 'REMAS'> = ['MAS', 'EXP'];
    if (song.lev_remas) difficulties.push('REMAS');

    for (const diff of difficulties) {
      const chartProfile = computeChartSkillProfile(song, diff, 'DX');
      if (chartProfile.constant < 12.0) continue; // Focus on 12.0+

      const scoreKey = `${normalizeTitle(song.title)}_${diff}_DX`;
      const existingScore = scores.find(
        s => normalizeTitle(s.song_title) === normalizeTitle(song.title) &&
             s.difficulty === diff &&
             (s.song_type ?? 'DX') === 'DX'
      );

      const predicted = predictAchievement(playerProfile, chartProfile, scores);

      if (mode === 'push_skillset') {
        const weakStatOnChart = chartProfile.skills[targetWeakSkill];
        const playerWeakStat = playerProfile.stats[targetWeakSkill];

        // Chart should challenge or exercise the weak skill
        if (weakStatOnChart >= playerWeakStat - 2.0) {
          const diffStat = weakStatOnChart - playerWeakStat;
          let challengeTier: TargetChallengeTier = 'Development';
          let targetRank: 'S+' | 'SS' | 'SSS' | 'SSS+' = 'SSS';
          let targetAchv = 100.0;

          if (diffStat >= 4.0) {
            challengeTier = 'Peak';
            targetRank = 'S+';
            targetAchv = 98.0;
          } else if (diffStat <= -1.0) {
            challengeTier = 'Consolidation';
            targetRank = 'SSS+';
            targetAchv = 100.5;
          } else {
            challengeTier = 'Development';
            targetRank = predicted >= 99.5 ? 'SSS' : 'SS';
            targetAchv = predicted >= 99.5 ? 100.0 : 99.0;
          }

          const estimatedGain = Math.round(Math.max(0.1, (weakStatOnChart - playerWeakStat) * 0.15 + 0.1) * 10) / 10;

          candidates.push({
            songTitle: song.title,
            artist: song.artist ?? '',
            imageUrl: song.image_url,
            difficulty: diff,
            songType: 'DX',
            constant: chartProfile.constant,
            primarySkills: chartProfile.primarySkills,
            predictedAchievement: predicted,
            targetAchievement: targetAchv,
            targetRank,
            challengeTier,
            gainType: 'stat',
            gainValue: estimatedGain,
            gainDetail: `+${estimatedGain} ${targetWeakSkill}`,
            reason: `Trains ${targetWeakSkill} (${weakStatOnChart} req vs ${playerWeakStat} stat)`,
          });
        }
      } else {
        // Farm Rating mode
        let targetAchv = 100.0;
        let targetRank: 'S+' | 'SS' | 'SSS' | 'SSS+' = 'SSS';
        if (predicted >= 100.2) {
          targetAchv = 100.5;
          targetRank = 'SSS+';
        } else if (predicted >= 99.2) {
          targetAchv = 100.0;
          targetRank = 'SSS';
        } else if (predicted >= 98.2) {
          targetAchv = 99.5;
          targetRank = 'SS';
        } else {
          targetAchv = 98.0;
          targetRank = 'S+';
        }

        const targetRating = calcSingleRating(chartProfile.constant, targetAchv).floored;
        const currentScoreRating = existingScore
          ? calcSingleRating(chartProfile.constant, existingScore.achievement).floored
          : 0;

        const effectiveFloor = Math.max(currentScoreRating, b50FloorRating);
        const ratingGain = targetRating - effectiveFloor;

        if (ratingGain > 0 && predicted >= targetAchv - 1.2) {
          candidates.push({
            songTitle: song.title,
            artist: song.artist ?? '',
            imageUrl: song.image_url,
            difficulty: diff,
            songType: 'DX',
            constant: chartProfile.constant,
            primarySkills: chartProfile.primarySkills,
            predictedAchievement: predicted,
            targetAchievement: targetAchv,
            targetRank,
            challengeTier: predicted >= targetAchv ? 'Consolidation' : 'Development',
            gainType: 'rating',
            gainValue: ratingGain,
            gainDetail: `+${ratingGain} Rating pts`,
            reason: `Beats B50 cutoff (${effectiveFloor} pts) with target ${targetRank}`,
          });
        }
      }
    }
  }

  // Sort candidates
  if (mode === 'push_skillset') {
    candidates.sort((a, b) => b.gainValue - a.gainValue);
  } else {
    candidates.sort((a, b) => b.gainValue - a.gainValue);
  }

  return candidates.slice(0, 6);
}

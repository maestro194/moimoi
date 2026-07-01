// Shared TypeScript types for the maimai tracker

export type Difficulty = 'BAS' | 'ADV' | 'EXP' | 'MAS' | 'REMAS';
export type FC = 'FC' | 'FC+' | 'AP' | 'AP+' | null;
export type FS = 'FS' | 'FS+' | 'FDX' | 'FDX+' | 'SYNC' | null;
export type Region = 'jp' | 'intl';
export type RatingPool = 'new' | 'old';
/** 'STD' = standard/legacy chart, 'DX' = maimai DX chart */
export type SongType = 'STD' | 'DX';

export interface Song {
  sort: string;
  title: string;
  title_kana: string;
  artist: string;
  catcode: string;
  version: string;
  bpm: string;
  image_url: string;
  release: string;
  // STD (standard/legacy) chart levels — present only on JP-exclusive legacy songs
  lev_bas?: string;
  lev_adv?: string;
  lev_exp?: string;
  lev_mas?: string;
  lev_remas?: string;
  // Internal (precise float) levels for STD charts, or normalized DX for DX-only songs
  lev_bas_i?: string;
  lev_adv_i?: string;
  lev_exp_i?: string;
  lev_mas_i?: string;
  lev_remas_i?: string;
  // DX chart display levels (preserved separately from STD levels)
  dx_lev_bas?: string;
  dx_lev_adv?: string;
  dx_lev_exp?: string;
  dx_lev_mas?: string;
  dx_lev_remas?: string;
  // DX chart internal (precise float) levels
  dx_lev_bas_i?: string;
  dx_lev_adv_i?: string;
  dx_lev_exp_i?: string;
  dx_lev_mas_i?: string;
  dx_lev_remas_i?: string;
  lev_mas_notes?: string;
  lev_exp_notes?: string;
  lev_bas_notes?: string;
  lev_adv_notes?: string;
  wiki_url?: string;
  intl?: string;
  date_added?: string;
}

export interface Score {
  id: number;
  songTitle: string;
  difficulty: Difficulty;
  /** STD = standard/legacy chart, DX = maimai DX chart. Defaults to DX for intl. */
  songType: SongType;
  achievement: number;
  dxScore?: number | null;
  fc: FC;
  fs: FS;
  playedAt: Date;
}

export interface ScoreWithRating extends Score {
  internalLevel: number;
  rating: number;
  pool: RatingPool;
  rank: string;
  song?: Song;
}

export interface RatingData {
  totalRating: number;
  newRating: number;
  oldRating: number;
  newCharts: ScoreWithRating[];
  oldCharts: ScoreWithRating[];
}

export interface RankDef {
  minAchv: number;
  factor: number;
  title: string;
  maxAchv?: number;
  maxFactor?: number;
}

export interface SyncStatus {
  lastSynced: Date | null;
  isSyncing: boolean;
  error: string | null;
}

export interface PlayerProfile {
  name: string;
  rating: number;
  iconUrl?: string;
  region: Region;
}

// Shared TypeScript types for the maimai tracker

export type Difficulty = 'BAS' | 'ADV' | 'EXP' | 'MAS' | 'REMAS';
export type FC = 'FC' | 'FC+' | 'AP' | 'AP+' | null;
export type FS = 'FS' | 'FS+' | 'FDX' | 'FDX+' | 'SYNC' | null;
export type Region = 'jp' | 'intl';
export type RatingPool = 'new' | 'old';

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
  lev_bas?: string;
  lev_adv?: string;
  lev_exp?: string;
  lev_mas?: string;
  lev_remas?: string;
  lev_bas_i?: string;
  lev_adv_i?: string;
  lev_exp_i?: string;
  lev_mas_i?: string;
  lev_remas_i?: string;
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

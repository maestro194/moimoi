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
  lev_utage?: string;
  kanji?: string;
  wiki_url?: string;
  jp?: boolean;
  intl?: boolean;
  date_added?: string;
  date_intl_added?: string;
  sheets?: any[];
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

// ── Tag System ────────────────────────────────────────────────────────────────

/** Community tag group from dxrating's public API (read-only) */
export interface CommunityTagGroup {
  id: number;
  localized_name: Record<string, string>; // { en: 'Technical', ja: '...' }
  color: string;
  source: 'community';
}

/** Community tag from dxrating's public API (read-only) */
export interface CommunityTag {
  id: number;
  localized_name: Record<string, string>;
  localized_description: Record<string, string>;
  group_id: number | null;
  source: 'community';
}

/** Community tag-song association from dxrating (lowercase keys) */
export interface CommunityTagSong {
  song_id: string;       // = song.title
  sheet_type: string;    // 'dx' | 'std' (lowercase)
  sheet_difficulty: string; // 'master' | 'expert' ... (lowercase)
  tag_id: number;
}

/** Personal tag group stored in moimoi's local Neon DB */
export interface PersonalTagGroup {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
  source: 'personal';
}

/** Personal tag stored in moimoi's local Neon DB */
export interface PersonalTag {
  id: number;
  name: string;
  description?: string | null;
  groupId?: number | null;
  source: 'personal';
}

/** Personal tag-song association (uppercase keys matching our DB) */
export interface PersonalTagSong {
  id: number;
  tagId: number;
  songTitle: string;
  sheetType: string;    // 'DX' | 'STD'
  sheetDifficulty: string; // 'BAS' | 'ADV' | 'EXP' | 'MAS' | 'REMAS'
}

/**
 * Unified tag for display — works across both community and personal sources.
 * key format: "c:{id}" for community, "p:{id}" for personal.
 */
export interface UnifiedTag {
  key: string;
  name: string;
  description?: string;
  color: string;
  groupName: string;
  groupId: number | null;
  source: 'community' | 'personal';
}

/** Full payload returned by GET /api/tags/combined */
export interface CombinedTagsPayload {
  personal: {
    tagGroups: PersonalTagGroup[];
    tags: PersonalTag[];
    tagSongs: PersonalTagSong[];
  };
  community: {
    tagGroups: CommunityTagGroup[];
    tags: CommunityTag[];
    tagSongs: CommunityTagSong[];
  };
}

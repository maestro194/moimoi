export interface ScoreRow {
  id: number;
  song_title: string;
  difficulty: string;
  song_type: string;
  achievement: number;
  dx_score: number | null;
  fc: string | null;
  fs: string | null;
  played_at: string;
}

export interface SongRow {
  id: number;
  title: string;
  title_kana: string | null;
  artist: string | null;
  catcode: string | null;
  version: string | null;
  image_url: string | null;
  lev_mas: string | null;
  lev_mas_i: string | null;
  dx_lev_mas: string | null;
  dx_lev_mas_i: string | null;
  lev_exp: string | null;
  lev_exp_i: string | null;
  dx_lev_exp: string | null;
  dx_lev_exp_i: string | null;
  lev_adv: string | null;
  lev_adv_i: string | null;
  lev_bas: string | null;
  lev_bas_i: string | null;
  lev_remas: string | null;
  lev_remas_i: string | null;
  lev_utage: string | null;
}

export interface PlayLogRow {
  id: number;
  song_title: string;
  difficulty: string;
  song_type: string;
  achievement: number;
  dx_score: number | null;
  fc: string | null;
  fs: string | null;
  track: number | null;
  details: string | null; // JSON stringified note breakdown
  played_at: string;
}

export interface SyncMetaRow {
  key: string;
  value: string | null;
  updated_at: number | null;
}

// Minimal SQLite-flavoured schema for the mobile app.
// These are plain types — no Drizzle table builders needed for the
// raw SQL init in client.ts. Add drizzle-orm sqlite table defs here
// when we want typed queries in Phase 2.

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
}

export interface SyncMetaRow {
  key: string;
  value: string | null;
  updated_at: number | null;
}

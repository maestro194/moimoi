import Constants from 'expo-constants';
import { sqlite } from './client';
import type { ScoreRow, SongRow, PlayLogRow } from './schema';
import { normalizeTitle } from '@maimai-suite/core';

export const API_URL = Constants.expoConfig?.extra?.apiUrl
  ?? process.env.EXPO_PUBLIC_API_URL
  ?? 'http://192.168.100.243:3000';

/**
 * Trigger a server-side sync (scrapes maimaidx.net → Neon).
 * Returns the number of scores updated.
 */
export async function syncScores(): Promise<{ updated: number }> {
  const res = await fetch(`${API_URL}/api/sync`, { method: 'POST' });
  if (!res.ok) throw new Error(`Sync failed: HTTP ${res.status}`);
  const data = await res.json();
  return { updated: data.updated ?? 0 };
}

/**
 * Fetch the user's B50 board and upsert into local SQLite scores table.
 */
export async function fetchAndCacheBoard(): Promise<void> {
  const res = await fetch(`${API_URL}/api/board`);
  if (!res.ok) throw new Error(`Board fetch failed: HTTP ${res.status}`);
  const { newCharts, oldCharts } = await res.json() as {
    newCharts: any[];
    oldCharts: any[];
  };

  const allScores = [...(newCharts ?? []), ...(oldCharts ?? [])];
  if (!allScores.length) return;

  sqlite.withTransactionSync(() => {
    for (const s of allScores) {
      sqlite.runSync(
        `INSERT INTO scores (id, song_title, difficulty, song_type, achievement, dx_score, fc, fs, played_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           achievement = excluded.achievement,
           dx_score = excluded.dx_score,
           fc = excluded.fc,
           fs = excluded.fs,
           played_at = excluded.played_at`,
        [
          s.id,
          s.songTitle,
          s.difficulty,
          s.songType ?? 'DX',
          s.achievement,
          s.dxScore ?? null,
          s.fc ?? null,
          s.fs ?? null,
          s.playedAt ?? new Date().toISOString(),
        ],
      );
    }
  });

  sqlite.runSync(
    `INSERT INTO sync_meta (key, value, updated_at) VALUES ('last_synced_at', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [new Date().toISOString(), Date.now()],
  );
}

/**
 * Fetch full song database from /api/songs and cache into local SQLite songs table.
 */
export async function fetchAndCacheSongs(): Promise<{ count: number }> {
  const res = await fetch(`${API_URL}/api/songs`);
  if (!res.ok) throw new Error(`Songs fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  const songList = data.songs ?? [];

  if (!songList.length) return { count: 0 };

  sqlite.withTransactionSync(() => {
    for (const song of songList) {
      sqlite.runSync(
        `INSERT INTO songs (
          title, title_kana, artist, catcode, version, image_url,
          lev_mas, lev_mas_i, dx_lev_mas, dx_lev_mas_i,
          lev_exp, lev_exp_i, dx_lev_exp, dx_lev_exp_i,
          lev_adv, lev_adv_i, lev_bas, lev_bas_i,
          lev_remas, lev_remas_i, lev_utage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(title) DO UPDATE SET
          title_kana = excluded.title_kana,
          artist = excluded.artist,
          catcode = excluded.catcode,
          version = excluded.version,
          image_url = excluded.image_url,
          lev_mas = excluded.lev_mas,
          lev_mas_i = excluded.lev_mas_i,
          dx_lev_mas = excluded.dx_lev_mas,
          dx_lev_mas_i = excluded.dx_lev_mas_i,
          lev_exp = excluded.lev_exp,
          lev_exp_i = excluded.lev_exp_i,
          dx_lev_exp = excluded.dx_lev_exp,
          dx_lev_exp_i = excluded.dx_lev_exp_i,
          lev_adv = excluded.lev_adv,
          lev_adv_i = excluded.lev_adv_i,
          lev_bas = excluded.lev_bas,
          lev_bas_i = excluded.lev_bas_i,
          lev_remas = excluded.lev_remas,
          lev_remas_i = excluded.lev_remas_i,
          lev_utage = excluded.lev_utage`,
        [
          song.title,
          song.title_kana ?? null,
          song.artist ?? null,
          song.catcode ?? null,
          song.version ?? null,
          song.image_url ?? null,
          song.lev_mas ?? null,
          song.lev_mas_i ?? null,
          song.dx_lev_mas ?? null,
          song.dx_lev_mas_i ?? null,
          song.lev_exp ?? null,
          song.lev_exp_i ?? null,
          song.dx_lev_exp ?? null,
          song.dx_lev_exp_i ?? null,
          song.lev_adv ?? null,
          song.lev_adv_i ?? null,
          song.lev_bas ?? null,
          song.lev_bas_i ?? null,
          song.lev_remas ?? null,
          song.lev_remas_i ?? null,
          song.lev_utage ?? null,
        ],
      );
    }
  });

  sqlite.runSync(
    `INSERT INTO sync_meta (key, value, updated_at) VALUES ('songs_cached_at', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [new Date().toISOString(), Date.now()],
  );

  return { count: songList.length };
}

/**
 * Fetch recent play history and store in local play_log table.
 */
export async function fetchAndCacheRecent(limit: number = 50): Promise<void> {
  const res = await fetch(`${API_URL}/api/recent-plays?limit=${limit}`);
  if (!res.ok) throw new Error(`Recent plays fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  const recentList = data.recentScores ?? [];

  if (!recentList.length) return;

  sqlite.withTransactionSync(() => {
    for (const r of recentList) {
      sqlite.runSync(
        `INSERT INTO play_log (id, song_title, difficulty, song_type, achievement, dx_score, fc, fs, track, details, played_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           achievement = excluded.achievement,
           dx_score = excluded.dx_score,
           fc = excluded.fc,
           fs = excluded.fs,
           track = excluded.track,
           details = excluded.details,
           played_at = excluded.played_at`,
        [
          r.id,
          r.songTitle,
          r.difficulty,
          r.songType ?? 'DX',
          parseFloat(r.achievement),
          r.dxScore ?? null,
          r.fc ?? null,
          r.fs ?? null,
          r.track ?? null,
          r.details ? JSON.stringify(r.details) : null,
          r.playedAt ?? new Date().toISOString(),
        ],
      );
    }
  });
}

/**
 * Full sync sequence: Scrape -> Cache Board -> Cache Recent -> Cache Songs if empty.
 */
export async function fullSync(): Promise<{ updated: number }> {
  const { updated } = await syncScores();
  await Promise.all([fetchAndCacheBoard(), fetchAndCacheRecent(50)]);

  // If songs table is empty, seed it
  const songCount = getSongsCount();
  if (songCount === 0) {
    await fetchAndCacheSongs();
  }

  return { updated };
}

/**
 * Get count of cached songs.
 */
export function getSongsCount(): number {
  const row = sqlite.getFirstSync<{ count: number }>(`SELECT COUNT(*) as count FROM songs`);
  return row?.count ?? 0;
}

/**
 * Get last synced timestamp.
 */
export function getLastSyncedAt(): string | null {
  const row = sqlite.getFirstSync<{ value: string }>(
    `SELECT value FROM sync_meta WHERE key = 'last_synced_at'`,
  );
  return row?.value ?? null;
}

/**
 * Get cache stats for the Settings tab.
 */
export function getCacheStats(): {
  scoresCount: number;
  songsCount: number;
  recentCount: number;
  lastSyncedAt: string | null;
} {
  const scoresRow = sqlite.getFirstSync<{ count: number }>(`SELECT COUNT(*) as count FROM scores`);
  const songsRow = sqlite.getFirstSync<{ count: number }>(`SELECT COUNT(*) as count FROM songs`);
  const recentRow = sqlite.getFirstSync<{ count: number }>(`SELECT COUNT(*) as count FROM play_log`);
  const lastSync = getLastSyncedAt();

  return {
    scoresCount: scoresRow?.count ?? 0,
    songsCount: songsRow?.count ?? 0,
    recentCount: recentRow?.count ?? 0,
    lastSyncedAt: lastSync,
  };
}

/**
 * Clear all locally stored data.
 */
export function clearLocalData(): void {
  sqlite.runSync(`DELETE FROM scores`);
  sqlite.runSync(`DELETE FROM songs`);
  sqlite.runSync(`DELETE FROM play_log`);
  sqlite.runSync(`DELETE FROM sync_meta`);
  sqlite.runSync(`DELETE FROM arcade_sessions`);
}

/**
 * Get cached scores with associated song details.
 */
export function getCachedScores(): Array<ScoreRow & { song?: SongRow | null }> {
  const scoresList = sqlite.getAllSync<ScoreRow>(`SELECT * FROM scores ORDER BY achievement DESC`);
  const allSongs = sqlite.getAllSync<SongRow>(`SELECT * FROM songs`);

  const songMap = new Map<string, SongRow>();
  for (const s of allSongs) {
    songMap.set(normalizeTitle(s.title), s);
  }

  return scoresList.map(score => ({
    ...score,
    song: songMap.get(normalizeTitle(score.song_title)) ?? null,
  }));
}

/**
 * Get cached recent plays with associated song details.
 */
export function getCachedRecentPlays(): Array<PlayLogRow & { song?: SongRow | null }> {
  const playLogs = sqlite.getAllSync<PlayLogRow>(`SELECT * FROM play_log ORDER BY played_at DESC LIMIT 50`);
  const allSongs = sqlite.getAllSync<SongRow>(`SELECT * FROM songs`);

  const songMap = new Map<string, SongRow>();
  for (const s of allSongs) {
    songMap.set(normalizeTitle(s.title), s);
  }

  return playLogs.map(log => ({
    ...log,
    song: songMap.get(normalizeTitle(log.song_title)) ?? null,
  }));
}

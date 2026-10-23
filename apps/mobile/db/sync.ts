import Constants from 'expo-constants';
import { sqlite } from './client';
import type { ScoreRow, SongRow, PlayLogRow } from './schema';
import { normalizeTitle } from '@maimai-suite/core';

function resolveApiUrl(): string {
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl as string;
  }
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.startsWith('https://')) {
    return envUrl;
  }
  // Dynamically derive host from Expo Metro bundler connection (Expo Go / Dev Client)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3000`;
    }
  }
  return envUrl ?? 'http://10.10.24.229:3000';
}

export const API_URL = resolveApiUrl();

/**
 * Trigger a server-side sync (scrapes maimaidx.net → Neon).
 * Returns the number of scores updated.
 */
export async function syncScores(): Promise<{ updated: number; inserted: number }> {
  const res = await fetch(`${API_URL}/api/sync`, { method: 'POST' });
  if (!res.ok) throw new Error(`Sync failed: HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.split('\n');
  let result = { updated: 0, inserted: 0 };
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line);
      if (data.type === 'error') {
        throw new Error(data.message || 'Sync failed on server');
      }
      if (data.type === 'done' && data.result) {
        result = {
          updated: data.result.updated ?? 0,
          inserted: data.result.inserted ?? 0,
        };
      }
    } catch (e: any) {
      if (e.message && e.message.includes('Sync failed')) throw e;
    }
  }
  return result;
}

/**
 * Fetch all user scores from /api/scores and upsert into local SQLite scores table.
 */
export async function fetchAndCacheScores(): Promise<{ count: number }> {
  const res = await fetch(`${API_URL}/api/scores`);
  if (!res.ok) throw new Error(`Scores fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  const allScores = data.scores ?? [];
  if (!allScores.length) return { count: 0 };

  sqlite.withTransactionSync(() => {
    for (const s of allScores) {
      sqlite.runSync(
        `INSERT INTO scores (id, song_title, difficulty, song_type, achievement, dx_score, fc, fs, played_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           song_title = excluded.song_title,
           difficulty = excluded.difficulty,
           song_type = excluded.song_type,
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
          typeof s.achievement === 'number' ? s.achievement : parseFloat(s.achievement),
          s.dxScore ?? null,
          s.fc ?? null,
          s.fs ?? null,
          s.playedAt ?? new Date().toISOString(),
        ],
      );
    }
  });

  sqlite.runSync(
    `INSERT INTO sync_meta (key, value, updated_at) VALUES ('scores_cached_at', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [new Date().toISOString(), Date.now()],
  );

  return { count: allScores.length };
}

// Backward-compat alias
export const fetchAndCacheBoard = fetchAndCacheScores;

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
          lev_remas, lev_remas_i, lev_utage, bpm, sheets
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          lev_utage = excluded.lev_utage,
          bpm = excluded.bpm,
          sheets = excluded.sheets`,
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
          song.bpm ? String(song.bpm) : null,
          song.sheets ? JSON.stringify(song.sheets) : null,
        ],
      );
    }
  });

  sqlite.runSync(
    `INSERT INTO sync_meta (key, value, updated_at) VALUES ('songs_cached_at', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [new Date().toISOString(), Date.now()],
  );

  if (data.currentVersion) {
    sqlite.runSync(
      `INSERT INTO sync_meta (key, value, updated_at) VALUES ('current_version', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [String(data.currentVersion), Date.now()],
    );
  }

  if (data.categories) {
    sqlite.runSync(
      `INSERT INTO sync_meta (key, value, updated_at) VALUES ('song_categories', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [JSON.stringify(data.categories), Date.now()],
    );
  }

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

export interface PlayerProfileData {
  name: string | null;
  avatar: string | null;
  courseRank: string | null;
  classRank: string | null;
  ratingBase: string | null;
  rating: string | null;
  title: string | null;
  stars: string | null;
  versionPlays: string | null;
  totalPlays: string | null;
  lastSync: string | null;
}

/**
 * Fetch player profile from /api/profile and cache in sync_meta.
 */
export async function fetchAndCacheProfile(): Promise<PlayerProfileData | null> {
  try {
    const res = await fetch(`${API_URL}/api/profile`);
    if (!res.ok) return null;
    const data = await res.json();
    const profile: PlayerProfileData = data.profile;
    if (profile) {
      sqlite.runSync(
        `INSERT INTO sync_meta (key, value, updated_at) VALUES ('player_profile', ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [JSON.stringify(profile), Date.now()]
      );
      return profile;
    }
  } catch (e) {
    console.warn('Could not fetch player profile:', e);
  }
  return null;
}

/**
 * Retrieve cached player profile from SQLite sync_meta.
 */
export function getCachedProfile(): PlayerProfileData | null {
  try {
    const row = sqlite.getFirstSync<{ value: string }>(
      `SELECT value FROM sync_meta WHERE key = 'player_profile'`
    );
    if (row?.value) {
      return JSON.parse(row.value) as PlayerProfileData;
    }
  } catch {}
  return null;
}

/**
 * Direct sync between Web App Cloud DB (Neon) and local SQLite.
 * Pulls scores, recent plays, player profile, and song database without connecting to SEGA.
 */
export async function syncFromWebDb(forceSongs: boolean = false): Promise<{
  scoresCount: number;
  recentCount: number;
  songsCount: number;
  profile: PlayerProfileData | null;
}> {
  const [scoresRes, _, profile] = await Promise.all([
    fetchAndCacheScores(),
    fetchAndCacheRecent(50),
    fetchAndCacheProfile(),
  ]);

  let songCount = getSongsCount();
  if (songCount < 1500 || forceSongs) {
    const res = await fetchAndCacheSongs();
    songCount = res.count;
  }

  sqlite.runSync(
    `INSERT INTO sync_meta (key, value, updated_at) VALUES ('last_synced_at', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [new Date().toISOString(), Date.now()],
  );

  return {
    scoresCount: scoresRes.count,
    recentCount: getRecentPlaysCount(),
    songsCount: songCount,
    profile,
  };
}

/**
 * Full sync sequence:
 * 1. Attempt SEGA scrape via /api/sync.
 * 2. If SEGA is offline/down, catch gracefully and notify.
 * 3. Pull latest state from Web App Cloud DB (Neon) into local SQLite.
 */
export async function fullSync(): Promise<{ updated: number; segaDown: boolean }> {
  let segaUpdated = 0;
  let segaDown = false;

  try {
    const res = await syncScores();
    segaUpdated = res.updated;
  } catch (err) {
    console.warn('[Sync] SEGA maimai NET is currently unreachable. Pulling from Web App DB cache instead.', err);
    segaDown = true;
  }

  await syncFromWebDb();

  return { updated: segaUpdated, segaDown };
}

/**
 * Get count of cached songs.
 */
export function getSongsCount(): number {
  const row = sqlite.getFirstSync<{ count: number }>(`SELECT COUNT(*) as count FROM songs`);
  return row?.count ?? 0;
}

/**
 * Get count of cached recent plays.
 */
export function getRecentPlaysCount(): number {
  const row = sqlite.getFirstSync<{ count: number }>(`SELECT COUNT(*) as count FROM play_log`);
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

export interface ClusteredSession {
  id: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  durationMinutes: number;
  tracksCount: number;
  creditsCount: number;
  plays: Array<PlayLogRow & { song?: SongRow | null }>;
  newPBs: number;
  isActive: boolean;
}

export interface LastCreditSummary {
  tracks: Array<PlayLogRow & { song?: SongRow | null; isPB?: boolean }>;
  ratingDelta: number;
  pbCount: number;
  lastPlayedAt: string | null;
}

/**
 * Cluster recent plays into sessions by grouping plays where gap <= 45 minutes.
 * Returns sessions in descending order (most recent first).
 */
export function clusterSessionsFromPlayLog(
  recentPlays: Array<PlayLogRow & { song?: SongRow | null }>
): ClusteredSession[] {
  if (!recentPlays.length) return [];

  // Sort chronological (oldest to newest) for grouping
  const sorted = [...recentPlays].sort(
    (a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime()
  );

  const clusters: Array<Array<PlayLogRow & { song?: SongRow | null }>> = [];
  let currentCluster: Array<PlayLogRow & { song?: SongRow | null }> = [];

  const MAX_GAP_MS = 45 * 60 * 1000; // 45 minutes

  for (const play of sorted) {
    if (!currentCluster.length) {
      currentCluster.push(play);
      continue;
    }

    const prevPlay = currentCluster[currentCluster.length - 1];
    const diff = new Date(play.played_at).getTime() - new Date(prevPlay.played_at).getTime();

    if (diff <= MAX_GAP_MS) {
      currentCluster.push(play);
    } else {
      clusters.push(currentCluster);
      currentCluster = [play];
    }
  }

  if (currentCluster.length) {
    clusters.push(currentCluster);
  }

  const now = Date.now();
  return clusters
    .reverse()
    .map((cluster, idx) => {
      const first = cluster[0];
      const last = cluster[cluster.length - 1];
      const startMs = new Date(first.played_at).getTime();
      const endMs = new Date(last.played_at).getTime();
      const durationMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));

      let track1Count = 0;
      for (const p of cluster) {
        if (p.track === 1) track1Count++;
      }
      const creditsCount = Math.max(1, track1Count > 0 ? track1Count : Math.ceil(cluster.length / 3));
      const isActive = idx === 0 && (now - endMs <= MAX_GAP_MS);

      return {
        id: `session-${endMs}`,
        startTime: first.played_at,
        endTime: last.played_at,
        durationMinutes,
        tracksCount: cluster.length,
        creditsCount,
        plays: [...cluster].reverse(),
        newPBs: cluster.filter(p => p.achievement >= 100.0).length,
        isActive,
      };
    });
}

/**
 * Identify the most recent credit (group of 3-4 tracks) and check PB status.
 */
export function getLastCreditInfo(
  recentPlays: Array<PlayLogRow & { song?: SongRow | null }>,
  allScores?: ScoreRow[]
): LastCreditSummary | null {
  if (!recentPlays.length) return null;

  const creditPlays: Array<PlayLogRow & { song?: SongRow | null; isPB?: boolean }> = [];
  const firstPlayTime = new Date(recentPlays[0].played_at).getTime();
  const CREDIT_GAP_MS = 20 * 60 * 1000; // 20 min gap between tracks inside 1 credit

  for (let i = 0; i < recentPlays.length && i < 4; i++) {
    const play = recentPlays[i];
    const playTime = new Date(play.played_at).getTime();
    if (firstPlayTime - playTime > CREDIT_GAP_MS) break;

    let isPB = false;
    if (allScores) {
      const existing = allScores.find(
        s => normalizeTitle(s.song_title) === normalizeTitle(play.song_title) &&
             s.difficulty === play.difficulty &&
             (s.song_type ?? 'DX') === (play.song_type ?? 'DX')
      );
      if (existing && play.achievement >= existing.achievement) {
        isPB = true;
      }
    }

    creditPlays.push({ ...play, isPB });

    if (play.track === 1) break;
  }

  if (!creditPlays.length) return null;

  const pbCount = creditPlays.filter(p => p.isPB).length;

  return {
    tracks: creditPlays,
    ratingDelta: pbCount > 0 ? pbCount * 2 : 0,
    pbCount,
    lastPlayedAt: creditPlays[0].played_at,
  };
}

import * as SQLite from 'expo-sqlite';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl
  ?? process.env.EXPO_PUBLIC_API_URL
  ?? 'http://10.0.2.2:3000';

const db = SQLite.openDatabaseSync('moimoi.db');

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

  // Batch upsert all scores
  db.withTransactionSync(() => {
    for (const s of allScores) {
      db.runSync(
        `INSERT INTO scores (id, song_title, difficulty, song_type, achievement, dx_score, fc, fs, played_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           achievement = excluded.achievement,
           fc = excluded.fc,
           fs = excluded.fs`,
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

  // Update sync timestamp
  db.runSync(
    `INSERT INTO sync_meta (key, value, updated_at) VALUES ('last_synced_at', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [new Date().toISOString(), Date.now()],
  );
}

/**
 * Get the last sync timestamp from local DB.
 */
export function getLastSyncedAt(): string | null {
  const row = db.getFirstSync<{ value: string }>(
    `SELECT value FROM sync_meta WHERE key = 'last_synced_at'`,
  );
  return row?.value ?? null;
}

/**
 * Get all cached scores from local SQLite.
 */
export function getCachedScores() {
  return db.getAllSync<{
    id: number;
    song_title: string;
    difficulty: string;
    song_type: string;
    achievement: number;
    fc: string | null;
    fs: string | null;
  }>(`SELECT * FROM scores ORDER BY achievement DESC`);
}

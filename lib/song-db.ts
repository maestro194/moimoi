import type { Song } from './types';
import { db } from './db';
import { songCache } from './db/schema';
import { sql } from 'drizzle-orm';

const OTOGE_DB_INTL_URL = 'https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/data/music-ex-intl.json';
const OTOGE_DB_JP_URL = 'https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/data/music-ex.json';

// Short-lived in-memory cache to avoid hammering DB on every request within the same process
let memCache: Song[] | null = null;
let memCacheTimestamp = 0;
const MEM_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Both the intl and JP databases use `dx_lev_*` field names for DX-type charts,
 * while the app's Song type expects `lev_*` field names.
 * This function normalizes any song entry so `lev_*` fields are always populated.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSong(song: any): Song {
  return {
    ...song,
    // STD display levels — prefer explicit STD, fall back to DX display
    lev_bas:       song.lev_bas     ?? song.dx_lev_bas,
    lev_adv:       song.lev_adv     ?? song.dx_lev_adv,
    lev_exp:       song.lev_exp     ?? song.dx_lev_exp,
    lev_mas:       song.lev_mas     ?? song.dx_lev_mas,
    lev_remas:     song.lev_remas   ?? song.dx_lev_remas,
    lev_utage:     song.lev_utage   ?? song.dx_lev_utage,
    kanji:         song.kanji,
    // Normalized internal levels — STD preferred (for STD-only songs); DX fallback
    // For DX-only songs these equal the dx_lev_*_i values below.
    lev_bas_i:     song.lev_bas_i   ?? song.dx_lev_bas_i,
    lev_adv_i:     song.lev_adv_i   ?? song.dx_lev_adv_i,
    lev_exp_i:     song.lev_exp_i   ?? song.dx_lev_exp_i,
    lev_mas_i:     song.lev_mas_i   ?? song.dx_lev_mas_i,
    lev_remas_i:   song.lev_remas_i ?? song.dx_lev_remas_i,
    // Explicit DX internal levels — always preserved from the raw DB entry.
    // For songs with BOTH STD and DX charts, lev_*_i has the STD level
    // while dx_lev_*_i has the DX level. Rating uses the right one per chart type.
    dx_lev_bas_i:  song.dx_lev_bas_i,
    dx_lev_adv_i:  song.dx_lev_adv_i,
    dx_lev_exp_i:  song.dx_lev_exp_i,
    dx_lev_mas_i:  song.dx_lev_mas_i,
    dx_lev_remas_i: song.dx_lev_remas_i,
    dx_lev_bas:    song.dx_lev_bas,
    dx_lev_adv:    song.dx_lev_adv,
    dx_lev_exp:    song.dx_lev_exp,
    dx_lev_mas:    song.dx_lev_mas,
    dx_lev_remas:  song.dx_lev_remas,
  };
}

/**
 * Fetch the merged song list from GitHub (intl + JP fallback) and normalize.
 */
export async function fetchSongsFromGitHub(): Promise<Song[]> {
  const [resIntl, resJp] = await Promise.all([
    fetch(OTOGE_DB_INTL_URL, { headers: { 'User-Agent': 'moimoi-tracker/1.0' } }),
    fetch(OTOGE_DB_JP_URL,   { headers: { 'User-Agent': 'moimoi-tracker/1.0' } }),
  ]);

  if (!resIntl.ok) throw new Error(`otoge-db intl fetch failed: ${resIntl.status}`);
  if (!resJp.ok)   throw new Error(`otoge-db jp fetch failed: ${resJp.status}`);

  const dataIntl: Song[] = await resIntl.json();
  const dataJp: Song[]   = await resJp.json();

  // Merge: intl takes precedence; JP fills in missing songs (e.g. newly released CiRCLE tracks)
  // Normalize ALL songs since both dbs use dx_lev_* prefix for DX-type charts
  const mergedMap = new Map<string, Song>();
  for (const song of dataIntl) {
    mergedMap.set(song.title, normalizeSong(song));
  }
  for (const song of dataJp) {
    if (!mergedMap.has(song.title)) {
      mergedMap.set(song.title, normalizeSong(song));
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * Persist a song list into the DB song_cache table via upsert.
 * Runs in batches to stay within Neon's parameter limits.
 */
export async function persistSongsToDb(songs: Song[]): Promise<void> {
  const BATCH = 200;
  for (let i = 0; i < songs.length; i += BATCH) {
    const batch = songs.slice(i, i + BATCH);
    await db.insert(songCache).values(
      batch.map(s => ({
        title:     s.title,
        sort:      s.sort      ?? null,
        titleKana: s.title_kana ?? null,
        artist:    s.artist,
        catcode:   s.catcode,
        version:   s.version,
        bpm:       s.bpm       ?? null,
        imageUrl:  s.image_url ?? null,
        levBas:      s.lev_bas      ?? null,
        levAdv:      s.lev_adv      ?? null,
        levExp:      s.lev_exp      ?? null,
        levMas:      s.lev_mas      ?? null,
        levRemas:    s.lev_remas    ?? null,
        levBasI:     s.lev_bas_i    ?? null,
        levAdvI:     s.lev_adv_i    ?? null,
        levExpI:     s.lev_exp_i    ?? null,
        levMasI:     s.lev_mas_i    ?? null,
        levRemasI:   s.lev_remas_i  ?? null,
        levUtage:    s.lev_utage    ?? null,
        kanji:       s.kanji        ?? null,
        dxLevBas:    s.dx_lev_bas   ?? null,
        dxLevAdv:    s.dx_lev_adv   ?? null,
        dxLevExp:    s.dx_lev_exp   ?? null,
        dxLevMas:    s.dx_lev_mas   ?? null,
        dxLevRemas:  s.dx_lev_remas ?? null,
        dxLevBasI:   s.dx_lev_bas_i   ?? null,
        dxLevAdvI:   s.dx_lev_adv_i   ?? null,
        dxLevExpI:   s.dx_lev_exp_i   ?? null,
        dxLevMasI:   s.dx_lev_mas_i   ?? null,
        dxLevRemasI: s.dx_lev_remas_i ?? null,
        intl:      s.intl      ?? null,
        dateAdded: s.date_added ?? null,
      }))
    ).onConflictDoUpdate({
      target: songCache.title,
      set: {
        sort:      sql`excluded.sort`,
        titleKana: sql`excluded.title_kana`,
        artist:    sql`excluded.artist`,
        catcode:   sql`excluded.catcode`,
        version:   sql`excluded.version`,
        bpm:       sql`excluded.bpm`,
        imageUrl:  sql`excluded.image_url`,
        levBas:      sql`excluded.lev_bas`,
        levAdv:      sql`excluded.lev_adv`,
        levExp:      sql`excluded.lev_exp`,
        levMas:      sql`excluded.lev_mas`,
        levRemas:    sql`excluded.lev_remas`,
        levBasI:     sql`excluded.lev_bas_i`,
        levAdvI:     sql`excluded.lev_adv_i`,
        levExpI:     sql`excluded.lev_exp_i`,
        levMasI:     sql`excluded.lev_mas_i`,
        levRemasI:   sql`excluded.lev_remas_i`,
        levUtage:    sql`excluded.lev_utage`,
        kanji:       sql`excluded.kanji`,
        dxLevBas:    sql`excluded.dx_lev_bas`,
        dxLevAdv:    sql`excluded.dx_lev_adv`,
        dxLevExp:    sql`excluded.dx_lev_exp`,
        dxLevMas:    sql`excluded.dx_lev_mas`,
        dxLevRemas:  sql`excluded.dx_lev_remas`,
        dxLevBasI:   sql`excluded.dx_lev_bas_i`,
        dxLevAdvI:   sql`excluded.dx_lev_adv_i`,
        dxLevExpI:   sql`excluded.dx_lev_exp_i`,
        dxLevMasI:   sql`excluded.dx_lev_mas_i`,
        dxLevRemasI: sql`excluded.dx_lev_remas_i`,
        intl:      sql`excluded.intl`,
        dateAdded: sql`excluded.date_added`,
        cachedAt:  sql`now()`,
      },
    });
  }
}

/**
 * Load songs from the DB cache table, converting column names back to Song shape.
 * Returns an empty array if the table is empty.
 */
async function loadSongsFromDb(): Promise<Song[]> {
  const rows = await db.select().from(songCache);
  return rows.map(r => ({
    sort:        r.sort        ?? '',
    title:       r.title,
    title_kana:  r.titleKana   ?? '',
    artist:      r.artist,
    catcode:     r.catcode,
    version:     r.version,
    bpm:         r.bpm         ?? '',
    image_url:   r.imageUrl    ?? '',
    release:     '',
    lev_bas:       r.levBas       ?? undefined,
    lev_adv:       r.levAdv       ?? undefined,
    lev_exp:       r.levExp       ?? undefined,
    lev_mas:       r.levMas       ?? undefined,
    lev_remas:     r.levRemas     ?? undefined,
    lev_bas_i:     r.levBasI      ?? undefined,
    lev_adv_i:     r.levAdvI      ?? undefined,
    lev_exp_i:     r.levExpI      ?? undefined,
    lev_mas_i:     r.levMasI      ?? undefined,
    lev_remas_i:   r.levRemasI    ?? undefined,
    lev_utage:     r.levUtage     ?? undefined,
    kanji:         r.kanji        ?? undefined,
    dx_lev_bas:    r.dxLevBas     ?? undefined,
    dx_lev_adv:    r.dxLevAdv     ?? undefined,
    dx_lev_exp:    r.dxLevExp     ?? undefined,
    dx_lev_mas:    r.dxLevMas     ?? undefined,
    dx_lev_remas:  r.dxLevRemas   ?? undefined,
    dx_lev_bas_i:  r.dxLevBasI    ?? undefined,
    dx_lev_adv_i:  r.dxLevAdvI    ?? undefined,
    dx_lev_exp_i:  r.dxLevExpI    ?? undefined,
    dx_lev_mas_i:  r.dxLevMasI    ?? undefined,
    dx_lev_remas_i: r.dxLevRemasI ?? undefined,
    intl:        r.intl        ?? undefined,
    date_added:  r.dateAdded   ?? undefined,
  }));
}

/**
 * Main entry point. Priority order:
 *   1. In-memory cache (5 min TTL — avoids DB round-trips within same process)
 *   2. DB cache (populated by the admin refresh endpoint)
 *   3. GitHub fallback (if DB is empty — first-run bootstrap)
 *
 * After a GitHub fetch, results are automatically persisted to the DB.
 */
export async function fetchSongs(forceRefresh = false): Promise<Song[]> {
  const now = Date.now();

  // 1. In-memory cache
  if (!forceRefresh && memCache && now - memCacheTimestamp < MEM_CACHE_TTL_MS) {
    return memCache;
  }

  // 2. DB cache
  try {
    if (!forceRefresh) {
      const dbSongs = await loadSongsFromDb();
      if (dbSongs.length > 0) {
        // Detect stale cache: if >50% of songs have no internal level data,
        // the DB was populated before normalization was fixed — fall through to GitHub
        const missingLevels = dbSongs.filter(s => !s.lev_mas_i && !s.lev_exp_i).length;
        const isStale = missingLevels / dbSongs.length > 0.5;
        if (!isStale) {
          memCache = dbSongs;
          memCacheTimestamp = now;
          return dbSongs;
        }
        console.warn(`Song DB cache is stale (${missingLevels}/${dbSongs.length} songs missing levels), refreshing from GitHub...`);
      }
    }
  } catch (err) {
    console.warn('Failed to load songs from DB, falling back to GitHub:', err);
  }

  // 3. GitHub fallback / forced refresh
  const songs = await fetchSongsFromGitHub();
  memCache = songs;
  memCacheTimestamp = now;

  // Persist to DB in background (don't block response)
  persistSongsToDb(songs).catch(err =>
    console.error('Failed to persist songs to DB:', err)
  );

  return songs;
}

/**
 * Build a lookup map from song title -> Song object.
 */
export function buildSongMap(songs: Song[]): Map<string, Song> {
  const map = new Map<string, Song>();
  for (const song of songs) {
    const existing = map.get(song.title);
    // Prefer the entry that has more internal level data
    if (!existing || ((song.lev_mas_i || song.lev_exp_i) && !existing.lev_mas_i && !existing.lev_exp_i)) {
      map.set(song.title, song);
    }
  }
  return map;
}

/**
 * Auto-detect the current game version number from the song DB.
 * Requires at least 20 songs at a version to consider it a real release.
 */
export function detectCurrentVersion(songs: Song[]): number {
  const counts = new Map<number, number>();
  let max = 0;

  for (const song of songs) {
    const v = parseInt(song.version, 10);
    if (!isNaN(v)) {
      counts.set(v, (counts.get(v) || 0) + 1);
    }
  }

  for (const [v, count] of counts.entries()) {
    if (count >= 20 && v > max) {
      max = v;
    }
  }

  return max || 25000;
}

/**
 * Get all unique categories in the song DB.
 */
export function getSongCategories(songs: Song[]): string[] {
  return Array.from(new Set(songs.map(s => s.catcode))).sort();
}

/**
 * Filter songs by search query (title or artist).
 */
export function searchSongs(songs: Song[], query: string): Song[] {
  const q = query.toLowerCase();
  return songs.filter(
    s =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.title_kana?.toLowerCase().includes(q),
  );
}

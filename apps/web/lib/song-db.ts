import type { Song } from '@maimai-suite/core';
import { db } from './db';
import { songs } from './db/schema';
import { eq, inArray, sql } from 'drizzle-orm';

const OTOGE_DB_INTL_URL = 'https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/data/music-ex-intl.json';
const DXDATA_URL        = 'https://raw.githubusercontent.com/gekichumai/dxrating/main/packages/dxdata/dxdata.json';

// ── Chart constants are pinned to one game version ────────────────────────────
// JP runs a version ahead of INTL, and DXRating's `internalLevelValue` tracks JP's *current* version,
// so it can't be used as-is. The constants come from otoge-db's frozen snapshot of this version
// (the same constants JP and INTL use for it). Bump both together when INTL moves to the next version
// (e.g. 'MAGiCAL' + music-ex-magical-final.json, or music-ex.json while that version is still live).
const CONSTANTS_VERSION = 'CiRCLE PLUS';
const OTOGE_DB_CONSTANTS_URL = 'https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/data/music-ex-circleplus-final.json';
const CONSTANT_FIELDS = [
  'lev_bas_i', 'lev_adv_i', 'lev_exp_i', 'lev_mas_i', 'lev_remas_i',
  'dx_lev_bas_i', 'dx_lev_adv_i', 'dx_lev_exp_i', 'dx_lev_mas_i', 'dx_lev_remas_i',
] as const;

// Short-lived in-memory cache to avoid hammering DB on every request within the same process
let memCache: Song[] | null = null;
let memCacheTimestamp = 0;
const MEM_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Invalidate the in-memory cache so next call reads fresh data from DB. */
export function bustMemCache() {
  memCache = null;
  memCacheTimestamp = 0;
}

// ─── Normalisation ────────────────────────────────────────────────────────────

/**
 * Normalizes a raw song object from otoge-db JSON into the canonical Song shape.
 * STD fields stay as-is; DX fields are preserved separately.
 * No fallback bleed-over between STD and DX — each is null if the chart doesn't exist.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSong(song: any): Song {
  return {
    ...song,
    sort:       song.sort,
    title:      song.title,
    title_kana: song.title_kana,
    artist:     song.artist,
    catcode:    song.catcode,
    version:    song.version,
    bpm:        song.bpm,
    image_url:  song.image_url,
    // STD display levels (null when no STD chart)
    lev_bas:    song.lev_bas    ?? undefined,
    lev_adv:    song.lev_adv    ?? undefined,
    lev_exp:    song.lev_exp    ?? undefined,
    lev_mas:    song.lev_mas    ?? undefined,
    lev_remas:  song.lev_remas  ?? undefined,
    lev_utage:  song.lev_utage  ?? undefined,
    kanji:      song.kanji      ?? undefined,
    // STD internal levels
    lev_bas_i:   song.lev_bas_i   ?? undefined,
    lev_adv_i:   song.lev_adv_i   ?? undefined,
    lev_exp_i:   song.lev_exp_i   ?? undefined,
    lev_mas_i:   song.lev_mas_i   ?? undefined,
    lev_remas_i: song.lev_remas_i ?? undefined,
    // DX display levels
    dx_lev_bas:   song.dx_lev_bas   ?? undefined,
    dx_lev_adv:   song.dx_lev_adv   ?? undefined,
    dx_lev_exp:   song.dx_lev_exp   ?? undefined,
    dx_lev_mas:   song.dx_lev_mas   ?? undefined,
    dx_lev_remas: song.dx_lev_remas ?? undefined,
    // DX internal levels
    dx_lev_bas_i:   song.dx_lev_bas_i   ?? undefined,
    dx_lev_adv_i:   song.dx_lev_adv_i   ?? undefined,
    dx_lev_exp_i:   song.dx_lev_exp_i   ?? undefined,
    dx_lev_mas_i:   song.dx_lev_mas_i   ?? undefined,
    dx_lev_remas_i: song.dx_lev_remas_i ?? undefined,
    date_added:       song.date_added       ?? undefined,
    date_intl_added:  song.date_intl_added   ?? undefined,
    sheets:           song.sheets            ?? undefined,
  };
}

// ─── Fetching ─────────────────────────────────────────────────────────────────

/** Fetch a URL, automatically retrying on HTTP 429 Too Many Requests. */
async function fetchWithRetry(url: string, retries = 3, delayMs = 2000): Promise<Response> {
  const headers = { 'User-Agent': 'moimoi-tracker/1.0' };
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, { headers });
    if (res.status !== 429) return res;
    if (attempt < retries - 1) {
      const retryAfter = parseInt(res.headers.get('retry-after') ?? '0', 10) * 1000 || delayMs;
      await new Promise(r => setTimeout(r, retryAfter));
    }
  }
  return fetch(url, { headers });
}

export interface RefreshResult {
  count: number;
  dxratingVersion: string | null;
  intlFetched: boolean;
  durationMs: number;
}

/**
 * Full pipeline: fetch from GitHub sources, merge, persist to DB, bust cache.
 * This is the ONLY place that talks to external URLs.
 * Called explicitly by POST /api/refresh-songs — never auto-triggered at runtime.
 */
export async function refreshSongsDb(): Promise<RefreshResult> {
  const t0 = Date.now();

  // Fetch sequentially to stay under unauthenticated rate limits if applicable
  const resOtoge = await fetchWithRetry(OTOGE_DB_INTL_URL);
  if (!resOtoge.ok) throw new Error(`otoge-db INTL fetch failed: ${resOtoge.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataOtoge: any[] = await resOtoge.json();

  const resDx = await fetchWithRetry(DXDATA_URL);
  if (!resDx.ok) throw new Error(`dxdata fetch failed: ${resDx.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataDx: any = await resDx.json();

  const resConst = await fetchWithRetry(OTOGE_DB_CONSTANTS_URL);
  if (!resConst.ok) throw new Error(`otoge-db ${CONSTANTS_VERSION} constants fetch failed: ${resConst.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataConst: any[] = await resConst.json();

  // ── Transform otoge-db data ───────────────────────────────────────────────────
  const mergedMap = new Map<string, Song>();
  for (const s of dataOtoge) {
    mergedMap.set(s.title, normalizeSong(s));
  }

  // ── Enrich with dxrating data ────────────────────────────────────────────────
  // dxdata.json structure:
  //   { version: "1.5.3", songs: [{ title, sheets: [{ type: "dx"|"std", internalLevel, regions: { jp, intl } }] }] }
  const dxratingVersion: string | null = dataDx?.version ?? null;

  if (dataDx?.songs && Array.isArray(dataDx.songs)) {
    for (const dxSong of dataDx.songs) {
      const existing = mergedMap.get(dxSong.title);
      if (!existing || !Array.isArray(dxSong.sheets)) continue;

      // Walk each sheet to apply constants and region flags
      // Difficulty order in dxdata: 0=BAS, 1=ADV, 2=EXP, 3=MAS, 4=REMAS
      const diffKeys = ['bas', 'adv', 'exp', 'mas', 'remas'] as const;

      // Constant fields by name (Song declares them individually)
      const fields = existing as unknown as Record<string, string | undefined>;

      // Collect sheets by type
      const stdSheets = dxSong.sheets.filter((sh: any) => sh.type === 'std');
      const dxSheets  = dxSong.sheets.filter((sh: any) => sh.type === 'dx');

      // Constant for CONSTANTS_VERSION if DXRating lists one. Its `internalLevelValue` is JP's current
      // version, so it's only used to fill a chart that has no constant at all.
      const resolveInternalLevel = (sh: any, current: string | undefined) => {
        const pinned = sh.multiverInternalLevelValue?.[CONSTANTS_VERSION];
        if (pinned != null) return pinned;
        return current ? null : (sh.internalLevelValue ?? sh.internalLevel ?? null);
      };

      // Apply STD constants
      for (let i = 0; i < stdSheets.length && i < diffKeys.length; i++) {
        const sh = stdSheets[i];
        const dk = diffKeys[i];
        const level = resolveInternalLevel(sh, fields[`lev_${dk}_i`]);
        if (level != null) {
          fields[`lev_${dk}_i`] = String(level);
        }
      }

      // Apply DX constants + region flags (use first DX sheet for region)
      for (let i = 0; i < dxSheets.length && i < diffKeys.length; i++) {
        const sh = dxSheets[i];
        const dk = diffKeys[i];
        const level = resolveInternalLevel(sh, fields[`dx_lev_${dk}_i`]);
        if (level != null) {
          fields[`dx_lev_${dk}_i`] = String(level);
        }
        if (i === 0 && sh.regions) {
          existing.intl = sh.regions.intl ?? true;
          existing.jp   = sh.regions.jp   ?? true;
        }
      }

      // If only STD sheets exist, pull region from STD sheet[0]
      if (dxSheets.length === 0 && stdSheets.length > 0 && stdSheets[0].regions) {
        existing.intl = stdSheets[0].regions.intl ?? true;
        existing.jp   = stdSheets[0].regions.jp   ?? true;
      }

      // Backfill missing metadata from dxdata
      if (dxSong.bpm) {
        existing.bpm = String(dxSong.bpm);
      }
      
      // Save raw sheets for note counts & designers
      existing.sheets = dxSong.sheets;

      // Attempt to backfill date_added from the earliest sheet releaseDate
      const allSheets = [...stdSheets, ...dxSheets];
      const validDates = allSheets.map((sh: any) => sh.releaseDate).filter(Boolean);
      if (validDates.length > 0) {
        // Find the earliest date
        validDates.sort();
        // date_added in DB is typically YYYYMMDD, let's normalize from YYYY-MM-DD
        existing.date_added = validDates[0].replace(/-/g, '');
      }
    }
  }

  // ── Pin chart constants to CONSTANTS_VERSION (highest priority) ─────────────
  for (const cs of dataConst) {
    const existing = mergedMap.get(cs.title) as unknown as Record<string, string | undefined> | undefined;
    if (!existing) continue;
    for (const field of CONSTANT_FIELDS) {
      if (cs[field] != null && cs[field] !== '') existing[field] = String(cs[field]);
    }
  }

  const merged = Array.from(mergedMap.values());

  // ── Persist to DB ────────────────────────────────────────────────────────────
  await persistSongsToDb(merged, dxratingVersion);

  // Songs already in the table but missing from the INTL list (JP-listed songs) aren't rewritten
  // above, so pin their constants too — constant fields only, no songs are added.
  const unlisted = dataConst.filter(cs => !mergedMap.has(cs.title));
  await pinConstantsOnExistingRows(unlisted);

  // Bust memory cache so next request reads fresh data
  bustMemCache();

  return {
    count: merged.length,
    dxratingVersion,
    intlFetched: true,
    durationMs: Date.now() - t0,
  };
}

// ─── Version ──────────────────────────────────────────────────────────────────

/**
 * Latest refreshed_at across the songs table (ISO string), or null if it is empty. Changes whenever a
 * song DB refresh writes rows, so clients can skip re-downloading the full song list when it hasn't.
 */
export async function getSongsVersion(): Promise<string | null> {
  const [row] = await db.select({ v: sql<string | null>`max(${songs.refreshedAt})` }).from(songs);
  return row?.v ? new Date(row.v).toISOString() : null;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const CONSTANT_COLUMNS: Record<(typeof CONSTANT_FIELDS)[number], keyof typeof songs.$inferInsert> = {
  lev_bas_i: 'levBasI', lev_adv_i: 'levAdvI', lev_exp_i: 'levExpI', lev_mas_i: 'levMasI', lev_remas_i: 'levRemasI',
  dx_lev_bas_i: 'dxLevBasI', dx_lev_adv_i: 'dxLevAdvI', dx_lev_exp_i: 'dxLevExpI', dx_lev_mas_i: 'dxLevMasI', dx_lev_remas_i: 'dxLevRemasI',
};

/** Overwrite just the chart-constant columns of existing `songs` rows from the CONSTANTS_VERSION snapshot. */
async function pinConstantsOnExistingRows(snapshot: Record<string, unknown>[]): Promise<void> {
  const titles = snapshot.map(cs => String(cs.title));
  if (titles.length === 0) return;
  const existing = new Set(
    (await db.select({ title: songs.title }).from(songs).where(inArray(songs.title, titles))).map(r => r.title),
  );
  for (const cs of snapshot) {
    if (!existing.has(String(cs.title))) continue;
    const patch: Partial<typeof songs.$inferInsert> = {};
    for (const field of CONSTANT_FIELDS) {
      const v = cs[field];
      if (v != null && v !== '') (patch as Record<string, string>)[CONSTANT_COLUMNS[field]] = String(v);
    }
    if (Object.keys(patch).length > 0) {
      await db.update(songs).set(patch).where(eq(songs.title, String(cs.title)));
    }
  }
}

/**
 * Upsert a song list into the `songs` table in batches of 200.
 * Sets refreshed_at = now() and stores the dxrating version on every row.
 */
export async function persistSongsToDb(songList: Song[], dxratingVersion: string | null = null): Promise<void> {
  const BATCH = 200;
  for (let i = 0; i < songList.length; i += BATCH) {
    const batch = songList.slice(i, i + BATCH);
    await db.insert(songs).values(
      batch.map(s => ({
        title:     s.title,
        sort:      s.sort      ?? null,
        titleKana: s.title_kana ?? null,
        artist:    s.artist    ?? '',
        catcode:   s.catcode   ?? '',
        version:   s.version   ?? '',
        bpm:       s.bpm       ?? null,
        imageUrl:  s.image_url ?? null,
        levBas:    s.lev_bas    ?? null,
        levAdv:    s.lev_adv    ?? null,
        levExp:    s.lev_exp    ?? null,
        levMas:    s.lev_mas    ?? null,
        levRemas:  s.lev_remas  ?? null,
        levUtage:  s.lev_utage  ?? null,
        kanji:     s.kanji      ?? null,
        levBasI:   s.lev_bas_i   ?? null,
        levAdvI:   s.lev_adv_i   ?? null,
        levExpI:   s.lev_exp_i   ?? null,
        levMasI:   s.lev_mas_i   ?? null,
        levRemasI: s.lev_remas_i ?? null,
        dxLevBas:   s.dx_lev_bas   ?? null,
        dxLevAdv:   s.dx_lev_adv   ?? null,
        dxLevExp:   s.dx_lev_exp   ?? null,
        dxLevMas:   s.dx_lev_mas   ?? null,
        dxLevRemas: s.dx_lev_remas ?? null,
        dxLevBasI:   s.dx_lev_bas_i   ?? null,
        dxLevAdvI:   s.dx_lev_adv_i   ?? null,
        dxLevExpI:   s.dx_lev_exp_i   ?? null,
        dxLevMasI:   s.dx_lev_mas_i   ?? null,
        dxLevRemasI: s.dx_lev_remas_i ?? null,
        jp:        s.jp   ?? true,
        intl:      s.intl ?? true,
        dateAdded:      s.date_added       ?? null,
        dateIntlAdded:  s.date_intl_added  ?? null,
        dxratingVersion: dxratingVersion ?? null,
        refreshedAt: new Date(),
        sheets:    s.sheets ?? null,
      }))
    ).onConflictDoUpdate({
      target: songs.title,
      set: {
        sort:      sql`excluded.sort`,
        titleKana: sql`excluded.title_kana`,
        artist:    sql`excluded.artist`,
        catcode:   sql`excluded.catcode`,
        version:   sql`excluded.version`,
        bpm:       sql`excluded.bpm`,
        imageUrl:  sql`excluded.image_url`,
        levBas:    sql`excluded.lev_bas`,
        levAdv:    sql`excluded.lev_adv`,
        levExp:    sql`excluded.lev_exp`,
        levMas:    sql`excluded.lev_mas`,
        levRemas:  sql`excluded.lev_remas`,
        levUtage:  sql`excluded.lev_utage`,
        kanji:     sql`excluded.kanji`,
        levBasI:   sql`excluded.lev_bas_i`,
        levAdvI:   sql`excluded.lev_adv_i`,
        levExpI:   sql`excluded.lev_exp_i`,
        levMasI:   sql`excluded.lev_mas_i`,
        levRemasI: sql`excluded.lev_remas_i`,
        dxLevBas:   sql`excluded.dx_lev_bas`,
        dxLevAdv:   sql`excluded.dx_lev_adv`,
        dxLevExp:   sql`excluded.dx_lev_exp`,
        dxLevMas:   sql`excluded.dx_lev_mas`,
        dxLevRemas: sql`excluded.dx_lev_remas`,
        dxLevBasI:   sql`excluded.dx_lev_bas_i`,
        dxLevAdvI:   sql`excluded.dx_lev_adv_i`,
        dxLevExpI:   sql`excluded.dx_lev_exp_i`,
        dxLevMasI:   sql`excluded.dx_lev_mas_i`,
        dxLevRemasI: sql`excluded.dx_lev_remas_i`,
        jp:   sql`excluded.jp`,
        intl: sql`excluded.intl`,
        dateAdded:       sql`excluded.date_added`,
        dateIntlAdded:   sql`excluded.date_intl_added`,
        dxratingVersion: sql`excluded.dxrating_version`,
        refreshedAt:     sql`now()`,
        sheets:          sql`excluded.sheets`,
      },
    });
  }
}

// ─── Reading ───────────────────────────────────────────────────────────────────

/** Load the full song list from the DB `songs` table. Returns [] if empty. */
async function loadSongsFromDb(): Promise<Song[]> {
  const rows = await db.select().from(songs);
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
    lev_bas:     r.levBas      ?? undefined,
    lev_adv:     r.levAdv      ?? undefined,
    lev_exp:     r.levExp      ?? undefined,
    lev_mas:     r.levMas      ?? undefined,
    lev_remas:   r.levRemas    ?? undefined,
    lev_bas_i:   r.levBasI     ?? undefined,
    lev_adv_i:   r.levAdvI     ?? undefined,
    lev_exp_i:   r.levExpI     ?? undefined,
    lev_mas_i:   r.levMasI     ?? undefined,
    lev_remas_i: r.levRemasI   ?? undefined,
    lev_utage:   r.levUtage    ?? undefined,
    kanji:       r.kanji       ?? undefined,
    dx_lev_bas:   r.dxLevBas   ?? undefined,
    dx_lev_adv:   r.dxLevAdv   ?? undefined,
    dx_lev_exp:   r.dxLevExp   ?? undefined,
    dx_lev_mas:   r.dxLevMas   ?? undefined,
    dx_lev_remas: r.dxLevRemas ?? undefined,
    dx_lev_bas_i:   r.dxLevBasI   ?? undefined,
    dx_lev_adv_i:   r.dxLevAdvI   ?? undefined,
    dx_lev_exp_i:   r.dxLevExpI   ?? undefined,
    dx_lev_mas_i:   r.dxLevMasI   ?? undefined,
    dx_lev_remas_i: r.dxLevRemasI ?? undefined,
    jp:          r.jp    ?? undefined,
    intl:        r.intl  ?? undefined,
    date_added:       r.dateAdded      ?? undefined,
    date_intl_added:  r.dateIntlAdded  ?? undefined,
    sheets:      (r.sheets as any[]) ?? undefined,
  }));
}

/**
 * Main entry point for reading songs.
 *
 * Priority order:
 *   1. In-memory cache (5 min TTL — avoids DB round-trips within the same process)
 *   2. DB (songs table — the canonical source)
 *
 * No automatic GitHub fallback. If the DB is empty, returns [].
 * To populate/refresh the DB, call POST /api/refresh-songs.
 */
export async function fetchSongs(): Promise<Song[]> {
  const now = Date.now();

  // In-memory cache: fast path within the same serverless invocation
  if (memCache && now - memCacheTimestamp < MEM_CACHE_TTL_MS) {
    return memCache;
  }

  try {
    const dbSongs = await loadSongsFromDb();
    memCache = dbSongs;
    memCacheTimestamp = now;
    return dbSongs;
  } catch (err) {
    console.error('Failed to load songs from DB:', err);
    return [];
  }
}

// ─── Backwards-compat exports ─────────────────────────────────────────────────

/**
 * @deprecated Use refreshSongsDb() instead (returns richer result).
 * Kept for any code that still calls fetchSongsFromGitHub() directly.
 */
export async function fetchSongsFromGitHub(): Promise<Song[]> {
  const result = await refreshSongsDb();
  return fetchSongs();
}

// ─── Utilities ────────────────────────────────────────────────────────────────

// Jacket URLs live in ./jacket (DB-free, safe for client components); re-exported for existing imports.
export { getJacketUrl, getJacketUrls } from './jacket';

/** Current game version from the song DB (shared rule in @maimai-suite/core). */
export { detectCurrentVersion } from '@maimai-suite/core';

/** Get all unique categories in the song DB. */
export function getSongCategories(songs: Song[]): string[] {
  return Array.from(new Set(songs.map(s => s.catcode))).sort();
}

/** Filter songs by search query (title, artist, or kana). */
export function searchSongs(songs: Song[], query: string): Song[] {
  const q = query.toLowerCase();
  return songs.filter(
    s =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.title_kana?.toLowerCase().includes(q),
  );
}

/**
 * maimai NET scraper / auto-sync service
 *
 * This module handles authentication and score scraping from:
 *   - maimai NET JP: https://maimaidx.jp/maimai-mobile/
 *   - maimai NET International: https://maimaidx-eng.com/maimai-mobile/
 *
 * The approach is based on tomomai's maimai-login.ts:
 *  - For INTL: stores a clal= cookie (session token) and uses it to scrape score pages
 *  - For JP: uses account credentials or a session cookie
 *
 * Scores are scraped from the score ranking pages for each difficulty.
 */

import * as cheerio from 'cheerio';
import type { Difficulty, FC, FS, Region, SongType } from './types';
import { db } from './db';
import { scores, playLog, settings } from './db/schema';
import { eq, desc } from 'drizzle-orm';
import { CookieJar } from 'tough-cookie';
import makeFetchCookie from 'fetch-cookie';

const MAIMAI_BASE: Record<Region, string> = {
  jp:   'https://maimaidx.jp/maimai-mobile',
  intl: 'https://maimaidx-eng.com/maimai-mobile',
};

// ─── Credential storage ──────────────────────────────────────────────────────

export async function saveSetting(key: string, value: string) {
  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return row[0]?.value ?? null;
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

/** Build cookie string from a session token */
function buildCookieHeader(token: string, region: Region): string {
  // If they pasted the full "name=value", use it directly
  if (token.includes('=')) {
    return token;
  }
  // Otherwise, use the correct cookie name for the region
  const prefix = region === 'intl' ? '_t=' : 'clal=';
  return `${prefix}${token}`;
}

async function maimaiGet(
  region: Region,
  path: string,
  token: string,
): Promise<string> {
  const url = `${MAIMAI_BASE[region]}/${path}`;
  const res = await fetch(url, {
    headers: {
      Cookie: buildCookieHeader(token, region),
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      Referer: `${MAIMAI_BASE[region]}/`,
    },
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`maimai NET responded ${res.status} for ${path}`);
  }
  return res.text();
}

/**
 * Automates SEGA ID login to fetch a new session cookie.
 */
export async function segaLogin(region: Region, segaId: string, segaPass: string): Promise<string> {
  const jar = new CookieJar();
  const fetchWithCookies = makeFetchCookie(fetch, jar);
  
  const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
  
  // 1. Hit the base URL to initiate the auth flow and grab redirect URL
  const base = MAIMAI_BASE[region];
  const initialRes = await fetchWithCookies(base, {
    headers: { 'User-Agent': userAgent },
    redirect: 'follow'
  });
  
  // 2. We should now be redirected to the login page or we just follow the standard form action
  const authUrl = 'https://lng-tgk-aime-gw.am-all.net/common_auth/login/sid';
  const formData = new URLSearchParams();
  formData.append('retention', '1');
  formData.append('sid', segaId);
  formData.append('password', segaPass);
  
  // Because SEGA expects us to return to the specific site_id, we can manually append the query parameters
  // usually found in the redirect URL, but the form POST itself might preserve the session on the auth server.
  // Actually, we must hit the specific redirect URL first to set the aime-gw session.
  const redirectUrl = encodeURIComponent(`${base}/`);
  const fullAuthUrl = `${authUrl}?site_id=maimaidxex&redirect_url=${redirectUrl}&back_url=https://maimai.sega.com/`;

  const loginRes = await fetchWithCookies(fullAuthUrl, {
    method: 'POST',
    body: formData,
    headers: {
      'User-Agent': userAgent,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    redirect: 'follow'
  });

  // 3. After following redirects, we should land back at MAIMAI_BASE and have cookies.
  const cookies = await jar.getCookies(base);
  
  // 4. Extract the correct session cookie
  const targetCookieName = region === 'intl' ? '_t' : 'clal';
  const sessionCookie = cookies.find(c => c.key === targetCookieName);
  
  if (!sessionCookie) {
    throw new Error('Failed to extract session cookie after Sega ID login. Invalid credentials?');
  }

  // Also extract userId for intl
  if (region === 'intl') {
    const userIdCookie = cookies.find(c => c.key === 'userId');
    if (userIdCookie) {
      return `${targetCookieName}=${sessionCookie.value}; userId=${userIdCookie.value}`;
    }
  }

  return sessionCookie.value;
}

// ─── Score parsing ───────────────────────────────────────────────────────────

const DIFFICULTY_MAP: Record<number, Difficulty> = {
  0: 'BAS',
  1: 'ADV',
  2: 'EXP',
  3: 'MAS',
  4: 'REMAS',
};

function parseAchievement(text: string): number {
  // e.g. "100.5000%", "99.3210%"
  return parseFloat(text.replace('%', '').trim()) || 0;
}

/**
 * Difficulty-specific CSS selectors matching the actual maimai NET HTML structure.
 * Each played song block is wrapped in a div with one of these classes.
 * This matches tomomai's parser exactly and is far more reliable than .w_450.
 */
const DIFF_SELECTORS: Record<number, string> = {
  0: '.music_basic_score_back',
  1: '.music_advanced_score_back',
  2: '.music_expert_score_back',
  3: '.music_master_score_back',
  4: '.music_remaster_score_back',
};

/** Parse FC status from a .h_30 img src (uses specific filename suffixes). */
function parseFCFromSrc(src: string): FC {
  if (src.includes('_app.png')) return 'AP+';
  if (src.includes('_ap.png'))  return 'AP';
  if (src.includes('_fcp.png')) return 'FC+';
  if (src.includes('_fc.png'))  return 'FC';
  return null;
}

function parseFSFromSrc(src: string): FS {
  if (src.includes('_fdxp.png')) return 'FDX+';
  if (src.includes('_fdx.png'))  return 'FDX';
  if (src.includes('_fsp.png'))  return 'FS+';
  if (src.includes('_fs.png'))   return 'FS';
  if (src.includes('_sync.png')) return 'SYNC';
  return null;
}

const FC_RANKS: Record<NonNullable<FC>, number> = { 'FC': 1, 'FC+': 2, 'AP': 3, 'AP+': 4 };
export function getBestFC(a: FC | string | null, b: FC | string | null): FC {
  const rankA = FC_RANKS[a as NonNullable<FC>] || 0;
  const rankB = FC_RANKS[b as NonNullable<FC>] || 0;
  return rankA > rankB ? (a as FC) : (b as FC);
}

const FS_RANKS: Record<NonNullable<FS>, number> = { 'SYNC': 1, 'FS': 2, 'FS+': 3, 'FDX': 4, 'FDX+': 5 };
export function getBestFS(a: FS | string | null, b: FS | string | null): FS {
  const rankA = FS_RANKS[a as NonNullable<FS>] || 0;
  const rankB = FS_RANKS[b as NonNullable<FS>] || 0;
  return rankA > rankB ? (a as FS) : (b as FS);
}

/** Detect chart type from the music_kind_icon img src. */
function musicTypeFromSrc(src: string | undefined): SongType {
  if (!src) return 'DX';
  if (src.includes('music_standard.png')) return 'STD';
  return 'DX'; // music_dx.png or anything else defaults to DX
}

interface ParsedScore {
  songTitle: string;
  difficulty: Difficulty;
  /** STD = standard/legacy chart, DX = maimai DX chart. */
  songType: SongType;
  achievement: number;
  dxScore?: number;
  fc: FC;
  fs: FS;
}

/**
 * Parse the score listing page for a single difficulty.
 *
 * Uses difficulty-specific selectors (.music_basic_score_back etc.) matching
 * the actual maimai NET HTML — the same approach as tomomai's parser.
 * The old .w_450 container selector was fragile and silently missed songs.
 *
 * Structure per song block:
 *   <div class="music_<diff>_score_back">
 *     <div class="music_name_block">Title</div>
 *     <div class="music_score_block">97.6977%</div>  ← achievement
 *     <div class="music_score_block">758 / 963</div> ← DX score
 *     <img class="h_30" src="..._sync.png">           ← FS
 *     <img class="h_30" src="..._fc.png">             ← FC
 *   </div>
 */
function parseScorePage(html: string, diffNum: number, difficulty: Difficulty): ParsedScore[] {
  const $ = cheerio.load(html);
  const selector = DIFF_SELECTORS[diffNum];
  if (!selector) return [];

  const results: ParsedScore[] = [];

  $(selector).each((_, el) => {
    const block = $(el);

    // Skip songs the player has never played (no achievement block present)
    const scoreBlocks = block.find('.music_score_block');
    if (scoreBlocks.length === 0) return;

    const songTitle = block.find('.music_name_block').text().trim();
    if (!songTitle) return;

    // Detect STD vs DX from the music_kind_icon on the parent element
    const iconSrc = block.parent().find('img.music_kind_icon').attr('src');
    const songType: SongType = musicTypeFromSrc(iconSrc);

    // First .music_score_block = achievement %
    const achvMatch = scoreBlocks.eq(0).text().trim().match(/(\d+\.?\d*)%/);
    if (!achvMatch) return;
    const achievement = parseFloat(achvMatch[1]);

    // Second .music_score_block = DX score "1,234 / 5,678"
    let dxScore: number | undefined;
    if (scoreBlocks.length >= 2) {
      const dxMatch = scoreBlocks.eq(1).text().trim().match(/([\d,]+)\s*\/\s*[\d,]+/);
      if (dxMatch) dxScore = parseInt(dxMatch[1].replace(/,/g, ''), 10);
    }

    // First .h_30 = FS (sync status), second .h_30 = FC
    const h30 = block.find('.h_30');
    const fs: FS = h30.length >= 1 ? parseFSFromSrc(h30.eq(0).attr('src') ?? '') : null;
    const fc: FC = h30.length >= 2 ? parseFCFromSrc(h30.eq(1).attr('src') ?? '') : null;

    results.push({ songTitle, difficulty, songType, achievement, dxScore, fc, fs });
  });

  return results;
}

/**
 * Fetch supplementary scores from the rating target page.
 * Some songs that count toward rating don't appear on the standard
 * musicGenre/search pages — this page catches them (intl only).
 */
async function fetchRatingTargetScores(
  region: Region,
  token: string,
  existingKeys: Set<string>,
): Promise<ParsedScore[]> {
  if (region !== 'intl') return [];
  try {
    const html = await maimaiGet(region, 'home/ratingTargetMusic/', token);
    const $ = cheerio.load(html);
    const results: ParsedScore[] = [];

    const diffInfo: { selector: string; diffNum: number; difficulty: Difficulty }[] = [
      { selector: '.music_basic_score_back',    diffNum: 0, difficulty: 'BAS'   },
      { selector: '.music_advanced_score_back', diffNum: 1, difficulty: 'ADV'   },
      { selector: '.music_expert_score_back',   diffNum: 2, difficulty: 'EXP'   },
      { selector: '.music_master_score_back',   diffNum: 3, difficulty: 'MAS'   },
      { selector: '.music_remaster_score_back', diffNum: 4, difficulty: 'REMAS' },
    ];

    for (const { selector, difficulty } of diffInfo) {
      $(selector).each((_, el) => {
        const block = $(el);
        const scoreBlocks = block.find('.music_score_block');
        if (scoreBlocks.length === 0) return;

        const songTitle = block.find('.music_name_block').text().trim();
        if (!songTitle) return;

        // Skip if already seen from genre pages
        if (existingKeys.has(`${songTitle}::${difficulty}::DX`)) return;

        const achvMatch = scoreBlocks.eq(0).text().match(/(\d+\.?\d*)%/);
        if (!achvMatch) return;
        const achievement = parseFloat(achvMatch[1]);

        let dxScore: number | undefined;
        if (scoreBlocks.length >= 2) {
          const dxMatch = scoreBlocks.eq(1).text().match(/([\d,]+)\s*\/\s*[\d,]+/);
          if (dxMatch) dxScore = parseInt(dxMatch[1].replace(/,/g, ''), 10);
        }

        const h30 = block.find('.h_30');
        const fs: FS = h30.length >= 1 ? parseFSFromSrc(h30.eq(0).attr('src') ?? '') : null;
        const fc: FC = h30.length >= 2 ? parseFCFromSrc(h30.eq(1).attr('src') ?? '') : null;

        // Rating target page always shows DX charts
        results.push({ songTitle, difficulty, songType: 'DX', achievement, dxScore, fc, fs });
      });
    }
    return results;
  } catch {
    return []; // Non-critical — don't fail the whole sync
  }
}

export interface ParsedRecentScore extends ParsedScore {
  track: number;
  playedAt: Date;
}

/**
 * Parse the recent score listing HTML from maimai NET's /record/ page.
 */
export function parseRecentPage(html: string): ParsedRecentScore[] {
  const results: ParsedRecentScore[] = [];
  const $ = cheerio.load(html);

  $('.p_10.t_l.f_0.v_b').each((_, el) => {
    const timeTrackStr = $(el).text();
    const timeMatch = timeTrackStr.match(/(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2})/);
    const trackMatch = timeTrackStr.match(/Track\s*(\d+)/i);
    if (!timeMatch || !trackMatch) return;

    const playedAt = new Date(timeMatch[1]);
    const track = parseInt(trackMatch[1], 10);

    const container = $(el).closest('div[class*="m_15"], div[class*="w_450"], div.p_10');
    if (!container.length) return;

    const songTitle = container.find('.music_name_block').text().trim();
    if (!songTitle) return;

    const achvText = container.find('.music_score_block').text() || container.text();
    const achvMatch = achvText.match(/([0-9]{1,3}\.[0-9]{4})%/);
    const achievement = achvMatch ? parseAchievement(achvMatch[1]) : 0;

    const dxMatch = container.text().match(/([0-9,]+)\s*\/\s*[0-9,]+/);
    const dxScore = dxMatch ? parseInt(dxMatch[1].replace(/,/g, '')) : undefined;

    let difficulty: Difficulty = 'MAS';
    const containerHtml = container.html() || '';
    if (containerHtml.includes('diff_basic')) difficulty = 'BAS';
    else if (containerHtml.includes('diff_advanced')) difficulty = 'ADV';
    else if (containerHtml.includes('diff_expert')) difficulty = 'EXP';
    else if (containerHtml.includes('diff_remaster')) difficulty = 'REMAS';
    else if (containerHtml.includes('diff_master')) difficulty = 'MAS';

    // Detect STD vs DX from music_kind_icon
    const iconSrc = container.find('img.music_kind_icon').attr('src');
    const songType: SongType = musicTypeFromSrc(iconSrc);

    // FC/FS from .h_30 imgs
    const h30 = container.find('.h_30');
    const fs: FS = h30.length >= 1 ? parseFSFromSrc(h30.eq(0).attr('src') ?? '') : null;
    const fc: FC = h30.length >= 2 ? parseFCFromSrc(h30.eq(1).attr('src') ?? '') : null;

    results.push({ songTitle, difficulty, songType, achievement, dxScore, fc, fs, track, playedAt });
  });

  return results;
}

// ─── Sync orchestration ──────────────────────────────────────────────────────

export interface SyncResult {
  inserted: number;
  updated: number;
  errors: string[];
}

/**
 * Main sync function: scrapes all difficulties from maimai NET and
 * upserts best scores into the database.
 */
export async function syncFromMaimaiNet(onProgress?: (msg: string) => void): Promise<SyncResult> {
  let clal = await getSetting('maimai_clal');
  const regionStr = await getSetting('maimai_region');
  const region: Region = (regionStr as Region) || 'intl';
  const segaId = await getSetting('maimai_sega_id');
  const segaPassword = await getSetting('maimai_sega_password');

  if (!clal && (!segaId || !segaPassword)) {
    throw new Error('No maimai NET session cookie or Sega ID credentials set. Please configure them in Settings.');
  }

  // Pre-flight check: see if session is valid. If not, auto-login.
  let sessionValid = false;
  if (clal) {
    try {
      const html = await maimaiGet(region, 'record/musicGenre/search/?genre=99&diff=0', clal);
      const valid = !html.includes('Aime') && !html.includes('SEGA ID') && html.includes('music_name_block');
      sessionValid = valid;
    } catch {}
  }

  if (!sessionValid) {
    if (!segaId || !segaPassword) {
      throw new Error('Session cookie is expired and no SEGA ID credentials found. Please manually update your session cookie.');
    }
    if (onProgress) onProgress('Session expired. Attempting automated SEGA ID login...');
    try {
      const newCookie = await segaLogin(region, segaId, segaPassword);
      clal = newCookie;
      await saveSetting('maimai_clal', newCookie);
      if (onProgress) onProgress('Login successful! New session cookie saved.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Automated login failed: ${msg}`);
    }
  }

  const result: SyncResult = { inserted: 0, updated: 0, errors: [] };
  const allParsed: ParsedScore[] = [];
  const now = new Date();

  // Determine if we can do a Fast Sync (incremental)
  const lastSyncStr = await getSetting('last_sync');
  const lastSync = lastSyncStr ? new Date(lastSyncStr) : null;
  let doFullSync = true;

  // --- Fetch Recent Plays ---
  // We fetch this first to check if we can skip the slow full sync,
  // and we always need it to populate the playLog anyway.
  let recentScores: ParsedRecentScore[] = [];
  try {
    if (onProgress) onProgress(`Scraping recent plays (/record/)...`);
    const recentHtml = await maimaiGet(region, 'record/', clal!);
    recentScores = parseRecentPage(recentHtml);
    
    // Sort ascending so oldest goes in first
    recentScores.sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());
    
    if (onProgress) onProgress(`Saving up to ${recentScores.length} recent plays to play log...`);
    for (const rs of recentScores) {
      const existing = await db
        .select()
        .from(playLog)
        .where(eq(playLog.playedAt, rs.playedAt))
        .limit(1);
        
      if (existing.length === 0) {
        await db.insert(playLog).values({
          songTitle: rs.songTitle,
          difficulty: rs.difficulty,
          songType: rs.songType ?? 'DX',
          achievement: String(rs.achievement),
          dxScore: rs.dxScore,
          fc: rs.fc,
          fs: rs.fs,
          track: rs.track,
          playedAt: rs.playedAt,
        });
      }
    }

    if (lastSync && recentScores.length > 0) {
      // Check if all 50 recent plays are strictly newer than last_sync
      // If the oldest recent play is newer than last_sync, we might have missed some plays
      // between last_sync and the oldest recent play. In that case, we MUST do a full sync.
      const oldestRecentPlay = recentScores[0].playedAt;
      if (oldestRecentPlay <= lastSync) {
        if (onProgress) onProgress('Fast Sync eligible! Only updating new scores since last sync...');
        doFullSync = false;
        // Only process scores newer than lastSync
        const newPlays = recentScores.filter(s => s.playedAt > lastSync);
        if (onProgress) onProgress(`Found ${newPlays.length} new plays since last sync.`);
        allParsed.push(...newPlays);
      } else {
        if (onProgress) onProgress('You played more than 50 times since last sync. Falling back to Full Sync...');
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Recent Plays Error: ${msg}`);
  }

  if (doFullSync) {
    // 1. Scrape standard song list
    for (let diff = 0; diff <= 4; diff++) {
    const difficulty = DIFFICULTY_MAP[diff];
    try {
      if (onProgress) onProgress(`Scraping ${difficulty} scores...`);
      const html = await maimaiGet(
        region,
        `record/musicGenre/search/?genre=99&diff=${diff}`,
        clal!,
      );
      const parsed = parseScorePage(html, diff, difficulty);
      allParsed.push(...parsed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`${difficulty}: ${msg}`);
    }
  }

    // Build a set of already-seen (title::difficulty::songType) pairs
    const seenKeys = new Set(allParsed.map(s => `${s.songTitle}::${s.difficulty}::${s.songType}`));
    if (onProgress) onProgress('Checking rating target page for any hidden scores...');
    const hidden = await fetchRatingTargetScores(region, clal!, seenKeys);
    if (hidden.length > 0) {
      if (onProgress) onProgress(`Found ${hidden.length} additional scores.`);
      allParsed.push(...hidden);
    }
  }

  if (onProgress && allParsed.length > 0) onProgress(`Saving ${allParsed.length} scores to database...`);
  
  // Upsert into database
  for (const score of allParsed) {
    try {
      // Check if a record exists for this song+difficulty+songType
      const existing = await db
        .select()
        .from(scores)
        .where(eq(scores.songTitle, score.songTitle))
        .limit(50);

      const existingForDiff = existing.find(
        e => e.difficulty === score.difficulty && e.songType === score.songType,
      );

      if (existingForDiff) {
        // Only update if the new achievement is better
        if (score.achievement > parseFloat(existingForDiff.achievement as string)) {
          await db
            .update(scores)
            .set({
              achievement: String(score.achievement),
              dxScore: score.dxScore ?? existingForDiff.dxScore,
              fc: getBestFC(existingForDiff.fc, score.fc),
              fs: getBestFS(existingForDiff.fs, score.fs),
              playedAt: now,
            })
            .where(eq(scores.id, existingForDiff.id));
          result.updated++;
        } else if (getBestFC(existingForDiff.fc, score.fc) !== existingForDiff.fc || getBestFS(existingForDiff.fs, score.fs) !== existingForDiff.fs) {
          // Even if achievement isn't strictly better, we might have earned a new badge
          await db
            .update(scores)
            .set({
              fc: getBestFC(existingForDiff.fc, score.fc),
              fs: getBestFS(existingForDiff.fs, score.fs),
            })
            .where(eq(scores.id, existingForDiff.id));
          result.updated++;
        }
      } else {
        await db.insert(scores).values({
          songTitle: score.songTitle,
          difficulty: score.difficulty,
          songType: score.songType,
          achievement: String(score.achievement),
          dxScore: score.dxScore,
          fc: score.fc,
          fs: score.fs,
          playedAt: now,
        });
        result.inserted++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`DB Error (${score.songTitle}): ${msg}`);
    }
  }

  // Update last sync timestamp
  await saveSetting('last_sync', now.toISOString());

  return result;
}

/**
 * Validate that the stored session cookie is still valid by making a test request.
 */
export async function validateSession(): Promise<{ valid: boolean; debug?: string }> {
  const clal = await getSetting('maimai_clal');
  const regionStr = await getSetting('maimai_region');
  const region: Region = (regionStr as Region) || 'intl';

  if (!clal) return { valid: false, debug: 'No cookie provided' };

  try {
    const html = await maimaiGet(region, 'home/', clal);
    // Valid session has player name, music name, or the Home title in the HTML
    const valid = 
      html.includes('playerName') || 
      html.includes('music_name') || 
      html.includes('maimai DX NET－Home－') ||
      html.includes('maimai DX NET-Home-');
      
    if (!valid) {
      const titleMatch = html.match(/<title>([^<]*)/i);
      const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';
      return { valid: false, debug: `Page loaded: "${title}"\n\nPreview: ${html.substring(0, 100)}...` };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, debug: err instanceof Error ? err.message : String(err) };
  }
}

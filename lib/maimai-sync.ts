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
import type { Difficulty, FC, FS, Region } from './types';
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

function parseFC(text: string): FC {
  const t = text.trim().toUpperCase();
  if (t.includes('AP+') || t.includes('APPLUS')) return 'AP+';
  if (t.includes('AP')) return 'AP';
  if (t.includes('FC+') || t.includes('FCPLUS')) return 'FC+';
  if (t.includes('FC')) return 'FC';
  return null;
}

function parseFS(text: string): FS {
  const t = text.trim().toUpperCase();
  if (t.includes('FDX+') || t.includes('FDXPLUS')) return 'FDX+';
  if (t.includes('FDX')) return 'FDX';
  if (t.includes('FS+') || t.includes('FSPLUS')) return 'FS+';
  if (t.includes('FS')) return 'FS';
  if (t.includes('SYNC')) return 'SYNC';
  return null;
}

interface ParsedScore {
  songTitle: string;
  difficulty: Difficulty;
  achievement: number;
  dxScore?: number;
  fc: FC;
  fs: FS;
}

/**
 * Parse the score listing HTML from maimai NET's score page.
 * Handles both the "best score" list and recent play formats.
 */
function parseScorePage(html: string, difficulty: Difficulty): ParsedScore[] {
  const results: ParsedScore[] = [];
  const $ = cheerio.load(html);

  $('.music_name_block').each((_, el) => {
    const songTitle = $(el).text().trim();
    if (!songTitle) return;

    // The container is usually .w_450 (or a parent div housing this song's entry)
    const container = $(el).closest('.w_450');
    if (!container.length) return;

    const achvText = container.find('.music_score_block').text() || container.text();
    const achvMatch = achvText.match(/([0-9]{1,3}\.[0-9]{4})%/);
    if (!achvMatch) return;
    const achievement = parseAchievement(achvMatch[1]);

    const containerText = container.text();
    const dxMatch = containerText.match(/([0-9,]+)\s*\/\s*[0-9,]+/);
    const dxScore = dxMatch ? parseInt(dxMatch[1].replace(/,/g, '')) : undefined;

    let fc: FC = null;
    let fs: FS = null;
    container.find('img').each((_, img) => {
      const src = $(img).attr('src') || '';
      const badgeMatch = src.match(/\/(fc|ap|fs|fsp|fdx|fdxp|sync)[^"]*\.(png|gif)/i);
      if (badgeMatch) {
        const badge = badgeMatch[1].toLowerCase();
        if (badge.startsWith('ap')) fc = badge === 'ap' ? 'AP' : 'AP+';
        else if (badge.startsWith('fc')) fc = badge === 'fc' ? 'FC' : 'FC+';
        else if (badge.startsWith('fdx')) fs = badge === 'fdx' ? 'FDX' : 'FDX+';
        else if (badge.startsWith('fs')) fs = badge === 'fsp' ? 'FS+' : 'FS';
        else if (badge === 'sync') fs = 'SYNC';
      }
    });

    results.push({ songTitle, difficulty, achievement, dxScore, fc, fs });
  });

  return results;
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

  // Each play log is typically inside a block that contains both the timestamp and the song details
  $('.p_10.t_l.f_0.v_b').each((_, el) => {
    const timeTrackStr = $(el).text(); // e.g., "2024/05/12 14:30　Track 1"
    const timeMatch = timeTrackStr.match(/(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2})/);
    const trackMatch = timeTrackStr.match(/Track\s*(\d+)/i);
    if (!timeMatch || !trackMatch) return;

    const playedAt = new Date(timeMatch[1]);
    const track = parseInt(trackMatch[1], 10);

    // The container for the actual song data is usually the next sibling or parent
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

    let fc: FC = null;
    let fs: FS = null;
    container.find('img').each((_, img) => {
      const src = $(img).attr('src') || '';
      const badgeMatch = src.match(/\/(fc|ap|fs|fsp|fdx|fdxp|sync)[^"]*\.(png|gif)/i);
      if (badgeMatch) {
        const badge = badgeMatch[1].toLowerCase();
        if (badge.startsWith('ap')) fc = badge === 'ap' ? 'AP' : 'AP+';
        else if (badge.startsWith('fc')) fc = badge === 'fc' ? 'FC' : 'FC+';
        else if (badge.startsWith('fdx')) fs = badge === 'fdx' ? 'FDX' : 'FDX+';
        else if (badge.startsWith('fs')) fs = badge === 'fsp' ? 'FS+' : 'FS';
        else if (badge === 'sync') fs = 'SYNC';
      }
    });

    results.push({ songTitle, difficulty, achievement, dxScore, fc, fs, track, playedAt });
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

  // Scrape each difficulty tab (0=BAS to 4=REMAS)
  for (let diff = 0; diff <= 4; diff++) {
    const difficulty = DIFFICULTY_MAP[diff];
    try {
      if (onProgress) onProgress(`Scraping ${difficulty} scores...`);
      const html = await maimaiGet(
        region,
        `record/musicGenre/search/?genre=99&diff=${diff}`,
        clal!,
      );
      const parsed = parseScorePage(html, difficulty);
      allParsed.push(...parsed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`${difficulty}: ${msg}`);
    }
  }

  if (onProgress) onProgress(`Saving ${allParsed.length} scores to database...`);
  
  // Upsert into database
  const now = new Date();
  for (const score of allParsed) {
    try {
      // Check if a record exists for this song+difficulty
      const existing = await db
        .select()
        .from(scores)
        .where(eq(scores.songTitle, score.songTitle))
        .limit(50);

      const existingForDiff = existing.find(
        e => e.difficulty === score.difficulty,
      );

      if (existingForDiff) {
        // Only update if the new achievement is better
        if (score.achievement > parseFloat(existingForDiff.achievement as string)) {
          await db
            .update(scores)
            .set({
              achievement: String(score.achievement),
              dxScore: score.dxScore,
              fc: score.fc,
              fs: score.fs,
              playedAt: now,
            })
            .where(eq(scores.id, existingForDiff.id));
          result.updated++;
        }
      } else {
        await db.insert(scores).values({
          songTitle: score.songTitle,
          difficulty: score.difficulty,
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

  // --- Fetch Recent Plays ---
  try {
    if (onProgress) onProgress(`Scraping recent plays (/record/)...`);
    const recentHtml = await maimaiGet(region, 'record/', clal!);
    const recentScores = parseRecentPage(recentHtml);
    
    if (onProgress) onProgress(`Saving up to ${recentScores.length} recent plays...`);
    
    // Sort ascending so oldest goes in first (though exact timestamp deduplicates it)
    recentScores.sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());
    
    for (const rs of recentScores) {
      // Avoid inserting duplicate records
      const existing = await db
        .select()
        .from(playLog)
        .where(eq(playLog.playedAt, rs.playedAt))
        .limit(1);
        
      if (existing.length === 0) {
        await db.insert(playLog).values({
          songTitle: rs.songTitle,
          difficulty: rs.difficulty,
          achievement: String(rs.achievement),
          dxScore: rs.dxScore,
          fc: rs.fc,
          fs: rs.fs,
          track: rs.track,
          playedAt: rs.playedAt,
        });
        result.inserted++;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Recent Plays Error: ${msg}`);
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

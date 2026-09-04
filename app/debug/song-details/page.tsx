import { fetchSongs, buildSongMap } from '@/lib/song-db';
import { db } from '@/lib/db';
import { scoreTrackers, trackerLists, trackerItems, sessionItems } from '@/lib/db/schema';
import { getSongInternalLevel } from '@/lib/rating';
import { normalizeTitle } from '@/lib/normalize';
import type { Difficulty } from '@/lib/types';
import SongDetailsDebugClient from './debug-client';

export const metadata = { title: '🧪 Song Details Debug' };
export const dynamic = 'force-dynamic';

export default async function SongDetailsDebugPage() {
  const songs = await fetchSongs();
  const songMap = buildSongMap(songs);

  // Pull real tracker/session/list data if the DB is available
  let trackers: { songTitle: string; songType: string; difficulty: string }[] = [];
  let sessionData: { songTitle: string; sheetType: string; sheetDifficulty: string }[] = [];
  let listItems: { songTitle: string; sheetType: string; sheetDifficulty: string; listName: string }[] = [];

  try {
    const [dbTrackers, dbSession, dbLists, dbItems] = await Promise.all([
      db.select().from(scoreTrackers),
      db.select().from(sessionItems),
      db.select().from(trackerLists),
      db.select().from(trackerItems),
    ]);
    trackers = dbTrackers.map(t => ({
      songTitle: t.songTitle,
      songType: t.songType ?? 'DX',
      difficulty: t.difficulty,
    }));
    sessionData = dbSession.map(s => ({
      songTitle: s.songTitle,
      sheetType: s.sheetType,
      sheetDifficulty: s.sheetDifficulty,
    }));
    const listMap = new Map(dbLists.map(l => [l.id, l.name ?? 'Unnamed List']));
    listItems = dbItems.map(i => ({
      songTitle: i.songTitle,
      sheetType: i.sheetType,
      sheetDifficulty: i.sheetDifficulty,
      listName: listMap.get(i.listId) ?? 'Unnamed List',
    }));
  } catch {
    // DB not connected — fall through to sample data below
  }

  // ── Fallback: sample 6 songs from the song pool ───────────────────────────
  const intlSongs = songs.filter(s => s.intl);
  function pickSample(n: number) {
    const step = Math.max(1, Math.floor(intlSongs.length / n));
    return Array.from({ length: n }, (_, i) => intlSongs[i * step]).filter(Boolean);
  }

  if (trackers.length === 0) {
    const sample = pickSample(4);
    trackers = sample.map(s => ({
      songTitle: s.title,
      songType: s.dx_lev_mas_i ? 'DX' : 'STD',
      difficulty: 'MAS',
    }));
  }
  if (sessionData.length === 0) {
    const sample = pickSample(3);
    sessionData = sample.map(s => ({
      songTitle: s.title,
      sheetType: s.dx_lev_mas_i ? 'DX' : 'STD',
      sheetDifficulty: 'MAS',
    }));
  }
  if (listItems.length === 0) {
    const sample = pickSample(3);
    listItems = sample.map((s, i) => ({
      songTitle: s.title,
      sheetType: s.dx_lev_exp_i ? 'DX' : 'STD',
      sheetDifficulty: i % 2 === 0 ? 'EXP' : 'MAS',
      listName: 'Practice List',
    }));
  }

  // Attach internal levels
  function getLevel(songTitle: string, diff: string, type: string) {
    const info = songMap.get(normalizeTitle(songTitle));
    return info ? getSongInternalLevel(info, diff as Difficulty, type as 'DX' | 'STD') : 0;
  }

  const trackerRows = trackers.slice(0, 6).map(t => ({
    ...t,
    internalLevel: getLevel(t.songTitle, t.difficulty, t.songType),
    songInfo: songMap.get(t.songTitle.toLowerCase().replace(/\s+/g, ' ').trim()) ?? null,
  }));
  const sessionRows = sessionData.slice(0, 4).map(s => ({
    ...s,
    internalLevel: getLevel(s.songTitle, s.sheetDifficulty, s.sheetType),
    songInfo: songMap.get(s.songTitle.toLowerCase().replace(/\s+/g, ' ').trim()) ?? null,
  }));
  const listRows = listItems.slice(0, 6).map(i => ({
    ...i,
    internalLevel: getLevel(i.songTitle, i.sheetDifficulty, i.sheetType),
    songInfo: songMap.get(i.songTitle.toLowerCase().replace(/\s+/g, ' ').trim()) ?? null,
  }));

  return (
    <SongDetailsDebugClient
      songMapRecord={Object.fromEntries(songMap)}
      trackerRows={trackerRows}
      sessionRows={sessionRows}
      listRows={listRows}
    />
  );
}

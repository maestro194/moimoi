import SongDetailsDebugClient from './debug-client';
import { db } from '@/lib/db';
import { playLog } from '@/lib/db/schema';
import { desc, isNotNull } from 'drizzle-orm';
import { fetchSongs, buildSongMap } from '@/lib/song-db';
import { normalizeTitle } from '@/lib/normalize';
import { getSongInternalLevel } from '@/lib/rating';
import type { Difficulty } from '@/lib/types';

export const metadata = { title: '🧪 Debug Tools & Achievement Calculation' };
export const dynamic = 'force-dynamic';

export default async function SongDetailsDebugPage() {
  const [rows, songsData] = await Promise.all([
    db
      .select()
      .from(playLog)
      .where(isNotNull(playLog.details))
      .orderBy(desc(playLog.playedAt))
      .limit(10),
    fetchSongs(),
  ]);

  const songMap = buildSongMap(songsData);

  const initialRecentPlays = rows.map(r => {
    const song = songMap.get(normalizeTitle(r.songTitle)) ?? null;
    let internalLevel = 0;
    if (song) {
      internalLevel = getSongInternalLevel(
        song,
        r.difficulty as Difficulty,
        (r.songType ?? 'DX') as 'STD' | 'DX'
      );
    }

    return {
      id: r.id,
      songTitle: r.songTitle,
      difficulty: r.difficulty,
      songType: r.songType ?? 'DX',
      achievement: r.achievement,
      dxScore: r.dxScore,
      fc: r.fc,
      fs: r.fs,
      track: r.track,
      playedAt: r.playedAt ? r.playedAt.toISOString() : new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      details: r.details as any,
      song: song ? {
        title: song.title,
        artist: song.artist,
        image_url: song.image_url,
        intl: song.intl,
      } : null,
      internalLevel,
    };
  });

  return <SongDetailsDebugClient initialRecentPlays={initialRecentPlays} />;
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { playLog } from '@/lib/db/schema';
import { desc, isNotNull } from 'drizzle-orm';
import { fetchSongs, buildSongMap } from '@/lib/song-db';
import { normalizeTitle } from '@/lib/normalize';
import { getSongInternalLevel } from '@/lib/rating';
import type { Difficulty } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));

    const [rows, songsData] = await Promise.all([
      db
        .select()
        .from(playLog)
        .where(isNotNull(playLog.details))
        .orderBy(desc(playLog.playedAt))
        .limit(limit),
      fetchSongs(),
    ]);

    const songMap = buildSongMap(songsData);

    const recentScores = rows.map(r => {
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
        details: r.details,
        song: song ? {
          title: song.title,
          artist: song.artist,
          image_url: song.image_url,
          intl: song.intl,
        } : null,
        internalLevel,
      };
    });

    return NextResponse.json({ recentScores });
  } catch (error) {
    console.error('Error fetching recent plays:', error);
    return NextResponse.json({ error: 'Failed to fetch recent plays' }, { status: 500 });
  }
}

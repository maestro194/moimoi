import { db } from '@/lib/db';
import { playLog } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import RecentClient from './recent-client';
import { fetchSongs, buildSongMap } from '@/lib/song-db';
import type { Song } from '@/lib/types';
import { calcSingleRating } from '@/lib/rating';

export const dynamic = 'force-dynamic';

export default async function RecentPage() {
  const allLogs = await db
    .select()
    .from(playLog)
    .orderBy(desc(playLog.playedAt));

  // Load songs to compute rating and get images
  const songsData = await fetchSongs();
  const songDb = buildSongMap(songsData);

  // Hydrate with ratings and song metadata
  const hydratedLogs = allLogs.map(log => {
    const song = songDb.get(log.songTitle) ?? null;
    let internalLevel = 0;
    let rating = 0;
    
    if (song) {
      const idx = ['BAS', 'ADV', 'EXP', 'MAS', 'REMAS'].indexOf(log.difficulty);
      const iv = song[`lev_${log.difficulty.toLowerCase()}_i` as keyof Song] as string;
      if (iv) internalLevel = parseFloat(iv);
      rating = calcSingleRating(internalLevel, parseFloat(log.achievement as string), log.fc);
    }
    
    return {
      ...log,
      song,
      internalLevel,
      rating
    };
  });

  return (
    <main className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Recent Plays</h1>
        <p className="text-white/60 text-sm">Chronological history of your synced plays, grouped by credit.</p>
      </div>

      <RecentClient logs={hydratedLogs} />
    </main>
  );
}

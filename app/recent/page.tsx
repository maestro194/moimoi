import { db } from '@/lib/db';
import { playLog, settings } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import RecentClient from './recent-client';
import { fetchSongs, buildSongMap } from '@/lib/song-db';
import { normalizeTitle } from '@/lib/normalize';
import type { Song, PlayerProfile } from '@/lib/types';
import { calcSingleRating } from '@/lib/rating';

export const dynamic = 'force-dynamic';

export default async function RecentPage() {
  const [allLogs, lastSyncRow, profileRow] = await Promise.all([
    db.select().from(playLog).orderBy(desc(playLog.playedAt)),
    db.select().from(settings).where(eq(settings.key, 'last_sync')),
    db.select().from(settings).where(eq(settings.key, 'profile'))
  ]);

  const lastSync = lastSyncRow[0]?.value || null;
  const profile = profileRow[0]?.value ? JSON.parse(profileRow[0].value) as PlayerProfile : { name: 'Player', rating: 0, region: 'intl' as const };

  // Load songs to compute rating and get images
  const songsData = await fetchSongs();
  const songDb = buildSongMap(songsData);

  // Hydrate with ratings and song metadata
  const hydratedLogs = allLogs.map(log => {
    const song = songDb.get(normalizeTitle(log.songTitle)) ?? null;
    let internalLevel = 0;
    let rating = 0;
    
    if (song) {
      const idx = ['BAS', 'ADV', 'EXP', 'MAS', 'REMAS'].indexOf(log.difficulty);
      const iv = song[`lev_${log.difficulty.toLowerCase()}_i` as keyof Song] as string;
      if (iv) internalLevel = parseFloat(iv);
      rating = calcSingleRating(internalLevel, parseFloat(log.achievement as string), log.fc as any).floored;
    }
    
    return {
      ...log,
      song,
      internalLevel,
      rating
    };
  });

  return (
    <main className="min-h-dvh">
      <RecentClient logs={hydratedLogs} lastSync={lastSync} profile={profile} />
    </main>
  );
}

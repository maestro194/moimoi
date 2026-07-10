import { db } from '@/lib/db';
import { playLog } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import RecentClient from './recent-client';
import { fetchSongs, buildSongMap } from '@/lib/song-db';
import { normalizeTitle } from '@/lib/normalize';
import type { PlayerProfile, Difficulty } from '@/lib/types';
import { calcSingleRating, getSongInternalLevel } from '@/lib/rating';
import { getSetting } from '@/lib/maimai-sync';

export const dynamic = 'force-dynamic';

export default async function RecentPage() {
  const allLogs = await db.select().from(playLog).orderBy(desc(playLog.playedAt));

  const lastSync = await getSetting('last_sync');
  const regionStr = await getSetting('maimai_region');
  const profile: PlayerProfile = {
    name: await getSetting('profile_name') || 'Player',
    rating: parseInt(await getSetting('profile_rating') || '0', 10),
    region: (regionStr as PlayerProfile['region']) || 'intl',
  };

  // Load songs to compute rating and get images
  const songsData = await fetchSongs();
  const songDb = buildSongMap(songsData);

  // Hydrate with ratings and song metadata
  const hydratedLogs = allLogs.map(log => {
    const song = songDb.get(normalizeTitle(log.songTitle)) ?? null;
    let internalLevel = 0;
    let rating = 0;
    
    if (song) {
      internalLevel = getSongInternalLevel(song, log.difficulty as Difficulty, (log.songType ?? 'DX') as 'STD' | 'DX');
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

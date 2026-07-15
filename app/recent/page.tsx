import { db } from '@/lib/db';
import { playLog, settings } from '@/lib/db/schema';
import { desc, inArray } from 'drizzle-orm';
import RecentClient from './recent-client';
import { fetchSongs, buildSongMap } from '@/lib/song-db';
import { normalizeTitle } from '@/lib/normalize';
import type { PlayerProfile, Difficulty } from '@/lib/types';
import { calcSingleRating, getSongInternalLevel } from '@/lib/rating';

export const dynamic = 'force-dynamic';

export default async function RecentPage() {
  const SETTING_KEYS = ['last_sync', 'maimai_region', 'profile_name', 'profile_rating'];

  // Fire all independent DB queries in parallel
  const [allLogs, songsData, settingRows] = await Promise.all([
    db.select().from(playLog).orderBy(desc(playLog.playedAt)),
    fetchSongs(),
    db.select().from(settings).where(inArray(settings.key, SETTING_KEYS)),
  ]);

  const getSet = (k: string) => settingRows.find(r => r.key === k)?.value ?? null;
  const regionStr = getSet('maimai_region');
  const profile: PlayerProfile = {
    name: getSet('profile_name') || 'Player',
    rating: parseInt(getSet('profile_rating') || '0', 10),
    region: (regionStr as PlayerProfile['region']) || 'intl',
  };

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

    return { ...log, song, internalLevel, rating };
  });

  return (
    <main className="min-h-dvh">
      <RecentClient logs={hydratedLogs} lastSync={getSet('last_sync')} profile={profile} />
    </main>
  );
}

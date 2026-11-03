import { db } from '@/lib/db';
import { playLog, settings } from '@/lib/db/schema';
import { desc, inArray } from 'drizzle-orm';
import RecentClient from './recent-client';
import { fetchSongs } from '@/lib/song-db';
import { SongIndex, calcSingleRating, lookupChart, solvePlayDetails } from '@maimai-suite/core';
import type { PlayerProfile } from '@maimai-suite/core';

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

  const songIndex = new SongIndex(songsData);

  // Hydrate with ratings and song metadata
  const hydratedLogs = allLogs.map(log => {
    const chart = lookupChart(songIndex, log);
    const song = chart?.song ?? null;
    const internalLevel = chart?.constant ?? 0;
    const rating = internalLevel ? calcSingleRating(internalLevel, parseFloat(log.achievement as string), log.fc as any).floored : 0;

    let details = log.details as any;
    if (details && details.break && !details.break.solved) {
      details = solvePlayDetails(details, log.achievement as string);
    }

    return {
      ...log,
      isManual: log.isManual ?? (details as any)?.isManual ?? false,
      details,
      song,
      internalLevel,
      rating,
    };
  });

  return (
    <main className="min-h-dvh">
      <RecentClient logs={hydratedLogs} lastSync={getSet('last_sync')} profile={profile} />
    </main>
  );
}

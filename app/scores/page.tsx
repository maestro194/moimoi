import { db } from '@/lib/db';
import { scores, settings } from '@/lib/db/schema';
import { fetchSongs, buildSongMap, detectCurrentVersion } from '@/lib/song-db';
import { computeRating } from '@/lib/rating';
import type { Score, Difficulty, PlayerProfile } from '@/lib/types';
import ScoresClient from './scores-client';
import { getSetting } from '@/lib/maimai-sync';

export const metadata = { title: 'Scores' };
export const dynamic = 'force-dynamic';

export default async function ScoresPage() {
  try {
    const songs = await fetchSongs();
    const songMap = buildSongMap(songs);
    const versionStr = await getSetting('maimai_version');
    const currentVersion = versionStr ? parseInt(versionStr, 10) : detectCurrentVersion(songs);

    const dbScores = await db.select().from(scores);
    const typedScores: Score[] = dbScores.map(s => ({
      id: s.id,
      songTitle: s.songTitle,
      difficulty: s.difficulty as Difficulty,
      songType: (s.songType ?? 'DX') as Score['songType'],
      achievement: parseFloat(s.achievement as string),
      dxScore: s.dxScore,
      fc: s.fc as Score['fc'],
      fs: s.fs as Score['fs'],
      playedAt: s.playedAt,
    }));

    const ratingData = computeRating(typedScores, songMap, currentVersion);

    const lastSync = await getSetting('last_sync');
    const regionStr = await getSetting('maimai_region');
    const profile: PlayerProfile = {
      name: await getSetting('profile_name') || 'Player',
      rating: parseInt(await getSetting('profile_rating') || '0', 10),
      region: (regionStr as PlayerProfile['region']) || 'intl',
    };

    return (
      <ScoresClient
        scored={ratingData.allScores}
        total={typedScores.length}
        totalRating={ratingData.totalRating}
        newRating={ratingData.newRating}
        oldRating={ratingData.oldRating}
        profile={profile}
        lastSync={lastSync}
      />
    );
  } catch {
    return (
      <div className="p-8 text-center" style={{ color: 'var(--foreground-muted)' }}>
        Database not connected. Set DATABASE_URL in .env.local.
      </div>
    );
  }
}

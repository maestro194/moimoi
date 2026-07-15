import { db } from '@/lib/db';
import { scores, settings } from '@/lib/db/schema';
import { fetchSongs, buildSongMap, detectCurrentVersion } from '@/lib/song-db';
import { computeRating } from '@/lib/rating';
import type { Score, Difficulty, PlayerProfile } from '@/lib/types';
import ScoresClient from './scores-client';
import { inArray } from 'drizzle-orm';

export const metadata = { title: 'Scores' };
export const dynamic = 'force-dynamic';

export default async function ScoresPage() {
  try {
    // Fire all independent DB queries in parallel
    const SETTING_KEYS = ['maimai_version', 'last_sync', 'maimai_region', 'profile_name', 'profile_rating'];
    const [songs, dbScores, settingRows] = await Promise.all([
      fetchSongs(),
      db.select().from(scores),
      db.select().from(settings).where(inArray(settings.key, SETTING_KEYS)),
    ]);

    const getSet = (k: string) => settingRows.find(r => r.key === k)?.value ?? null;

    const songMap = buildSongMap(songs);
    const versionStr = getSet('maimai_version');
    const currentVersion = versionStr ? parseInt(versionStr, 10) : detectCurrentVersion(songs);

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

    const regionStr = getSet('maimai_region');
    const profile: PlayerProfile = {
      name: getSet('profile_name') || 'Player',
      rating: parseInt(getSet('profile_rating') || '0', 10),
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
        lastSync={getSet('last_sync')}
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

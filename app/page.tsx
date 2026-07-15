import { db } from '@/lib/db';
import { scores, settings } from '@/lib/db/schema';
import { fetchSongs, buildSongMap, detectCurrentVersion } from '@/lib/song-db';
import { computeRating } from '@/lib/rating';
import type { Score, Difficulty } from '@/lib/types';
import { desc } from 'drizzle-orm';
import { Suspense } from 'react';
import nextDynamic from 'next/dynamic';

const DashboardClient = nextDynamic(() => import('./dashboard-client'));

async function getDashboardData() {
  try {
    // Fire all independent DB queries in parallel
    const [songs, dbScores, settingRows] = await Promise.all([
      fetchSongs(),
      db.select().from(scores).orderBy(desc(scores.playedAt)),
      db.select().from(settings),
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

    const profile = {
      name: getSet('profile_name'),
      avatar: getSet('profile_avatar'),
      courseRank: getSet('profile_course_rank'),
      classRank: getSet('profile_class_rank'),
      ratingBase: getSet('profile_rating_base'),
      rating: getSet('profile_rating'),
      title: getSet('profile_title'),
      stars: getSet('profile_stars'),
      versionPlays: getSet('profile_version_plays'),
      totalPlays: getSet('profile_total_plays'),
    };

    return { ratingData, lastSync: getSet('last_sync'), totalSongs: songs.length, currentVersion, profile };
  } catch {
    return null;
  }
}

export const metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const data = await getDashboardData();
  return (
    <Suspense fallback={<div className="p-8 text-center" style={{ color: 'var(--foreground-muted)' }}>Loading…</div>}>
      <DashboardClient data={data} />
    </Suspense>
  );
}

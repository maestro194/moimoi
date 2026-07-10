import { db } from '@/lib/db';
import { scores, playLog, settings } from '@/lib/db/schema';
import { fetchSongs, buildSongMap, detectCurrentVersion } from '@/lib/song-db';
import { computeRating } from '@/lib/rating';
import type { Score, Difficulty } from '@/lib/types';
import { desc, sql } from 'drizzle-orm';
import { Suspense } from 'react';
import DashboardClient from './dashboard-client';
import { getSetting } from '@/lib/maimai-sync';

async function getDashboardData() {
  try {
    const songs = await fetchSongs();
    const songMap = buildSongMap(songs);
    const versionStr = await getSetting('maimai_version');
    const currentVersion = versionStr ? parseInt(versionStr, 10) : detectCurrentVersion(songs);

    const dbScores = await db.select().from(scores).orderBy(desc(scores.playedAt));
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

    const settingsRows = await db.select().from(settings);
    const getSet = (k: string) => settingsRows.find(r => r.key === k)?.value ?? null;
    
    const lastSync = getSet('last_sync');
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
    
    return { ratingData, lastSync, totalSongs: songs.length, currentVersion, profile };
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

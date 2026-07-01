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
    };
    
    // Fetch recent credit
    const dbLogs = await db.select().from(playLog).orderBy(desc(playLog.playedAt)).limit(20);
    const recentCredit = [];
    if (dbLogs.length > 0) {
      for (let i = 0; i < dbLogs.length; i++) {
        recentCredit.push(dbLogs[i]);
        if (dbLogs[i].track === 1) {
          break; // End of the latest credit
        }
        if (i < dbLogs.length - 1) {
          // Time gap fallback
          const gap = dbLogs[i].playedAt.getTime() - dbLogs[i+1].playedAt.getTime();
          if (gap > 30 * 60 * 1000) break;
          // Track anomaly fallback
          if (dbLogs[i].track !== null && dbLogs[i+1].track !== null && dbLogs[i+1].track! >= dbLogs[i].track!) break;
        }
      }
    }

    // Since we iterated backwards in time (desc), the array is [Track 4, Track 3, Track 2, Track 1]
    // We reverse it to display Track 1 first.
    recentCredit.reverse();

    return { ratingData, lastSync, recentCredit, totalSongs: songs.length, currentVersion, profile };
  } catch {
    return null;
  }
}

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const data = await getDashboardData();
  return (
    <Suspense fallback={<div className="p-8 text-center" style={{ color: 'var(--foreground-muted)' }}>Loading…</div>}>
      <DashboardClient data={data} />
    </Suspense>
  );
}

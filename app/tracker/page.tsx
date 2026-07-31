import { db } from '@/lib/db';
import { scores, scoreTrackers, settings, trackerLists, trackerItems, sessionItems } from '@/lib/db/schema';
import { fetchSongs, buildSongMap, detectCurrentVersion } from '@/lib/song-db';
import { computeRating } from '@/lib/rating';
import type { Score, Difficulty } from '@/lib/types';
import TrackerClient from './tracker-client';
import { inArray } from 'drizzle-orm';
import { getAllCharts } from '@/app/scores/actions';

export const metadata = { title: 'The Board' };
export const dynamic = 'force-dynamic';

export default async function TrackerPage() {
  try {
    const [songs, dbScores, trackers, allCharts, settingRows, lists, items, session] = await Promise.all([
      fetchSongs(),
      db.select().from(scores),
      db.select().from(scoreTrackers),
      getAllCharts(),
      db.select().from(settings).where(inArray(settings.key, ['maimai_version'])),
      db.select().from(trackerLists),
      db.select().from(trackerItems),
      db.select().from(sessionItems),
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

    const currentRating = computeRating(typedScores, songMap, currentVersion);

    // Format dates to strings for initial props to avoid Next.js serialization warnings
    const initialLists = lists.map(l => ({
      ...l,
      emoji: l.emoji ?? '🎵',
      color: l.color ?? '#8957e5',
      sortOrder: l.sortOrder ?? 0,
    }));
    const initialItems = items.map(item => ({ 
      ...item, 
      achievedAt: item.achievedAt?.toISOString() ?? null,
      sortOrder: item.sortOrder ?? 0,
    }));
    const initialSession = session.map(s => ({ 
      ...s, 
      addedAt: s.addedAt.toISOString(),
      played: s.played ?? false,
      sortOrder: s.sortOrder ?? 0,
    }));

    return (
      <TrackerClient 
        trackers={trackers} 
        scores={currentRating.allScores} 
        typedScores={typedScores}
        currentTotalRating={currentRating.totalRating}
        songMapRecord={Object.fromEntries(songMap)}
        currentVersion={currentVersion}
        allCharts={allCharts}
        initialLists={initialLists}
        initialItems={initialItems}
        initialSession={initialSession}
      />
    );
  } catch (err) {
    console.error(err);
    return (
      <div className="p-8 text-center text-white/50">
        Database not connected.
      </div>
    );
  }
}

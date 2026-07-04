import { db } from '@/lib/db';
import { scores, scoreTrackers } from '@/lib/db/schema';
import { fetchSongs, buildSongMap, detectCurrentVersion } from '@/lib/song-db';
import { computeRating } from '@/lib/rating';
import type { Score, Difficulty, ScoreWithRating } from '@/lib/types';
import TrackerClient from './tracker-client';
import { getSetting } from '@/lib/maimai-sync';
import { getAllCharts } from '@/app/scores/actions';

export const metadata = { title: 'Score Tracker' };

export default async function TrackerPage() {
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

    const currentRating = computeRating(typedScores, songMap, currentVersion);
    const trackers = await db.select().from(scoreTrackers);
    const allCharts = await getAllCharts();

    return (
      <TrackerClient 
        trackers={trackers} 
        scores={currentRating.allScores} 
        typedScores={typedScores}
        currentTotalRating={currentRating.totalRating}
        songMapRecord={Object.fromEntries(songMap)}
        currentVersion={currentVersion}
        allCharts={allCharts}
      />
    );
  } catch {
    return (
      <div className="p-8 text-center text-white/50">
        Database not connected.
      </div>
    );
  }
}

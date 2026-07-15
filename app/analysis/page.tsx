import { db } from '@/lib/db';
import { scores, settings } from '@/lib/db/schema';
import { fetchSongs, buildSongMap, detectCurrentVersion } from '@/lib/song-db';
import { computeRating, getTargetSuggestions } from '@/lib/rating';
import type { Score, Difficulty } from '@/lib/types';
import AnalysisClient from './analysis-client';
import { inArray } from 'drizzle-orm';

export const metadata = { title: 'Analysis' };
export const dynamic = 'force-dynamic';

export default async function AnalysisPage() {
  try {
    const [songs, dbScores, settingRows] = await Promise.all([
      fetchSongs(),
      db.select().from(scores),
      db.select().from(settings).where(inArray(settings.key, ['maimai_version'])),
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
    const suggestions = getTargetSuggestions(ratingData, ratingData.allScores, 1000);

    return <AnalysisClient ratingData={ratingData} suggestions={suggestions} totalScores={typedScores.length} />;
  } catch {
    return (
      <div className="p-8 text-center" style={{ color: 'var(--foreground-muted)' }}>
        Database not connected. Set DATABASE_URL in .env.local.
      </div>
    );
  }
}

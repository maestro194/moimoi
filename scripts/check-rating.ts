import { db } from '../lib/db';
import { scores } from '../lib/db/schema';
import { fetchSongs, buildSongMap, detectCurrentVersion } from '../lib/song-db';
import { computeRating, deriveBigVersions, getNewPoolThreshold } from '../lib/rating';
import type { Score, Difficulty } from '../lib/types';

async function main() {
  const songs = await fetchSongs();
  const songMap = buildSongMap(songs);
  const currentVersion = detectCurrentVersion(songs);
  const bigVersions = deriveBigVersions(songMap);
  const threshold = getNewPoolThreshold(songMap, currentVersion);

  console.log(`\ncurrentVersion (detected): ${currentVersion}`);
  console.log(`Top big versions: ${bigVersions.slice(0, 5).join(', ')}`);
  console.log(`New pool threshold: >= ${threshold}\n`);

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

  const rating = computeRating(typedScores, songMap, currentVersion);

  console.log(`=== RATING SUMMARY ===`);
  console.log(`Total rating:  ${rating.totalRating}`);
  console.log(`New (B15):     ${rating.newRating}  (${rating.newCharts.length} charts)`);
  console.log(`Old (B35):     ${rating.oldRating}  (${rating.oldCharts.length} charts)`);

  console.log(`\n=== TOP 5 NEW (B15) ===`);
  for (const s of rating.newCharts.slice(0, 5)) {
    const song = songMap.get(s.songTitle);
    console.log(`  [v${song?.version ?? '?'}] ${s.songTitle} (${s.difficulty}) | Lv${s.internalLevel} | ${s.achievement.toFixed(4)}% | rating: ${s.rating}`);
  }

  console.log(`\n=== TOP 5 OLD (B35) ===`);
  for (const s of rating.oldCharts.slice(0, 5)) {
    const song = songMap.get(s.songTitle);
    console.log(`  [v${song?.version ?? '?'}] ${s.songTitle} (${s.difficulty}) | Lv${s.internalLevel} | ${s.achievement.toFixed(4)}% | rating: ${s.rating}`);
  }

  // Check if any new-era songs landed in old pool
  const newVersionScores = rating.allScores.filter(s => {
    const song = songMap.get(s.songTitle);
    return song && parseInt(song.version) >= threshold;
  });
  const misplacedOld = newVersionScores.filter(s => s.pool === 'old');
  if (misplacedOld.length > 0) {
    console.log(`\n⚠️  ${misplacedOld.length} new-era songs assigned to OLD pool:`);
    for (const s of misplacedOld.slice(0, 5)) {
      const song = songMap.get(s.songTitle);
      console.log(`  [v${song?.version}] ${s.songTitle} (${s.difficulty})`);
    }
  } else {
    console.log(`\n✅ All new-era songs correctly in new pool.`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

import { db } from '../lib/db';
import { scores } from '../lib/db/schema';
import { fetchSongs, buildSongMap, detectCurrentVersion } from '../lib/song-db';

async function main() {
  const songs = await fetchSongs();
  const map = buildSongMap(songs);
  const allScores = await db.select().from(scores);
  
  let newCount = 0;
  let missingCount = 0;
  let oldCount = 0;
  
  for (const s of allScores) {
    const song = map.get(s.songTitle);
    if (!song) {
      missingCount++;
    } else {
      const v = parseInt(song.version, 10);
      if (v >= 25000) newCount++;
      else oldCount++;
    }
  }
  
  console.log(`Total scores: ${allScores.length}`);
  console.log(`Missing songs (title mismatch): ${missingCount}`);
  console.log(`New songs (v >= 25000): ${newCount}`);
  console.log(`Old songs: ${oldCount}`);
  
  if (missingCount > 0) {
    console.log('Sample missing:');
    console.log(allScores.filter(s => !map.has(s.songTitle)).slice(0, 5).map(s => s.songTitle));
  }
}

main().catch(console.error);

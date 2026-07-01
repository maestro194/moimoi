import { db } from '../lib/db';
import { sql } from 'drizzle-orm';
import { scores } from '../lib/db/schema';

async function cleanupDuplicates() {
  console.log('Cleaning up duplicate scores...');
  
  // We want to keep the score with the highest achievement for each (songTitle, difficulty, songType).
  // If there are ties in achievement, we can just keep the one with the maximum ID.
  const query = sql`
    DELETE FROM scores
    WHERE id NOT IN (
      SELECT DISTINCT ON (song_title, difficulty, song_type) id
      FROM scores
      ORDER BY song_title, difficulty, song_type, achievement DESC, id DESC
    )
  `;

  const result = await db.execute(query);
  console.log('Cleanup finished. Rows affected:', result.rowCount);
  process.exit(0);
}

cleanupDuplicates().catch(err => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});

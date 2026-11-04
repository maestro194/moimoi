/**
 * Moves the songs primary key from title to song_key (two songs are titled "Link").
 * Additive: every row gets song_key = title, so nothing changes until the next song refresh.
 * Run once, after a Neon backup branch: npx tsx --env-file=.env.local scripts/migrate-song-key.ts
 */
import { neon } from '@neondatabase/serverless';

(async () => {
  const sql = neon(process.env.DATABASE_URL!);
  await sql.transaction([
    sql`ALTER TABLE songs ADD COLUMN IF NOT EXISTS song_key text`,
    sql`UPDATE songs SET song_key = title WHERE song_key IS NULL`,
    sql`ALTER TABLE songs ALTER COLUMN song_key SET NOT NULL`,
    sql`ALTER TABLE songs DROP CONSTRAINT IF EXISTS songs_pkey`,
    sql`ALTER TABLE songs ADD CONSTRAINT songs_pkey PRIMARY KEY (song_key)`,
  ]);
  console.log((await sql`SELECT count(*) n, count(DISTINCT song_key) keys FROM songs`)[0]);
})();

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  await sql`ALTER TABLE play_log ADD COLUMN IF NOT EXISTS details jsonb`;
  await sql`ALTER TABLE song_cache ADD COLUMN IF NOT EXISTS jp boolean DEFAULT true`;
  await sql`ALTER TABLE song_cache ADD COLUMN IF NOT EXISTS intl boolean DEFAULT true`;
  
  // also add unique constraint to score_trackers just to bypass the drizzle-kit error later
  try {
    await sql`ALTER TABLE score_trackers ADD CONSTRAINT unique_goal UNIQUE (song_title, difficulty, song_type)`;
  } catch(e) {
    console.log('unique_goal constraint might already exist or skipped:', e.message);
  }
  
  // clear duplicates
  await sql`DELETE FROM play_log WHERE id IN (SELECT id FROM (SELECT id, ROW_NUMBER() OVER (partition BY song_title, played_at ORDER BY id DESC) as rnum FROM play_log) t WHERE t.rnum > 1)`;
  console.log('Done!');
}
run();

/**
 * One-time migration: add composite indexes to play_log and score_history
 * for fast chart-level lookups.
 *
 * Run with: npx tsx scripts/add-chart-indexes.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Adding index on play_log(song_title, difficulty, song_type)…');
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_play_log_chart
      ON play_log (song_title, difficulty, song_type);
  `);
  console.log('✓ idx_play_log_chart created');

  console.log('Adding index on score_history(song_title, difficulty, song_type)…');
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_score_history_chart
      ON score_history (song_title, difficulty, song_type);
  `);
  console.log('✓ idx_score_history_chart created');

  console.log('\nDone.');
  process.exit(0);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});

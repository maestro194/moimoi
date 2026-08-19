/**
 * One-time migration + seed script.
 * Run with: npx tsx scripts/migrate-chart-stats.ts
 *
 * - Creates chart_stats and score_history tables if they don't exist
 * - Seeds version-level play counts: CiRCLE=273, CiRCLE PLUS=88
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Creating chart_stats table...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chart_stats (
      id          SERIAL PRIMARY KEY,
      song_title  TEXT NOT NULL,
      difficulty  VARCHAR(10) NOT NULL,
      song_type   VARCHAR(5) NOT NULL DEFAULT 'DX',
      version     TEXT NOT NULL,
      play_count  INTEGER NOT NULL DEFAULT 0,
      updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT unique_chart_version UNIQUE (song_title, difficulty, song_type, version)
    );
  `);
  console.log('✓ chart_stats created');

  console.log('Creating score_history table...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS score_history (
      id          SERIAL PRIMARY KEY,
      song_title  TEXT NOT NULL,
      difficulty  VARCHAR(10) NOT NULL,
      song_type   VARCHAR(5) NOT NULL DEFAULT 'DX',
      achievement TEXT NOT NULL,
      dx_score    INTEGER,
      fc          VARCHAR(5),
      fs          VARCHAR(5),
      rating      INTEGER,
      recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✓ score_history created');

  // ── Seed aggregate version play counts into settings ────────────────────────
  // These are total plays across ALL charts for each version.
  // Stored in settings table as simple key-value to avoid requiring per-chart data.
  console.log('Seeding version play counts into settings...');

  const versionPlays: Record<string, number> = {
    '26000': 273,  // CiRCLE
    '26500': 88,   // CiRCLE PLUS
  };

  await db.execute(sql`
    INSERT INTO settings (key, value, updated_at)
    VALUES (
      'version_play_counts',
      ${JSON.stringify(versionPlays)},
      NOW()
    )
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = NOW();
  `);

  console.log('✓ Seeded version_play_counts:', versionPlays);
  console.log('\nDone! Migration complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

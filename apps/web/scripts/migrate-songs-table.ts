/**
 * Migration: song_cache → songs
 *
 * This script:
 *   1. Creates the new `songs` table (if not exists)
 *   2. Copies all data from `song_cache` into `songs`
 *   3. Alters dx_lev_mas_i and dx_lev_remas_i from numeric → text
 *   4. Adds dxrating_version and refreshed_at columns
 *
 * Safe to run multiple times (idempotent).
 */
import 'dotenv/config';
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Starting song DB migration...\n');

  // 1. Create the songs table (matches new schema)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS songs (
      title              TEXT PRIMARY KEY,
      sort               TEXT,
      title_kana         TEXT,
      artist             TEXT NOT NULL DEFAULT '',
      catcode            TEXT NOT NULL DEFAULT '',
      version            TEXT NOT NULL DEFAULT '',
      bpm                TEXT,
      image_url          TEXT,
      lev_bas            TEXT,
      lev_adv            TEXT,
      lev_exp            TEXT,
      lev_mas            TEXT,
      lev_remas          TEXT,
      lev_utage          TEXT,
      kanji              TEXT,
      lev_bas_i          TEXT,
      lev_adv_i          TEXT,
      lev_exp_i          TEXT,
      lev_mas_i          TEXT,
      lev_remas_i        TEXT,
      dx_lev_bas         TEXT,
      dx_lev_adv         TEXT,
      dx_lev_exp         TEXT,
      dx_lev_mas         TEXT,
      dx_lev_remas       TEXT,
      dx_lev_bas_i       TEXT,
      dx_lev_adv_i       TEXT,
      dx_lev_exp_i       TEXT,
      dx_lev_mas_i       TEXT,
      dx_lev_remas_i     TEXT,
      jp                 BOOLEAN DEFAULT true,
      intl               BOOLEAN DEFAULT true,
      date_added         TEXT,
      dxrating_version   TEXT,
      refreshed_at       TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✓ songs table created (or already exists)');

  // 2. Copy data from song_cache → songs (skip rows that already exist)
  const result = await db.execute(sql`
    INSERT INTO songs (
      title, sort, title_kana, artist, catcode, version, bpm, image_url,
      lev_bas, lev_adv, lev_exp, lev_mas, lev_remas, lev_utage, kanji,
      lev_bas_i, lev_adv_i, lev_exp_i, lev_mas_i, lev_remas_i,
      dx_lev_bas, dx_lev_adv, dx_lev_exp, dx_lev_mas, dx_lev_remas,
      dx_lev_bas_i, dx_lev_adv_i, dx_lev_exp_i,
      dx_lev_mas_i, dx_lev_remas_i,
      jp, intl, date_added, refreshed_at
    )
    SELECT
      title, sort, title_kana, artist, catcode, version, bpm, image_url,
      lev_bas, lev_adv, lev_exp, lev_mas, lev_remas, lev_utage, kanji,
      lev_bas_i, lev_adv_i, lev_exp_i, lev_mas_i, lev_remas_i,
      dx_lev_bas, dx_lev_adv, dx_lev_exp, dx_lev_mas, dx_lev_remas,
      dx_lev_bas_i::TEXT, dx_lev_adv_i::TEXT, dx_lev_exp_i::TEXT,
      dx_lev_mas_i::TEXT, dx_lev_remas_i::TEXT,
      jp::BOOLEAN, intl::BOOLEAN, date_added,
      COALESCE(cached_at, NOW())
    FROM song_cache
    ON CONFLICT (title) DO NOTHING
  `);
  console.log(`✓ Copied rows from song_cache → songs`);

  // 3. Check counts
  const countResult = await db.execute(sql`SELECT COUNT(*) as n FROM songs`);
  const n = (countResult.rows[0] as any).n;
  console.log(`✓ songs table now has ${n} rows`);

  console.log('\nMigration complete!');
  console.log('Next step: run POST /api/refresh-songs to populate dxrating_version and refresh all constants.');
}

migrate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });

/**
 * Migration script — creates the three tag tables in Neon directly.
 * Run with: npx tsx scripts/create-tag-tables.ts
 *
 * Safe to re-run: uses IF NOT EXISTS.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log('📦 Creating tag tables...\n');

  await sql`
    CREATE TABLE IF NOT EXISTS tag_groups (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      color       TEXT NOT NULL,
      sort_order  INTEGER DEFAULT 0,
      created_at  TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  console.log('  ✅ tag_groups');

  await sql`
    CREATE TABLE IF NOT EXISTS tags (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      group_id    INTEGER REFERENCES tag_groups(id) ON DELETE SET NULL,
      created_at  TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  console.log('  ✅ tags');

  await sql`
    CREATE TABLE IF NOT EXISTS tag_songs (
      id               SERIAL PRIMARY KEY,
      tag_id           INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      song_title       TEXT NOT NULL,
      sheet_type       VARCHAR(5) NOT NULL,
      sheet_difficulty VARCHAR(10) NOT NULL,
      created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT unique_tag_chart UNIQUE (tag_id, song_title, sheet_type, sheet_difficulty)
    )
  `;
  console.log('  ✅ tag_songs');

  console.log('\n✨ Done! Tag tables are ready.');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

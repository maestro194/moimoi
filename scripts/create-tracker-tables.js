const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS tracker_lists (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      emoji      TEXT DEFAULT '🎵',
      color      TEXT DEFAULT '#8957e5',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tracker_items (
      id               SERIAL PRIMARY KEY,
      list_id          INTEGER NOT NULL REFERENCES tracker_lists(id) ON DELETE CASCADE,
      song_title       TEXT NOT NULL,
      sheet_type       VARCHAR(5) NOT NULL DEFAULT 'DX',
      sheet_difficulty VARCHAR(10) NOT NULL,
      target_score     TEXT,
      notes            TEXT,
      sort_order       INTEGER DEFAULT 0,
      achieved_at      TIMESTAMP,
      created_at       TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS session_items (
      id               SERIAL PRIMARY KEY,
      song_title       TEXT NOT NULL,
      sheet_type       VARCHAR(5) NOT NULL DEFAULT 'DX',
      sheet_difficulty VARCHAR(10) NOT NULL,
      played           BOOLEAN DEFAULT FALSE,
      sort_order       INTEGER DEFAULT 0,
      added_at         TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  // Seed the default "Want to Play" list if it doesn't exist
  const existing = await sql`SELECT id FROM tracker_lists WHERE name = 'Want to Play' LIMIT 1`;
  if (existing.length === 0) {
    await sql`
      INSERT INTO tracker_lists (name, emoji, color, sort_order)
      VALUES ('Want to Play', '🎮', '#8957e5', 0)
    `;
    console.log('Seeded default list: Want to Play');
  }

  console.log('✓ tracker_lists, tracker_items, session_items tables ready');
}

migrate().catch(e => { console.error(e); process.exit(1); });

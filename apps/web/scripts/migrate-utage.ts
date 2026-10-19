import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Running migration...');
  
  await db.execute(sql`ALTER TABLE song_cache ADD COLUMN IF NOT EXISTS lev_utage TEXT`);
  console.log('✓ song_cache.lev_utage added');
  
  await db.execute(sql`ALTER TABLE song_cache ADD COLUMN IF NOT EXISTS kanji TEXT`);
  console.log('✓ song_cache.kanji added');
  
  console.log('\nMigration complete!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

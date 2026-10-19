import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Running migration...');
  
  await db.execute(sql`ALTER TABLE song_cache ADD COLUMN IF NOT EXISTS dx_lev_bas TEXT`);
  console.log('✓ song_cache.dx_lev_bas added');
  
  await db.execute(sql`ALTER TABLE song_cache ADD COLUMN IF NOT EXISTS dx_lev_adv TEXT`);
  console.log('✓ song_cache.dx_lev_adv added');
  
  await db.execute(sql`ALTER TABLE song_cache ADD COLUMN IF NOT EXISTS dx_lev_exp TEXT`);
  console.log('✓ song_cache.dx_lev_exp added');
  
  await db.execute(sql`ALTER TABLE song_cache ADD COLUMN IF NOT EXISTS dx_lev_mas TEXT`);
  console.log('✓ song_cache.dx_lev_mas added');
  
  await db.execute(sql`ALTER TABLE song_cache ADD COLUMN IF NOT EXISTS dx_lev_remas TEXT`);
  console.log('✓ song_cache.dx_lev_remas added');
  
  console.log('\nMigration complete!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

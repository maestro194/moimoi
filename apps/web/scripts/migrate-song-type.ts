import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Running migration...');
  
  await db.execute(sql`ALTER TABLE scores ADD COLUMN IF NOT EXISTS song_type VARCHAR(5) NOT NULL DEFAULT 'DX'`);
  console.log('✓ scores.song_type added');
  
  await db.execute(sql`ALTER TABLE play_log ADD COLUMN IF NOT EXISTS song_type VARCHAR(5) NOT NULL DEFAULT 'DX'`);
  console.log('✓ play_log.song_type added');
  
  await db.execute(sql`ALTER TABLE song_cache ADD COLUMN IF NOT EXISTS dx_lev_bas_i TEXT`);
  console.log('✓ song_cache.dx_lev_bas_i added');
  
  await db.execute(sql`ALTER TABLE song_cache ADD COLUMN IF NOT EXISTS dx_lev_adv_i TEXT`);
  console.log('✓ song_cache.dx_lev_adv_i added');
  
  await db.execute(sql`ALTER TABLE song_cache ADD COLUMN IF NOT EXISTS dx_lev_exp_i TEXT`);
  console.log('✓ song_cache.dx_lev_exp_i added');
  
  await db.execute(sql`ALTER TABLE song_cache ADD COLUMN IF NOT EXISTS dx_lev_mas_i TEXT`);
  console.log('✓ song_cache.dx_lev_mas_i added');
  
  await db.execute(sql`ALTER TABLE song_cache ADD COLUMN IF NOT EXISTS dx_lev_remas_i TEXT`);
  console.log('✓ song_cache.dx_lev_remas_i added');
  
  console.log('\nMigration complete!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

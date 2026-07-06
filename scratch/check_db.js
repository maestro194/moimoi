import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`SELECT count(*) FROM play_log`;
  console.log('Total plays:', rows[0].count);
  
  const dups = await sql`SELECT song_title, played_at, count(*) FROM play_log GROUP BY song_title, played_at HAVING count(*) > 1 LIMIT 5`;
  console.log('Duplicates:', dups);
}
check();

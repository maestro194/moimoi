import { db } from '../lib/db';
import { songCache } from '../lib/db/schema';
import { sql } from 'drizzle-orm';

async function main() {
  const rows = await db
    .select({
      version: songCache.version,
      count: sql<number>`count(*)`,
    })
    .from(songCache)
    .groupBy(songCache.version)
    .orderBy(sql`cast(version as integer) desc`);

  console.log('Version | Count');
  console.log('--------|------');
  for (const row of rows) {
    console.log(`${row.version} | ${row.count}`);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

import { refreshSongsDb } from './lib/song-db';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Refreshing songs DB...');
  const result = await refreshSongsDb();
  console.log('Done', result);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

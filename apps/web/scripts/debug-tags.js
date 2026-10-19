const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function check() {
  // Check a few DX-tagged songs to verify title match + intl status
  const testSongs = [
    'Straight into the lights',
    'DRAGONLADY',
    'Ether Strike',
    'Strange Bar',
    'Grievous Lady',
    'LAMIA',
    'Valsqotch',
    'World\'s end loneliness',
    'BREaK! BREaK! BREaK!',
  ];

  for (const t of testSongs) {
    const rows = await sql`SELECT title, intl FROM songs WHERE title = ${t} LIMIT 1`;
    if (rows.length) {
      console.log(`FOUND  "${t}"  intl=${rows[0].intl}`);
    } else {
      console.log(`MISSING "${t}"`);
    }
  }

  // Also check how many tagSongs we'd match for DX master charts in intl songs
  const intlDxTaggedSongs = ['Straight into the lights', 'Ether Strike', 'Grievous Lady', 'LAMIA'];
  for (const s of intlDxTaggedSongs) {
    const rows = await sql`SELECT dx_lev_mas_i FROM songs WHERE title = ${s} LIMIT 1`;
    if (rows.length) console.log(`  "${s}" dx_lev_mas_i = ${rows[0].dx_lev_mas_i}`);
  }
}

check().catch(console.error);

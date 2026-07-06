const fs = require('fs');
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);
const data = JSON.parse(fs.readFileSync('scratch/tomomai_plays.json'));

(async () => {
  let updated = 0;
  for (const p of data) {
    const res = await sql.query('SELECT id, details FROM play_log WHERE song_title = $1 AND played_at = $2', [p.songName, p.playedAt]);
    for (const row of res.rows || res) {
      if (row.details) {
        row.details.totalRating = p.rating;
        row.details.ratingChange = p.ratingChange;
        row.details.combo = p.combo;
        row.details.maxCombo = p.maxCombo;
        await sql.query('UPDATE play_log SET details = $1::jsonb WHERE id = $2', [JSON.stringify(row.details), row.id]);
        updated++;
      }
    }
  }
  console.log('Updated ' + updated);
})();

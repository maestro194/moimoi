/**
 * One-time backfill migration script:
 * Iterates through all existing play_log records with details,
 * solves their Break Perfect & Great sub-tiers from the recorded achievement,
 * and updates details in the database with the solved sub-tiers (preserving raw values in raw).
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { solvePlayDetails } from '../lib/accuracy-solver';

dotenv.config({ path: '.env.local' });

async function backfill() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set in .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  console.log('Connected to Neon database.');

  try {
    // Select all plays with details
    const res = await client.query(`
      SELECT id, song_title, difficulty, achievement, details
      FROM play_log
      WHERE details IS NOT NULL
      ORDER BY id ASC;
    `);

    const total = res.rows.length;
    console.log(`Found ${total} plays with details to verify/backfill.`);

    let updatedCount = 0;
    let skippedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < total; i += batchSize) {
      const batch = res.rows.slice(i, i + batchSize);

      await client.query('BEGIN');
      try {
        for (const row of batch) {
          const d = row.details;
          if (!d || !d.break) {
            skippedCount++;
            continue;
          }

          // Solve and enrich details
          const solvedDetails = solvePlayDetails(d, row.achievement);

          await client.query(
            `UPDATE play_log SET details = $1 WHERE id = $2;`,
            [JSON.stringify(solvedDetails), row.id]
          );
          updatedCount++;
        }
        await client.query('COMMIT');
        console.log(`Processed batch ${Math.min(i + batchSize, total)} / ${total} plays...`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error in batch starting at index ${i}:`, err);
        throw err;
      }
    }

    console.log(`\nBackfill complete!`);
    console.log(`Updated: ${updatedCount} plays with solved breakdowns.`);
    console.log(`Skipped: ${skippedCount} plays.`);
  } finally {
    await client.end();
  }
}

backfill().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

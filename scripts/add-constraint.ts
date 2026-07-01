import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function addConstraint() {
  console.log('Adding unique constraint...');
  
  await db.execute(sql`
    ALTER TABLE scores
    ADD CONSTRAINT unique_score UNIQUE (song_title, difficulty, song_type)
  `);

  console.log('Constraint added successfully.');
  process.exit(0);
}

addConstraint().catch(err => {
  console.error('Error adding constraint:', err);
  process.exit(1);
});

const { Client } = require('pg');
require('dotenv').config({path: '.env.local'});
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS score_trackers (
      id SERIAL PRIMARY KEY,
      song_title TEXT NOT NULL,
      difficulty VARCHAR(10) NOT NULL,
      song_type VARCHAR(5) NOT NULL DEFAULT 'DX',
      target_achievement NUMERIC(10,4) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT unique_goal UNIQUE (song_title, difficulty, song_type)
    );
  `);
  console.log('Table created');
  client.end();
});

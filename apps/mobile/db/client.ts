import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

// Open (or create) the database file on device
export const sqlite = SQLite.openDatabaseSync('moimoi.db');

export const db = drizzle(sqlite, { schema });

/**
 * Run initial table creation migrations.
 * Call once at app startup before any queries.
 */
export async function initDb() {
  sqlite.execSync(`
    CREATE TABLE IF NOT EXISTS songs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT NOT NULL UNIQUE,
      title_kana   TEXT,
      artist       TEXT,
      catcode      TEXT,
      version      TEXT,
      image_url    TEXT,
      lev_mas      TEXT,
      lev_mas_i    TEXT,
      dx_lev_mas   TEXT,
      dx_lev_mas_i TEXT,
      lev_exp      TEXT,
      lev_exp_i    TEXT,
      dx_lev_exp   TEXT,
      dx_lev_exp_i TEXT,
      lev_adv      TEXT,
      lev_adv_i    TEXT,
      lev_bas      TEXT,
      lev_bas_i    TEXT,
      lev_remas    TEXT,
      lev_remas_i  TEXT,
      lev_utage    TEXT
    );

    CREATE TABLE IF NOT EXISTS scores (
      id           INTEGER PRIMARY KEY,
      song_title   TEXT NOT NULL,
      difficulty   TEXT NOT NULL,
      song_type    TEXT NOT NULL DEFAULT 'DX',
      achievement  REAL NOT NULL,
      dx_score     INTEGER,
      fc           TEXT,
      fs           TEXT,
      played_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS play_log (
      id           INTEGER PRIMARY KEY,
      song_title   TEXT NOT NULL,
      difficulty   TEXT NOT NULL,
      song_type    TEXT NOT NULL DEFAULT 'DX',
      achievement  REAL NOT NULL,
      dx_score     INTEGER,
      fc           TEXT,
      fs           TEXT,
      track        INTEGER,
      details      TEXT,
      played_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key        TEXT PRIMARY KEY,
      value      TEXT,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS arcade_sessions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at     INTEGER NOT NULL,
      ended_at       INTEGER,
      location_name  TEXT,
      play_count     INTEGER DEFAULT 0,
      rating_before  INTEGER,
      rating_after   INTEGER
    );
  `);
}

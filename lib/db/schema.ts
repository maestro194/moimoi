import { pgTable, serial, text, integer, timestamp, varchar, unique, jsonb, boolean } from 'drizzle-orm/pg-core';

// Scores stored after syncing from maimai NET or manual entry
export const scores = pgTable('scores', {
  id: serial('id').primaryKey(),
  songTitle: text('song_title').notNull(),
  difficulty: varchar('difficulty', { length: 10 }).notNull(), // BAS/ADV/EXP/MAS/REMAS
  /** STD = standard/legacy chart, DX = maimai DX chart (default) */
  songType: varchar('song_type', { length: 5 }).notNull().default('DX'), // STD/DX
  achievement: text('achievement').notNull(), // e.g. "100.5000"
  dxScore: integer('dx_score'),
  fc: varchar('fc', { length: 5 }), // FC/FC+/AP/AP+
  fs: varchar('fs', { length: 5 }), // FS/FS+/FDX/FDX+/SYNC
  playedAt: timestamp('played_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqueScore: unique('unique_score').on(table.songTitle, table.difficulty, table.songType)
}));

// Chronological history of plays (recent 50 from /record/)
export const playLog = pgTable('play_log', {
  id: serial('id').primaryKey(),
  songTitle: text('song_title').notNull(),
  difficulty: varchar('difficulty', { length: 10 }).notNull(), // BAS/ADV/EXP/MAS/REMAS
  /** STD = standard/legacy chart, DX = maimai DX chart (default) */
  songType: varchar('song_type', { length: 5 }).notNull().default('DX'), // STD/DX
  achievement: text('achievement').notNull(),
  dxScore: integer('dx_score'),
  fc: varchar('fc', { length: 5 }), // FC/FC+/AP/AP+
  fs: varchar('fs', { length: 5 }), // FS/FS+/FDX/FDX+/SYNC
  track: integer('track'), // e.g. 1, 2, 3, 4
  details: jsonb('details'), // Stores raw tap/hold/slide/fast/late counts if available
  playedAt: timestamp('played_at').notNull(), // Exact time from maimai NET
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Key-value settings store (credentials, sync config, etc.)
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Canonical song database — seeded from otoge-db (intl + JP) and dxrating.
 * Populated/updated by calling POST /api/refresh-songs.
 * All internal level fields use text for consistency.
 */
export const songs = pgTable('songs', {
  title: text('title').primaryKey(),
  sort: text('sort'),
  titleKana: text('title_kana'),
  artist: text('artist').notNull(),
  catcode: text('catcode').notNull(),
  version: text('version').notNull(),
  bpm: text('bpm'),
  imageUrl: text('image_url'),

  // STD chart display levels (null = no STD chart exists)
  levBas:   text('lev_bas'),
  levAdv:   text('lev_adv'),
  levExp:   text('lev_exp'),
  levMas:   text('lev_mas'),
  levRemas: text('lev_remas'),
  levUtage: text('lev_utage'),
  kanji:    text('kanji'),

  // STD chart internal levels (chart constants, null = no STD chart)
  levBasI:   text('lev_bas_i'),
  levAdvI:   text('lev_adv_i'),
  levExpI:   text('lev_exp_i'),
  levMasI:   text('lev_mas_i'),
  levRemasI: text('lev_remas_i'),

  // DX chart display levels (null = no DX chart exists)
  dxLevBas:   text('dx_lev_bas'),
  dxLevAdv:   text('dx_lev_adv'),
  dxLevExp:   text('dx_lev_exp'),
  dxLevMas:   text('dx_lev_mas'),
  dxLevRemas: text('dx_lev_remas'),

  // DX chart internal levels (chart constants, null = no DX chart) — all text for consistency
  dxLevBasI:   text('dx_lev_bas_i'),
  dxLevAdvI:   text('dx_lev_adv_i'),
  dxLevExpI:   text('dx_lev_exp_i'),
  dxLevMasI:   text('dx_lev_mas_i'),
  dxLevRemasI: text('dx_lev_remas_i'),

  // Region availability flags (from dxrating per-sheet regions)
  jp:   boolean('jp').default(true),
  intl: boolean('intl').default(true),

  dateAdded: text('date_added'),     // YYYYMMDD JP release from otoge-db
  dateIntlAdded: text('date_intl_added'), // YYYYMMDD INTL release from otoge-db

  // Provenance — when was this row last fetched and from which dxrating version
  dxratingVersion: text('dxrating_version'), // e.g. "1.5.3" from dxdata.json
  refreshedAt: timestamp('refreshed_at').notNull().defaultNow(),

  // Raw sheets array from dxdata.json containing detailed note counts and chart designers
  sheets: jsonb('sheets'),
});

// Backwards-compat alias — all existing imports of songCache still work
export const songCache = songs;

// Goals tracked by the user for specific charts
export const scoreTrackers = pgTable('score_trackers', {
  id: serial('id').primaryKey(),
  songTitle: text('song_title').notNull(),
  difficulty: varchar('difficulty', { length: 10 }).notNull(), // BAS/ADV/EXP/MAS/REMAS/UTAGE
  songType: varchar('song_type', { length: 5 }).notNull().default('DX'), // STD/DX
  targetAchievement: text('target_achievement').notNull(), // e.g. "100.5000"
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqueGoal: unique('unique_goal').on(table.songTitle, table.difficulty, table.songType)
}));

export type InsertScore = typeof scores.$inferInsert;
export type SelectScore = typeof scores.$inferSelect;
export type InsertPlayLog = typeof playLog.$inferInsert;
export type SelectPlayLog = typeof playLog.$inferSelect;
export type InsertSong = typeof songs.$inferInsert;
export type SelectSong = typeof songs.$inferSelect;
export type InsertTracker = typeof scoreTrackers.$inferInsert;
export type SelectTracker = typeof scoreTrackers.$inferSelect;

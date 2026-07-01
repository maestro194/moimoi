import { pgTable, serial, text, numeric, integer, timestamp, varchar } from 'drizzle-orm/pg-core';

// Scores stored after syncing from maimai NET or manual entry
export const scores = pgTable('scores', {
  id: serial('id').primaryKey(),
  songTitle: text('song_title').notNull(),
  difficulty: varchar('difficulty', { length: 10 }).notNull(), // BAS/ADV/EXP/MAS/REMAS
  /** STD = standard/legacy chart, DX = maimai DX chart (default) */
  songType: varchar('song_type', { length: 5 }).notNull().default('DX'), // STD/DX
  achievement: numeric('achievement', { precision: 10, scale: 4 }).notNull(), // e.g. 100.5000
  dxScore: integer('dx_score'),
  fc: varchar('fc', { length: 5 }), // FC/FC+/AP/AP+
  fs: varchar('fs', { length: 5 }), // FS/FS+/FDX/FDX+/SYNC
  playedAt: timestamp('played_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Chronological history of plays (recent 50 from /record/)
export const playLog = pgTable('play_log', {
  id: serial('id').primaryKey(),
  songTitle: text('song_title').notNull(),
  difficulty: varchar('difficulty', { length: 10 }).notNull(), // BAS/ADV/EXP/MAS/REMAS
  /** STD = standard/legacy chart, DX = maimai DX chart (default) */
  songType: varchar('song_type', { length: 5 }).notNull().default('DX'), // STD/DX
  achievement: numeric('achievement', { precision: 10, scale: 4 }).notNull(),
  dxScore: integer('dx_score'),
  fc: varchar('fc', { length: 5 }), // FC/FC+/AP/AP+
  fs: varchar('fs', { length: 5 }), // FS/FS+/FDX/FDX+/SYNC
  track: integer('track'), // e.g. 1, 2, 3, 4
  playedAt: timestamp('played_at').notNull(), // Exact time from maimai NET
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Key-value settings store (credentials, sync config, etc.)
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Song cache — stores the parsed otoge-db JSON to avoid re-fetching each request
export const songCache = pgTable('song_cache', {
  title: text('title').primaryKey(),
  sort: text('sort'),
  titleKana: text('title_kana'),
  artist: text('artist').notNull(),
  catcode: text('catcode').notNull(),
  version: text('version').notNull(),
  bpm: text('bpm'),
  imageUrl: text('image_url'),
  // STD chart display levels (for JP legacy songs)
  levBas: text('lev_bas'),
  levAdv: text('lev_adv'),
  levExp: text('lev_exp'),
  levMas: text('lev_mas'),
  levRemas: text('lev_remas'),
  // STD or normalized internal levels (DX for DX-only songs, STD for STD-only)
  levBasI: text('lev_bas_i'),
  levAdvI: text('lev_adv_i'),
  levExpI: text('lev_exp_i'),
  levMasI: text('lev_mas_i'),
  levRemasI: text('lev_remas_i'),
  // DX chart display levels
  dxLevBas: text('dx_lev_bas'),
  dxLevAdv: text('dx_lev_adv'),
  dxLevExp: text('dx_lev_exp'),
  dxLevMas: text('dx_lev_mas'),
  dxLevRemas: text('dx_lev_remas'),
  // DX chart internal levels (preserved separately — critical for songs with both STD+DX)
  dxLevBasI: text('dx_lev_bas_i'),
  dxLevAdvI: text('dx_lev_adv_i'),
  dxLevExpI: text('dx_lev_exp_i'),
  dxLevMasI: text('dx_lev_mas_i'),
  dxLevRemasI: text('dx_lev_remas_i'),
  intl: text('intl'),
  dateAdded: text('date_added'),
  cachedAt: timestamp('cached_at').notNull().defaultNow(),
});

export type InsertScore = typeof scores.$inferInsert;
export type SelectScore = typeof scores.$inferSelect;
export type InsertPlayLog = typeof playLog.$inferInsert;
export type SelectPlayLog = typeof playLog.$inferSelect;
export type InsertSong = typeof songCache.$inferInsert;
export type SelectSong = typeof songCache.$inferSelect;

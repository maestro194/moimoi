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

// ── Tag System ──────────────────────────────────────────────────────────────

/** Color-coded grouping of tags (e.g. "Technical", "Physical", "Personal") */
export const tagGroups = pgTable('tag_groups', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),        // Hex e.g. "#8957e5"
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/** Individual tag label (e.g. "Gimmick", "Stream", "Practice") */
export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),      // Shown in hover tooltip
  groupId: integer('group_id').references(() => tagGroups.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/** Per-chart tag assignment: which tag applies to which (song × type × difficulty) */
export const tagSongs = pgTable('tag_songs', {
  id: serial('id').primaryKey(),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  songTitle: text('song_title').notNull(),
  sheetType: varchar('sheet_type', { length: 5 }).notNull(),           // 'DX' | 'STD'
  sheetDifficulty: varchar('sheet_difficulty', { length: 10 }).notNull(), // 'BAS'|'ADV'|'EXP'|'MAS'|'REMAS'
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqueTagChart: unique('unique_tag_chart').on(
    table.tagId, table.songTitle, table.sheetType, table.sheetDifficulty
  ),
}));

export type InsertTagGroup = typeof tagGroups.$inferInsert;
export type SelectTagGroup = typeof tagGroups.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;
export type SelectTag = typeof tags.$inferSelect;
export type InsertTagSong = typeof tagSongs.$inferInsert;
export type SelectTagSong = typeof tagSongs.$inferSelect;

// ── Tracker Board ────────────────────────────────────────────────────────────

/** Named playlist / collection of charts (e.g. "Grind Session", "Want to Play") */
export const trackerLists = pgTable('tracker_lists', {
  id:        serial('id').primaryKey(),
  name:      text('name').notNull(),
  emoji:     text('emoji').default('🎵'),
  color:     text('color').default('#8957e5'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * A chart entry inside a tracker list.
 * targetScore is NULL for wishlist-style entries (no score goal).
 * achievedAt is set when the user marks it done.
 */
export const trackerItems = pgTable('tracker_items', {
  id:              serial('id').primaryKey(),
  listId:          integer('list_id').notNull().references(() => trackerLists.id, { onDelete: 'cascade' }),
  songTitle:       text('song_title').notNull(),
  sheetType:       varchar('sheet_type', { length: 5 }).notNull().default('DX'),   // 'DX'|'STD'
  sheetDifficulty: varchar('sheet_difficulty', { length: 10 }).notNull(),           // 'BAS'|'ADV'|'EXP'|'MAS'|'REMAS'
  targetScore:     text('target_score'),    // e.g. "100.5000" — NULL = no goal
  notes:           text('notes'),
  sortOrder:       integer('sort_order').default(0),
  achievedAt:      timestamp('achieved_at'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
});

/**
 * Today's Session — the persisted play queue.
 * Each row is one chart in the current session.
 * Cleared with a "Clear All" action (DELETE all rows).
 */
export const sessionItems = pgTable('session_items', {
  id:              serial('id').primaryKey(),
  songTitle:       text('song_title').notNull(),
  sheetType:       varchar('sheet_type', { length: 5 }).notNull().default('DX'),
  sheetDifficulty: varchar('sheet_difficulty', { length: 10 }).notNull(),
  played:          boolean('played').default(false),
  sortOrder:       integer('sort_order').default(0),
  addedAt:         timestamp('added_at').notNull().defaultNow(),
});

export type InsertTrackerList = typeof trackerLists.$inferInsert;
export type SelectTrackerList = typeof trackerLists.$inferSelect;
export type InsertTrackerItem = typeof trackerItems.$inferInsert;
export type SelectTrackerItem = typeof trackerItems.$inferSelect;
export type InsertSessionItem = typeof sessionItems.$inferInsert;
export type SelectSessionItem = typeof sessionItems.$inferSelect;

// ── Chart Statistics ─────────────────────────────────────────────────────────

/**
 * Aggregate play count per chart × version.
 * One row per (song × difficulty × type × version).
 * Allows tracking "how many times did I play this chart in CiRCLE vs CiRCLE PLUS".
 */
export const chartStats = pgTable('chart_stats', {
  id:          serial('id').primaryKey(),
  songTitle:   text('song_title').notNull(),
  difficulty:  varchar('difficulty', { length: 10 }).notNull(),
  songType:    varchar('song_type', { length: 5 }).notNull().default('DX'),
  version:     text('version').notNull(), // e.g. '26500' = CiRCLE PLUS
  playCount:   integer('play_count').notNull().default(0),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqueChartVersion: unique('unique_chart_version').on(
    t.songTitle, t.difficulty, t.songType, t.version
  ),
}));

/**
 * Score improvement snapshots.
 * A new row is inserted whenever a sync detects a chart score has improved.
 * This builds a full progression history: 99.2% → 99.8% → 100.2%.
 */
export const scoreHistory = pgTable('score_history', {
  id:          serial('id').primaryKey(),
  songTitle:   text('song_title').notNull(),
  difficulty:  varchar('difficulty', { length: 10 }).notNull(),
  songType:    varchar('song_type', { length: 5 }).notNull().default('DX'),
  achievement: text('achievement').notNull(),   // e.g. "99.8000"
  dxScore:     integer('dx_score'),
  fc:          varchar('fc', { length: 5 }),
  fs:          varchar('fs', { length: 5 }),
  rating:      integer('rating'),               // Computed at snapshot time
  recordedAt:  timestamp('recorded_at').notNull().defaultNow(),
});

export type InsertChartStats = typeof chartStats.$inferInsert;
export type SelectChartStats = typeof chartStats.$inferSelect;
export type InsertScoreHistory = typeof scoreHistory.$inferInsert;
export type SelectScoreHistory = typeof scoreHistory.$inferSelect;

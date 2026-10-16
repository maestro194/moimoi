---
title: Database Schema
createdAt: '2026-10-16T03:25:11.597Z'
updatedAt: '2026-10-16T03:25:11.597Z'
description: All Neon Postgres tables and their purpose
tags:
  - database
  - schema
---
# Database Schema

All tables live in Neon Postgres. Schema defined in `lib/db/schema.ts`.

## Core Tables

### `scores`
Best score per chart. Unique on `(song_title, difficulty, song_type)`.
- `achievement` (text) — e.g. "100.5000"
- `dx_score` (int), `fc` (FC/FC+/AP/AP+), `fs` (FS/FS+/FDX/FDX+)
- `song_type`: `DX` | `STD`
- `difficulty`: BAS/ADV/EXP/MAS/REMAS/UTAGE

### `play_log`
Chronological play history scraped from maimai NET `/record/`.
- Same fields as `scores` plus: `track` (int 1–4), `played_at` (exact timestamp)
- `details` (jsonb) — full note breakdown. Schema: `{ tap, hold, slide, touch, break }` where break has 8-tier breakdown: `{ cp, p_high, p_low, g_high, g_mid, g_low, good, miss }`

### `settings`
Key-value store.
- Keys: `clal` (session cookie), `region` (intl/JP), `segaId`, `segaPassword`, `lastSync`

### `songs`
Canonical song database. PK: `title`. Seeded from otoge-db + dxrating via `POST /api/refresh-songs`.
- STD levels: `lev_bas`, `lev_adv`, `lev_exp`, `lev_mas`, `lev_remas`, `lev_utage`
- DX levels: `dx_lev_bas`, `dx_lev_adv`, `dx_lev_exp`, `dx_lev_mas`, `dx_lev_remas`
- Internal (decimal) levels: `lev_bas_i` … `dx_lev_remas_i`
- `jp` / `intl` (bool), `version` (int), `catcode`, `bpm`, `image_url`, `sheets` (jsonb)

### `score_history`
Improvement snapshots. New row whenever sync detects a higher achievement.
- `achievement`, `dx_score`, `fc`, `fs`, `rating` (computed at snapshot time), `recorded_at`

### `chart_stats`
Aggregate play count per `(song_title, difficulty, song_type, version)`.
- `play_count` (int), `updated_at`

## Tracker Tables

### `score_trackers` / goals
Target achievement per `(song_title, difficulty, song_type)`. Auto-cleared on sync when target is reached.

### `tracker_lists`
Named playlists: `name`, `emoji`, `color`, `sort_order`.

### `tracker_items`
Charts inside a list. Fields: `list_id` FK, `song_title`, `sheet_type`, `sheet_difficulty`, `target_score` (nullable), `notes`, `sort_order`, `achieved_at`.

### `session_items`
Today's arcade play queue. Fields: `song_title`, `sheet_type`, `sheet_difficulty`, `played` (bool), `sort_order`.

## Tag Tables

### `tag_groups`
Color-coded groupings (e.g. Technical, Physical). Fields: `name`, `color` (hex), `sort_order`.

### `tags`
Individual tag labels. Fields: `name`, `description`, `group_id` FK.

### `tag_songs`
Per-chart tag assignment. Unique on `(tag_id, song_title, sheet_type, sheet_difficulty)`.

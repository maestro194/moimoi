# moimoi — Technical Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Song Database & Caching](#song-database--caching)
4. [Rating Calculation](#rating-calculation)
5. [maimai NET Sync](#maimai-net-sync)
6. [API Routes](#api-routes)
7. [Pages & Components](#pages--components)
8. [Environment Variables](#environment-variables)
9. [Vercel Deployment](#vercel-deployment)
10. [Known Limitations](#known-limitations)

---

## Architecture Overview

```
Browser ──→ Next.js App Router (Vercel Edge)
                │
                ├── Static pages:  /, /scores, /songs, /analysis
                │     └── Fetch songs + scores from Neon at build / request time
                │
                └── API routes (server-only):
                      ├── /api/sync          — scrapes maimai NET, stores scores
                      ├── /api/settings      — reads/writes credentials in DB
                      ├── /api/refresh-songs — fetches otoge-db, upserts song_cache
                      ├── /api/clear-data    — wipes scores + play_log
                      └── /api/validate-session — checks if session cookie is live
```

### Data flow

```
maimai NET ──(scrape)──→ /api/sync ──→ Neon DB (scores, play_log)
                                           │
otoge-db (GitHub) ──→ /api/refresh-songs ─┤
                       or auto-bootstrap   │
                                           ▼
                                  song_cache table
                                           │
                              Neon ◄───────┘
                                │
                    Next.js pages read songs + scores
                                │
                          computeRating()
                                │
                          Dashboard / Scores / Analysis UI
```

---

## Database Schema

All tables live in a single Neon Postgres database, managed by [Drizzle ORM](https://orm.drizzle.team/).

### `scores`

Stores the **best known score** for each (song, difficulty) pair. Updated on sync if the new achievement is higher.

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial PK | |
| `song_title` | text | Exact title from maimai NET |
| `difficulty` | varchar(10) | `BAS` / `ADV` / `EXP` / `MAS` / `REMAS` |
| `achievement` | numeric(10,4) | e.g. `100.5000` |
| `dx_score` | integer | nullable |
| `fc` | varchar(5) | `FC` / `FC+` / `AP` / `AP+` / null |
| `fs` | varchar(5) | `FS` / `FS+` / `FDX` / `FDX+` / `SYNC` / null |
| `played_at` | timestamp | When this score was recorded |
| `created_at` | timestamp | Row insertion time |

### `play_log`

Chronological play history scraped from `/record/`. Each row is one play (not deduplicated).

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial PK | |
| `song_title` | text | |
| `difficulty` | varchar(10) | |
| `achievement` | numeric(10,4) | |
| `dx_score` | integer | nullable |
| `fc` | varchar(5) | nullable |
| `fs` | varchar(5) | nullable |
| `track` | integer | Track number in a credit (1–4) |
| `played_at` | timestamp | Exact time from maimai NET |
| `created_at` | timestamp | |

### `settings`

Key-value store for user configuration and credentials.

| Key | Value |
|-----|-------|
| `clal` | Session cookie (JP) or `_t=…; userId=…` (intl) |
| `region` | `intl` or `jp` |
| `version` | Manual version override (optional) |
| `sega_id` | SEGA ID (for future auto-login) |
| `sega_password` | SEGA password (for future auto-login) |
| `last_sync` | ISO timestamp of last successful sync |

### `song_cache`

Persistent copy of the otoge-db song list. Avoids re-fetching GitHub on every cold start.

| Column | Type | Notes |
|--------|------|-------|
| `title` | text PK | Song title (unique key) |
| `sort` | text | Numeric sort key from otoge-db |
| `title_kana` | text | Kana reading (used for romaji search) |
| `artist` | text | |
| `catcode` | text | Genre code |
| `version` | text | Numeric version code e.g. `26500` |
| `bpm` | text | |
| `image_url` | text | Jacket filename (relative to otoge-db CDN) |
| `lev_bas/adv/exp/mas/remas` | text | Display level strings |
| `lev_bas_i … lev_remas_i` | text | Internal (chart constant) decimal strings |
| `intl` | text | `"1"` if song is on the international server |
| `date_added` | text | |
| `cached_at` | timestamp | When this row was last upserted |

---

## Song Database & Caching

### Source

Song data comes from [zvuc/otoge-db](https://github.com/zvuc/otoge-db):
- `music-ex-intl.json` — international server song list
- `music-ex.json` — full JP song list (used to fill missing CiRCLE-era songs)

### Field normalization

Both databases use `dx_lev_*` prefixes for DX-type charts (all modern songs). The `normalizeSong()` function in [`lib/song-db.ts`](lib/song-db.ts) maps these to the `lev_*` fields used throughout the app:

```ts
lev_exp_i = song.lev_exp_i ?? song.dx_lev_exp_i
```

### 3-tier cache

```
Request → In-memory (5 min TTL)
        → Neon song_cache (persistent)
        → GitHub fetch + auto-persist (bootstrap / stale detection)
```

**Stale detection:** If >50% of rows in `song_cache` have null internal levels (indicating pre-normalization data), the cache is treated as stale and GitHub is re-fetched automatically.

**Manual refresh:** Settings → Song Database → **Refresh Song DB** calls `POST /api/refresh-songs`, which force-fetches GitHub, normalizes all songs, and upserts them into `song_cache` in batches of 200.

---

## Rating Calculation

Implemented in [`lib/rating.ts`](lib/rating.ts).

### Formula

```
rating = floor(internalLevel × achievement × factor)
```

### Rank factors

| Rank | Min achievement | Factor |
|------|----------------|--------|
| SSS+ | 100.5% | 0.224 |
| SSS  | 100.0% | 0.222 |
| SS+  | 99.5%  | 0.216 |
| SS   | 99.0%  | 0.213 |
| S+   | 98.0%  | 0.211 |
| S    | 97.0%  | 0.208 |
| AAA  | 94.0%  | 0.200 |
| AA   | 90.0%  | 0.188 |
| A    | 80.0%  | 0.168 |
| BBB  | 75.0%  | 0.152 |
| BB   | 70.0%  | 0.136 |
| B    | 60.0%  | 0.120 |
| C    | 50.0%  | 0.096 |
| D    | 0%     | 0.000 |

### Pool logic

- **New pool (B15):** songs with `version >= currentVersion - 500` (current + last major version)
- **Old pool (B35):** all other songs

`currentVersion` is auto-detected as the highest version number with ≥20 songs in the database.

### Deduplication

Before pool filtering, scores are deduplicated to keep only the **best score per (song, difficulty)**. This prevents the same song appearing multiple times in the rating list.

---

## maimai NET Sync

Implemented in [`lib/maimai-sync.ts`](lib/maimai-sync.ts) and triggered by `POST /api/sync`.

### How it works

1. Reads the session cookie from the `settings` table
2. Fetches score pages from `maimaidx-eng.com` (intl) or `maimaidx.jp` (JP):
   - `/record/musicGenre/search/?genre=99&diff=0` (BAS) … `diff=4` (REMAS) + `diff=10` (UTAGE)
3. Parses HTML with string matching (no DOM library) to extract title, achievement, FC/FS
4. Upserts into `scores` table (only updates if new achievement is higher)
5. Also fetches `/record/` for the recent play log and upserts into `play_log`

### Session cookie format

| Region | Cookie format |
|--------|--------------|
| International | `_t=<token>; userId=<id>` |
| Japan | `clal=<token>` |

---

## API Routes

All routes are under `app/api/`.

### `POST /api/sync`

Triggers a full score sync from maimai NET.

**Response:**
```json
{ "ok": true, "synced": 42, "lastSync": "2025-07-01T12:00:00.000Z" }
```

### `GET /api/settings`

Returns current settings (credentials are masked with `•••`).

### `POST /api/settings`

Saves settings. Only provided fields are updated (undefined = keep existing).

**Body:**
```json
{
  "clal": "_t=xxx; userId=yyy",
  "region": "intl",
  "version": "",
  "segaId": "user@example.com",
  "segaPassword": "hunter2"
}
```

### `POST /api/refresh-songs`

Force-fetches song data from GitHub and re-populates `song_cache`.

**Response:**
```json
{ "ok": true, "count": 1823 }
```

### `DELETE /api/clear-data`

Deletes all rows from `scores` and `play_log`. Credentials and settings are preserved.

**Response:**
```json
{ "ok": true }
```

### `GET /api/validate-session`

Checks if the stored session cookie can authenticate against maimai NET.

**Response:**
```json
{ "valid": true, "debug": "HTTP 200 from maimai NET" }
```

---

## Pages & Components

### `/` — Dashboard

- Shows total rating, new/old split, top 5 new and old charts
- Sync button triggers `POST /api/sync`
- Rendered server-side; fetches scores and songs from Neon

### `/scores` — Score List

- All tracked scores with grid/list view toggle
- Filter: difficulty, pool (new/old/all)
- Sort: rating, achievement, title
- Grid cards: album art, difficulty-coloured border, chart constant badge (top-right), FC/FS badges, rating

### `/songs` — Song Explorer

- Full song database browser
- Search: title, artist, or romaji transliteration of `title_kana`
- Sort: newest / oldest / level ↑↓ / title A–Z
- Filter: version, level group (12 / 12+ / 13 …), genre
- Grid view: square album art cards with MAS constant badge

### `/analysis` — Rating Analysis

- Bar charts for new and old pools
- Per-difficulty breakdown
- Shows potential rating if all songs were SSS+

### `/recent` — Play History

- Chronological play log from `play_log` table
- Shows track number, difficulty, achievement, FC/FS

### `/settings` — Settings

- Session cookie input (masked)
- Region toggle (intl / JP)
- Version override
- Song Database refresh button
- Danger Zone: clear all score data

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon Postgres connection string |

No other environment variables are required. User credentials (session cookie) are stored in the database itself.

---

## Vercel Deployment

### Steps

1. Push repository to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) → Import Git Repository
3. Select the `moimoi` repository
4. Under **Environment Variables**, add:
   - `DATABASE_URL` = your Neon connection string
5. Click **Deploy**

### Neon + Vercel integration

Alternatively, use the native integration:
- Vercel Dashboard → **Storage** → Connect to Neon
- This automatically injects `DATABASE_URL` into all environments

### Build settings

Default Next.js build settings work out of the box. No custom `vercel.json` is needed.

### Cold start behaviour

On the very first request after deployment:
1. `song_cache` table is empty → app fetches from GitHub automatically
2. Songs are persisted to Neon in the background
3. Subsequent requests serve from Neon (fast)

After the first request, click **Settings → Refresh Song DB** to ensure the latest song data is in the database.

---

## Known Limitations

| Limitation | Notes |
|------------|-------|
| **UTAGE scores** | Scraped but internal levels are not always available in otoge-db; chart constant shows `?` |
| **STD charts** | Older Standard-mode charts are in the DB but not distinguished from DX charts in the UI |
| **Auto-login** | SEGA ID / password fields are stored but auto-login is not yet implemented; session cookie must be set manually |
| **Rate limiting** | No built-in throttling on sync; rapid syncing may trigger maimai NET rate limits |
| **Vercel free tier** | Neon free tier allows 0.5 GB storage and 190 compute hours/month, which is sufficient for personal use |

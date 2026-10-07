# moimoi — Technical Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Song Database & Caching](#song-database--caching)
4. [Rating Calculation](#rating-calculation)
5. [Accuracy & Judgement Loss Calculation](#accuracy--judgement-loss-calculation)
6. [maimai NET Sync](#maimai-net-sync)
7. [API Routes](#api-routes)
8. [Pages & Components](#pages--components)
9. [Environment Variables](#environment-variables)
10. [Vercel Deployment](#vercel-deployment)
11. [Known Limitations](#known-limitations)

---

## Architecture Overview

```
Browser ──→ Next.js App Router (Vercel Edge)
                │
                ├── Static pages:  /, /scores, /songs, /analysis, /recent, /tracker
                │     └── Fetch songs + scores from Neon at build / request time
                │
                └── API routes (server-only):
                      ├── /api/sync          — scrapes maimai NET, stores scores
                      ├── /api/recent-plays  — returns recent plays with hydrated details & solver
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
| `difficulty` | varchar(10) | `BAS` / `ADV` / `EXP` / `MAS` / `REMAS` |
| `song_type` | varchar(5) | `STD` / `DX` (default `DX`) |
| `achievement` | numeric(10,4) | |
| `dx_score` | integer | nullable |
| `fc` | varchar(5) | nullable |
| `fs` | varchar(5) | nullable |
| `track` | integer | Track number in a credit (1–4) |
| `details` | jsonb | Detailed note judgments (`tap`, `hold`, `slide`, `touch`, `break`, `fast`, `late`). Break counts include mathematically solved sub-tiers (`p_high`, `p_low`, `g_high`, `g_mid`, `g_low`) and original scraped counts under `raw` |
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

## Accuracy & Judgement Loss Calculation

Implemented in [`lib/accuracy-solver.ts`](lib/accuracy-solver.ts).

### Theoretical Score Model

In maimai DX, the maximum attainable achievement on any chart is **101.0000%**, comprised of:
- **Base Score (100.0000%)**: Proportional to note weights across the chart.
  - Weights:
    - Tap: $1$
    - Hold: $2$
    - Slide: $3$
    - Touch: $1$
    - Break: $5$
  - Total Base Weight: $W_{\text{base}} = N_{\text{tap}} + 2 N_{\text{hold}} + 3 N_{\text{slide}} + N_{\text{touch}} + 5 N_{\text{break}}$
  - Base Unit Weight: $U = \frac{100\%}{W_{\text{base}}}$
- **Break Bonus Score (1.0000%)**: Distributed evenly among Break notes.
  - Break Bonus per note: $B = \frac{1\%}{N_{\text{break}}}$

### Note Loss Deductions

Achievement is calculated by deducting judgment losses from $101.0000\%$:

| Note Type | Judgment | Base Loss | Bonus Loss | Total Loss |
|-----------|----------|-----------|------------|------------|
| **Tap / Touch** | CP / Perfect | $0$ | — | $0$ |
| | Great | $0.2 \times U$ | — | $0.2 \times U$ |
| | Good | $0.5 \times U$ | — | $0.5 \times U$ |
| | Miss | $1.0 \times U$ | — | $1.0 \times U$ |
| **Hold** | CP / Perfect | $0$ | — | $0$ |
| | Great | $0.4 \times U$ | — | $0.4 \times U$ |
| | Good | $1.0 \times U$ | — | $1.0 \times U$ |
| | Miss | $2.0 \times U$ | — | $2.0 \times U$ |
| **Slide** | CP / Perfect | $0$ | — | $0$ |
| | Great | $0.6 \times U$ | — | $0.6 \times U$ |
| | Good | $1.5 \times U$ | — | $1.5 \times U$ |
| | Miss | $3.0 \times U$ | — | $3.0 \times U$ |
| **Break** | Critical Perfect (2600) | $0$ | $0$ | $0$ |
| | Perfect High (2550) | $0$ | $0.25 \times B$ | $0.25 \times B$ |
| | Perfect Low (2500) | $0$ | $0.50 \times B$ | $0.50 \times B$ |
| | Great High (2000) | $1.0 \times U$ | $0.60 \times B$ | $1.0 \times U + 0.60 \times B$ |
| | Great Mid (1500) | $2.0 \times U$ | $0.60 \times B$ | $2.0 \times U + 0.60 \times B$ |
| | Great Low (1250) | $2.5 \times U$ | $0.60 \times B$ | $2.5 \times U + 0.60 \times B$ |
| | Good (1000) | $3.0 \times U$ | $0.70 \times B$ | $3.0 \times U + 0.70 \times B$ |
| | Miss (0) | $5.0 \times U$ | $1.00 \times B$ | $5.0 \times U + 1.00 \times B$ |

### maimai NET Limitation & Residual Loss Solver

maimai NET HTML only reports aggregated counts:
- Break Perfect ($P = P_{\text{high}} + P_{\text{low}}$)
- Break Great ($G = G_{\text{high}} + G_{\text{mid}} + G_{\text{low}}$)

A naive assumption (treating all Break Perfects as $P_{\text{high}}$ and all Break Greats as $G_{\text{high}}$) underestimates score loss, creating errors as large as $+0.54\%$ on break-heavy charts.

**The Residual Solver Algorithm (`solvePlayDetails`):**
1. Computes deterministic non-break losses (Tap, Hold, Slide, Touch) and exact Break Good/Miss losses:
   $$\text{KnownLoss} = \text{Loss}_{\text{non-break}} + \text{Loss}_{\text{break Good/Miss}}$$
2. Calculates the remaining Break $P$ and $G$ residual loss from the player's true in-game achievement:
   $$\text{TargetBreakPGLoss} = 101.0000\% - \text{achievement} - \text{KnownLoss}$$
3. Evaluates all valid integer partitions of $(P_{\text{high}}, P_{\text{low}})$ and $(G_{\text{high}}, G_{\text{mid}}, G_{\text{low}})$ that sum to the scraped counts:
   $$\sum \text{BreakLoss}(P, G) \approx \text{TargetBreakPGLoss}$$
4. Finds the partition that minimizes residual distance. Because Break counts per chart are small ($\le 30$ notes), the search runs in under $0.1\,\text{ms}$ and yields **$0.0000\%$ discrepancy** with the in-game score.
5. Persists the solved partition into `play_log.details.break` while keeping the original unpartitioned numbers safe under `details.break.raw`.

---

## maimai NET Sync

Implemented in [`lib/maimai-sync.ts`](lib/maimai-sync.ts) and triggered by `POST /api/sync`.

### How it works

1. Reads the session cookie from the `settings` table
2. Fetches score pages from `maimaidx-eng.com` (intl) or `maimaidx.jp` (JP):
   - `/record/musicGenre/search/?genre=99&diff=0` (BAS) … `diff=4` (REMAS) + `diff=10` (UTAGE)
3. Parses HTML with string matching (no DOM library) to extract title, achievement, FC/FS
4. Upserts into `scores` table (only updates if new achievement is higher)
5. Also fetches `/record/` for the recent play log (up to 50 plays)
6. Scrapes detailed play breakdowns from `/record/playlogDetail/?idx=...`
7. Automatically runs `solvePlayDetails()` on each play's breakdown to mathematically partition Break sub-tiers before upserting into `play_log`

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

### `GET /api/recent-plays`

Fetches recent play history records with full song metadata, chart constants, and solved judgment breakdown details.

**Query Parameters:**
- `limit` (optional, default `10`, maximum `50`): Number of recent plays to fetch.

**Response:**
```json
{
  "scores": [
    {
      "id": 2077,
      "songTitle": "TiamaT:F minor",
      "difficulty": "MAS",
      "songType": "DX",
      "achievement": "99.8765",
      "dxScore": 3210,
      "fc": "FC",
      "fs": null,
      "track": 1,
      "playedAt": "2026-10-06T15:30:00.000Z",
      "details": {
        "tap": { "cp": 400, "p": 50, "gr": 3, "go": 0, "miss": 0 },
        "hold": { "cp": 50, "p": 5, "gr": 0, "go": 0, "miss": 0 },
        "slide": { "cp": 80, "p": 10, "gr": 1, "go": 0, "miss": 0 },
        "touch": { "cp": 30, "p": 2, "gr": 0, "go": 0, "miss": 0 },
        "break": {
          "cp": 12,
          "p_high": 2,
          "p_low": 1,
          "g_high": 1,
          "g_mid": 0,
          "g_low": 0,
          "good": 0,
          "miss": 0,
          "solved": true,
          "raw": { "p_high": 3, "p_low": 0, "g_high": 1, "g_mid": 0, "g_low": 0 }
        },
        "solvedLosses": { ... }
      },
      "song": { "title": "TiamaT:F minor", "artist": "...", "image_url": "...", "intl": "1" },
      "internalLevel": 14.7
    }
  ]
}
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
- Sort: newest / oldest / level ↑↓ / BPM ↑↓ / title A–Z / most tagged
- Filter: version, level group (12 / 12+ / 13 …), genre, tags
- Clicking any chart row opens the **Song Details modal**
- Clicking the level number opens the **Chart Action modal** (add goal / session / list)

### Song Details Modal (`SongDetailsModal`)

Shared modal used on both the Songs page and the Tracker page (all three tabs). Opens by clicking the album art jacket on any chart card.

**Shows:**
- Album jacket, title, artist, chart type badge (DX / STD), difficulty badge, internal level
- Community and personal tags with inline add / remove
- Song details: genre, BPM, version name, chart designer
- Note counts: Tap / Hold / Slide / Touch / Break / Total
- Regional availability: JP / INTL / USA / CN

**Version label resolution** (`lib/version-label.ts`): version numbers are stored as arbitrary integers in a range (e.g. `26043` for a CiRCLE song). The shared `versionLabel()` utility uses a sorted threshold array — first threshold the version number is ≥ wins — so every song correctly resolves to its version name regardless of the exact number.

### `/tracker` — The Board

- Three tabs: **Session**, **Goals**, **Lists**
- **Session:** play queue for an arcade visit; check off songs as played
- **Goals:** target-achievement tracker with rating delta calculation; clicking a card opens the goal detail popup
- **Lists:** permanent custom folders (emoji + name)
- **Song Details:** clicking the album art jacket on any card in any tab opens the Song Details modal (see above). On Goals cards, a hoverable ⓘ button in the top-right corner also triggers it without dismissing the goal detail popup.

### `/analysis` — Rating Analysis

- Bar charts for new and old pools
- Per-difficulty breakdown
- Shows potential rating if all songs were SSS+

### `/recent` — Play History

- Chronological play log from `play_log` table
- Cards showing track number, difficulty, achievement, FC/FS, and DX score
- Detailed note breakdown displaying Tap, Hold, Slide, Touch, and Break counts
- Mathematically solved Break sub-tiers (P-High / P-Low / G-High / G-Mid / G-Low) guaranteed to match actual in-game achievement with 0.0000% error

### `/settings` — Settings

- Session cookie input (masked)
- Region toggle (intl / JP)
- Version override
- Song Database refresh button
- Danger Zone: clear all score data

### `/debug` & `/debug/song-details` — Debug Sandboxes *(dev only)*

- `/debug`: Interactive accuracy loss comparison sandbox. Compares the **Theoretical Right Value** (residual-solved exact loss), **Currently Used Naive** calculation (unpartitioned maimai NET counts), and **Brute Force Solver**. Includes a live 10-score test suite with diff tables and metric comparisons.
- `/debug/song-details`: Development sandbox used to prototype and verify Tracker page and modal features before they are applied to the real `/tracker` route. Uses live DB data so previews are faithful to production. Not linked in navigation on production builds.

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

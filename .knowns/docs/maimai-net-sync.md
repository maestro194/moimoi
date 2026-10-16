---
title: maimai NET Sync
createdAt: '2026-10-16T03:25:11.202Z'
updatedAt: '2026-10-16T03:25:11.202Z'
description: Score sync system — how it scrapes maimaidx.net and persists data
tags:
  - sync
  - scraping
---
# maimai NET Sync

Implemented in `lib/maimai-sync.ts`. Triggered by `POST /api/sync`.

## Flow
1. Reads SEGA ID + password from `settings` table in Neon
2. Logs into `maimaidx-eng.com` (INTL) or `maimaidx.jp` (JP)
3. Fetches score pages per difficulty (BAS/ADV/EXP/MAS/REMAS + UTAGE) using `genre=99` search
4. Parses HTML with cheerio — extracts title, achievement, dxScore, fc, fs
5. Upserts `scores` table — only updates if new achievement is **higher**
6. Fetches `/record/` for recent play log (up to ~50 plays)
7. For each play, fetches the detail page to parse note breakdown (tap/hold/slide/touch/break counts)
8. Solves Break sub-tiers (p_high/p_low/g_high/g_mid/g_low) via `lib/accuracy-solver.ts` and persists
9. Increments `chart_stats.play_count` per version
10. Inserts `score_history` snapshot if score improved
11. Auto-clears goals (`score_trackers`) when target achievement is reached

## Break Note Parsing
The game HTML only shows **aggregate** Perfect and Great counts for Break notes, not the sub-tier breakdown.
Sub-tiers are reverse-engineered using the accuracy solver (see `@doc/accuracy-loss-calculator`).

Break schema stored in `play_log.details.break`:
```json
{ "cp": 0, "p_high": 3, "p_low": 1, "g_high": 2, "g_mid": 0, "g_low": 0, "good": 0, "miss": 1 }
```

## Region Config
| Region | Cookie | URL |
|--------|--------|-----|
| INTL | `_t=<token>; userId=<id>` | maimaidx-eng.com |
| JP | `clal=<token>` | maimaidx.jp |

Region stored in `settings` table. Switching region requires re-syncing.

## Song Title Normalization
NFKC normalization applied to all scraped titles to handle encoding differences between the game HTML and otoge-db song names.

## Backfill Script
`scripts/backfill-solved-breakdowns.ts` — re-runs the accuracy solver on all existing `play_log` rows that have aggregate break counts but no sub-tier breakdown. Run with `npx ts-node scripts/backfill-solved-breakdowns.ts`.

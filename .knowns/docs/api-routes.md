---
title: API Routes
createdAt: '2026-10-16T03:25:11.202Z'
updatedAt: '2026-10-16T03:25:11.202Z'
description: All API endpoints and their behavior
tags:
  - api
---
# API Routes

All routes under `app/api/`. All are dynamic (server-rendered on demand).

## Sync & Data

### `POST /api/sync`
Triggers full score sync from maimai NET.
- Reads SEGA credentials from DB, scrapes maimaidx.net, upserts scores + play_log
- Returns `{ ok: true, synced: N, lastSync: ISO }`

### `GET /api/songs`
Returns full songs list. Cached 1h, stale up to 1 year.
- Used by Songs page client-side cache (`songs-client.tsx`)

### `POST /api/refresh-songs`
Force-fetches song data from otoge-db GitHub and repopulates `songs` table.
- Returns `{ ok: true, count: N }`

### `DELETE /api/clear-data`
Deletes all rows from `scores` and `play_log`. Settings/credentials preserved.
- Returns `{ ok: true }`

### `GET /api/validate-session`
Checks if stored session cookie can authenticate against maimai NET.
- Returns `{ valid: true/false, debug: "HTTP 200..." }`

## Settings

### `GET /api/settings`
Returns current settings. Credentials masked with `***`.

### `POST /api/settings`
Saves settings. Only provided fields updated (undefined = keep existing).
- Body: `{ segaId, segaPassword, region, version, clal }`
- Bug fixed (da57eae): previously overwrote `region` when saving SEGA credentials.

## Tracker

### `GET /api/board`
Returns tracker board data: session items, goals, lists + items, song map.

### `GET /api/recent-plays`
Returns recent plays with hydrated note breakdowns. Added in 34caa9a.

### `GET /api/chart-plays`
Returns leaderboard + play count for a specific chart.
- Query params: `title`, `difficulty`, `type`

## Tags

### `GET /api/tags`
Returns all tag groups with their tags.

### `POST /api/tags/attach`
Attaches a tag to a chart (song + type + difficulty).

### `GET /api/tags/combined`
Returns tags combined with user's personal tags for a chart.

### `GET /api/tags/groups`
Returns tag group list.

## Development (in-dev, untracked)

### `GET /api/b50-image`
Generates B50 card image as PNG using `@napi-rs/canvas`.
Preview available at `/debug`. Not committed to main branch.

---
title: Pages and Features
createdAt: '2026-10-16T03:25:11.202Z'
updatedAt: '2026-10-16T03:25:11.202Z'
description: All pages, UI features, and components implemented
tags:
  - ui
  - features
---
# Pages and Features

## `/` — Dashboard
- Total rating display, B15/B35 split
- Top 5 new and old songs
- Sync button → `POST /api/sync`
- Server-rendered; fetches scores and songs from Neon

## `/scores` — Score List
- All tracked scores, grid and list view toggle
- Filter: difficulty, pool (new/old/all)
- Sort: rating, achievement, title
- **B50 view**: horizontal cards matching reference designs
- **Matrix view**: chart constant grid per song (added 1e6adb3)
- Clicking a chart opens ChartDetailDrawer

## `/songs` — Song Explorer
- Full song database browser (~15k songs)
- Search: title, artist, romaji transliteration of `title_kana`
- Sort: newest/oldest/level ↑↓/BPM ↑↓/title A–Z/most tagged
- Filter: version, level group (12/12+/13…), genre, tags
- Client-side module cache for instant back-navigation
- Virtualised list (`@tanstack/react-virtual`) for performance
- Pagination: 50 per page
- Clicking chart row → Song Details modal
- Clicking level number → Chart Action modal

## `/recent` — Play History
- Chronological play log from `play_log` table
- Grouped into arcade sessions (credit groups)
- Per-play: track number, difficulty, achievement, FC/FS
- Expandable rows: full note breakdown (tap/hold/slide/touch/break)
- Break notes shown as `cp | p_high-p_low | g_high-g_mid-g_low | good | miss`
- Per-row: rating contribution, internal level, DX score / stars

## `/tracker` — The Board
Three tabs: **Session**, **Goals**, **Lists**. See `@doc/tracker-board`.

## `/analysis` — Rating Analysis
- Bar charts for new and old pools
- Per-difficulty breakdown
- Potential rating if all songs were SSS+

## `/settings` — Settings
- SEGA ID + password input (credentials masked on load)
- Region toggle (INTL / JP)
- Version override (controls B15/B35 pool boundary)
- Song DB refresh button
- Danger Zone: clear all score data

## `/docs` — Documentation Page
- In-app rendered version of DOCS.md
- `/docs/dev` — dev-focused docs page

## `/debug` — Debug Sandbox *(dev only)*
- Not linked in navigation
- B50 Image Generator preview
- Accuracy Loss Calculator (interactive note breakdown verifier)
- Prototyping ground for tracker features before going to production

## Key Shared Components

### `ChartDetailDrawer`
Drawer showing per-chart details: play count, score history, leaderboard.
Opens from score cards and song table rows.

### `SongDetailsModal`
Full song info: jacket, title, artist, chart type, difficulty, internal level,
community + personal tags, genre, BPM, version, note counts, regional availability.
Shared across Songs page and Tracker page.

### `ChartActionModal`
Unified modal for Goals, Session, Lists actions on a chart.
Triggered by clicking the level number on the Songs page.

### `PageWrapper`
Wraps all pages with consistent padding and max-width.

### `jacket.tsx`
Renders song jacket images. Falls back through CDN sources if primary fails.

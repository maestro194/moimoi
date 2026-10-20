---
id: MO-GHMA8W
title: Phase 2 — Core UI Screens
status: done
priority: medium
labels:
  - mobile ui
createdAt: '2026-10-18T17:14:26.598Z'
updatedAt: '2026-10-20T12:38:24.483Z'
completedAt: '2026-10-20T12:38:24.483Z'
timeSpent: 7745
assignee: '@me'
parent: MO-9NQPT8
---
# Phase 2 — Core UI Screens

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build the main content screens: Dashboard, Scores list, Song detail sheet, Recent plays, Settings.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dashboard: rating gauge, B35/B15 split, top songs, sync button
- [x] #2 Scores page: list with filter/sort (difficulty, pool, achievement)
- [x] #3 Song detail bottom sheet: jacket, levels, tags, chart info
- [x] #4 Recent plays: session-grouped play history with note breakdown
- [x] #5 Settings: SEGA login, region toggle, data clear
- [x] #6 Dark theme matching moimoi web colour palette
- [x] #7 Re:Master colour is #e4b7eb everywhere
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Offline Song & Data Layer: Add fetchAndCacheSongs() and fetchAndCacheRecent() in apps/mobile/db/sync.ts to populate SQLite songs and play_log tables (see @doc/maimai-net-sync)
2. Design & Palette System: Create apps/mobile/constants/Theme.ts matching @doc/pages-and-features with standardized difficulty colors (REMAS: #e4b7eb, MAS: #9f51dc, EXP: #f64861, UTAGE: #bf1b5e, etc.)
3. Dashboard Tab (apps/mobile/app/(tabs)/index.tsx): Compute B50 rating dynamically via @maimai-suite/core (see @doc/rating-calculation); render Rating Hero card with B35/B15 breakdown, sync status, and recent highlights
4. Scores Tab (apps/mobile/app/(tabs)/scores.tsx): Searchable FlatList of B50 scores; filter by pool (B35/B15) and difficulty; cards with jacket, rank badge, floored achievement %, and rating points
5. Song Detail Modal (apps/mobile/app/modal.tsx): Detail view with full jacket art, internal levels, notes breakdown, and user score stats
6. Settings Tab Polish (apps/mobile/app/(tabs)/settings.tsx): Add region selector, cache statistics, and clear local cache controls (see @doc/mobile-app-plan)
7. Verification: Typecheck with tsc, verify SQLite offline reads and rating parity with web
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented all Phase 2 core mobile screens: Dashboard with live rating gauge & B35/B15 split, Scores screen with search, pool filter, and difficulty sorting, Song detail modal, Sessions tab with credit grouping and note breakdown, and Settings with region toggle and cache management. Standardized dark theme and Re:Master color #e4b7eb everywhere.
<!-- SECTION:NOTES:END -->


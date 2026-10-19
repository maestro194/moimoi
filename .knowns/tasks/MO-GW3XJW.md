---
id: MO-GW3XJW
title: Phase 1 — Expo Scaffold and Sync Engine
status: in-progress
priority: high
labels:
  - mobile expo
createdAt: '2026-10-18T17:14:13.809Z'
updatedAt: '2026-10-19T04:55:26.889Z'
timeSpent: 0
assignee: '@me'
parent: MO-9NQPT8
---
# Phase 1 — Expo Scaffold and Sync Engine

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bootstrap the Expo app, set up SQLite with Drizzle, implement sync engine, and stub all 5 tab screens.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Expo SDK 52 app created at apps/mobile/
- [ ] #2 Expo Router v4 with 5 tab shells: Dashboard, Sessions, Scores, Arcade Mode, Settings
- [ ] #3 expo-sqlite + Drizzle ORM configured with same schema as web (packages/db-schema)
- [ ] #4 Sync engine: POST /api/sync → delta → merge into SQLite
- [ ] #5 Settings screen: SEGA ID + password input, POST /api/settings
- [ ] #6 App builds and runs on Android emulator or device
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. npx create-expo-app apps/mobile --template tabs (Expo Router v4, SDK 52)
2. Wire apps/mobile into pnpm workspace; add @maimai-suite/core as dep
3. Install expo-sqlite + drizzle-orm in mobile; create SQLite schema (sqliteTable versions of scores, songs, settings, sync_meta)
4. apps/mobile/db/client.ts — SQLite init + Drizzle instance + run migrations on open
5. apps/mobile/db/sync.ts — sync engine: POST /api/sync -> delta -> upsert SQLite; POST /api/songs -> seed songs table once
6. Settings screen: SEGA ID + password inputs -> POST EXPO_PUBLIC_API_URL/api/settings
7. 5 tab shells: Dashboard, Sessions, Scores, Arcade, Settings with correct Expo Router layout
8. apps/mobile/.env.local with EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
9. Verify pnpm --filter mobile start runs on Android emulator
<!-- SECTION:PLAN:END -->


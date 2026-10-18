---
id: MO-GW3XJW
title: Phase 1 — Expo Scaffold and Sync Engine
status: todo
priority: high
labels:
  - mobile expo
createdAt: '2026-10-18T17:14:13.809Z'
updatedAt: '2026-10-18T17:14:13.809Z'
timeSpent: 0
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


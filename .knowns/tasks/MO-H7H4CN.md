---
id: MO-H7H4CN
title: Web DB to Mobile DB Sync
status: done
priority: high
labels:
  - mobile
  - sync
  - api
createdAt: '2026-10-22T02:28:58.932Z'
updatedAt: '2026-10-22T02:38:29.073Z'
completedAt: '2026-10-22T02:38:29.073Z'
timeSpent: 366
assignee: '@me'
parent: MO-9NQPT8
---
# Web DB to Mobile DB Sync

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Direct sync between Neon Postgres (web app DB) and SQLite (mobile DB) without scraping SEGA. Allows mobile app to populate and update during maimai NET maintenance or outages.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GET /api/scores endpoint returning all scores from Neon Postgres
- [x] #2 syncFromWebDb() helper in mobile db/sync.ts syncing scores, recent plays, and songs without touching SEGA
- [x] #3 Graceful fallback in fullSync() when SEGA servers are down/unreachable
- [x] #4 Sync with Web App DB buttons in Settings and Arcade tabs
- [x] #5 Clean TypeScript compilation across mobile and web
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create GET /api/scores endpoint in apps/web/app/api/scores/route.ts returning all user scores from Neon Postgres
2. Implement syncFromWebDb() in apps/mobile/db/sync.ts to fetch scores, recent plays, and songs without touching SEGA
3. Add fallback in fullSync() when SEGA is down, reporting server offline status gracefully
4. Add dedicated "Sync with Web App DB" buttons in Settings and Arcade tabs
5. Verify compilation with tsc --noEmit and test sync data population
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented GET /api/scores endpoint, syncFromWebDb() engine in mobile sync.ts, graceful SEGA outage fallback in fullSync(), and UI buttons in Arcade and Settings tabs. Verified with curl and tsc --noEmit.
<!-- SECTION:NOTES:END -->


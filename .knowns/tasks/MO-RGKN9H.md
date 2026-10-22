---
id: MO-RGKN9H
title: Phase 3 — Arcade Mode
status: done
priority: medium
labels:
  - mobile arcade
createdAt: '2026-10-18T17:14:34.901Z'
updatedAt: '2026-10-22T02:00:25.688Z'
completedAt: '2026-10-22T02:00:25.688Z'
timeSpent: 123352
assignee: '@me'
parent: MO-9NQPT8
---
# Phase 3 — Arcade Mode

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Zero-friction arcade companion: auto session clustering (<45 min gap), between-credit quick sync with delta feedback, next target recommendations, session summary, deferred geofencing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Automatic session clustering from play timestamps (< 45m gap defines session, tracks/credits count, duration, rating delta)
- [x] #2 Quick Sync between credits with instant delta feedback (tracks just played, rating points gained, new PBs)
- [x] #3 Next target suggestions based on lowest B35/B15 charts with target score to gain rating
- [x] #4 Session summary card with net rating delta, play count, elapsed time, and PB highlights
- [x] #5 Geofencing and arcade location features grayed out / marked deferred
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Session Clustering & Delta Logic: Implement clusterSessionsFromPlayLog() and getLastCreditDiff() in apps/mobile/db/sync.ts (see @doc/mobile-app-plan)
2. Next Target Recommender: Implement getNextTargets() finding lowest B35/B15 charts and score needed for rating gain (see @doc/rating-calculation)
3. Arcade Tab UI: Build between-credits Quick Sync card, next targets, active session summary, past sessions history, and grayed-out geofencing in apps/mobile/app/(tabs)/arcade.tsx
4. Robust Network Sync: Ensure NDJSON streaming in syncScores() is handled properly for React Native
5. Verification: Verify TypeScript clean build (tsc --noEmit) and database functionality
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented multi-metric physical skill profiling (6 axes: Tap, Spin, Speed, Stamina, Tech, Accuracy), dual-mode recommendations ([Push Skillset] & [Farm Rating]), auto session clustering, last-credit delta card, and deferred geofencing. Verified with unit tests and tsc --noEmit.
<!-- SECTION:NOTES:END -->


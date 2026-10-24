---
id: MO-HSAT56
title: Manual Credit Entry for SEGA Outage
status: done
priority: high
labels:
  - mobile
  - api
  - arcade
  - db
createdAt: '2026-10-24T02:38:45.423Z'
updatedAt: '2026-10-24T03:10:44.643Z'
completedAt: '2026-10-24T03:10:34.642Z'
timeSpent: 1483
assignee: '@me'
parent: MO-9NQPT8
---
# Manual Credit Entry for SEGA Outage

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow users to manually record a played credit (3-4 tracks) into Neon Postgres and local SQLite when SEGA maimaidx.net is offline or unreachable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 POST /api/manual-credit endpoint in apps/web/app/api/manual-credit/route.ts accepting 1-4 tracks and updating play_log, scores, and score_history
- [x] #2 saveManualCredit() helper in mobile db/sync.ts updating local SQLite play_log and scores table immediately, and syncing to backend
- [x] #3 ManualCreditModal component in apps/mobile with fast song auto-complete from 1559 songs, difficulty chips, achievement keypad, and FC/FS badges
- [x] #4 Dedicated Log Credit CTA on Arcade tab (apps/mobile/app/(tabs)/arcade.tsx) and Sessions tab (apps/mobile/app/(tabs)/sessions.tsx)
- [x] #5 Instant Delta Card and Session clustering reactively reflect the newly entered credit immediately
- [x] #6 Clean TypeScript check across apps/mobile and apps/web
- [x] #7 Detailed judgment breakdown mode with CP/P/Gr/Go/Miss for Tap/Hold/Slide/Touch/Break and solver integration
- [x] #8 Tag manual plays with is_manual flag, allowing manual plays to be edited or deleted while maimaidx-fetched plays remain read-only
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Backend: Implement POST /api/manual-credit in apps/web/app/api/manual-credit/route.ts accepting 1-4 tracks with optional detailed judgments (tap/hold/slide/touch/break), running solvePlayDetails to resolve break sub-tiers, and updating play_log, scores, score_history, and chart_stats.
2. Mobile Engine: Add saveManualCredit() in apps/mobile/db/sync.ts supporting offline-first SQLite insertion and Neon sync.
3. Mobile UI: Build ManualCreditModal with:
   - Track tabs (1..4)
   - Song auto-complete from 1559 songs with chart constants
   - Quick Mode (Achievement % + FC/FS)
   - Detailed Breakdown Mode: interactive grid for Tap, Hold, Slide, Touch, Break (CP, P, Gr, Go, Miss) + Fast/Late
   - Real-time solver integration using solvePlayDetails() to calculate 8-tier Break breakdown and DX Score
4. Screen Integration: Add 'Log Credit (Manual)' CTA on Arcade Tab (arcade.tsx) and Sessions Tab (sessions.tsx).
5. Verification: Type-check mobile and web, test manual credit logging with solver, and verify reactive Delta Card & Sessions.
<!-- SECTION:PLAN:END -->


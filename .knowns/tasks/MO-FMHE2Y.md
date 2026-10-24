---
id: MO-FMHE2Y
title: 'Web Manual Score Input & Robust Missing Data Handling'
status: done
priority: medium
labels:
  - web,api,db
createdAt: '2026-10-24T03:59:48.713Z'
updatedAt: '2026-10-24T04:29:50.319Z'
completedAt: '2026-10-24T04:29:50.319Z'
timeSpent: 1621
assignee: '@me'
---
# Web Manual Score Input & Robust Missing Data Handling

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement manual credit & score input on the web app using the shared /api/manual-credit endpoint, with full missing data handling, live 8-tier solver, and manual play edit/delete controls on /recent and /debug/song-details
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shared ManualCreditModalWeb component with 1,559-song autocomplete, Quick Mode & Detailed Matrix, and live 8-tier Break solver
- [x] #2 Prototype and verify on /debug/song-details per tracker-debug-rules before connecting to recent/tracker pages
- [x] #3 Wire Log Credit (Manual) CTA and [MANUAL] tag with Edit/Delete buttons into apps/web/app/recent/recent-client.tsx
- [x] #4 Robust missing data handling across null details, missing touch notes, missing DX score, missing timing, unseeded songs, and PB restoration on delete
- [x] #5 Read-only protection ensuring maimaidx-fetched plays cannot be edited or deleted
- [x] #6 Clean TypeScript check across apps/web and apps/mobile
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Missing Data Architecture: Define strict fallbacks and validations across null note details, charts without touch notes, missing DX score, missing fast/late, unseeded songs, and PB restoration upon play deletion.
2. Web Component (apps/web/components/manual-credit-modal.tsx): Build responsive dialog with track tabs (1-4), 1,559-song autocomplete, Quick vs Detailed matrix, and live 8-tier Break solver.
3. Debug Prototyping (apps/web/app/debug/): Mount and verify Manual Credit Modal on /debug/song-details per tracker-debug-rules.
4. Recent Plays Integration (apps/web/app/recent/recent-client.tsx): Add Log Credit CTA, [MANUAL] badge, and Edit/Delete controls for manual plays.
5. Verification: Test all missing data scenarios, verify read-only protection for maimaidx plays, and run TypeScript check.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented ManualCreditModalWeb, debug sandbox on /debug/song-details per tracker-debug-rules, recent plays integration with [MANUAL] tag and edit/delete actions, complete missing data handling, and verified via tsc and test suite.
<!-- SECTION:NOTES:END -->


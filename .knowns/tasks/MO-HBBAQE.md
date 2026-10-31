---
id: MO-HBBAQE
title: Dedupe manual vs synced plays (credit grouping broken)
status: done
priority: high
labels:
  - web
  - mobile
  - sync
  - data
createdAt: '2026-10-30T03:55:10.474Z'
updatedAt: '2026-10-30T10:32:58.335Z'
completedAt: '2026-10-30T10:32:58.335Z'
timeSpent: 376
---
# Dedupe manual vs synced plays (credit grouping broken)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After Sega came back up (2026-10-30), sync re-imported plays the user had entered manually during the outage. The Recent (web) and Sessions (mobile) credit grouping then broke: each manual play sits 2–4 min after its official copy with the same track number, and groupLogsIntoCredits / groupPlaysIntoSessions split a credit whenever the next track number is >= the current one.

Root cause: lib/maimai-sync.ts recent-play import treats a play as existing only on an exact playedAt match. Manual entries with approximate times are not matched.

Data (from /api/recent-plays?limit=50): 25 official + 25 manual rows; 19 pairs match on chart + track + achievement within 4 min (official 3253–3277 vs manual 3212–3236). 6 manual rows have no duplicate (exact time match, so the official play was skipped): 3233, 3229, 3226 [Blank Credit], 3224, 3220, 3215. Nothing references play_log ids (no FKs).

Mobile: db/sync.ts fetchAndCacheRecent only upserts, so rows deleted on the server stay in local SQLite.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Sync matches an official play to an existing manual play (same chart + track + achievement within 30 min, or exact time) and promotes that row with official data instead of inserting a duplicate
- [x] #2 One-off cleanup removes the 19 existing manual duplicates after a dry run and user confirmation
- [x] #3 Mobile recent-play cache drops local rows the server no longer returns within the fetched window
- [x] #4 Recent page groups the affected days into correct credits (verified against real data)
- [x] #5 web + mobile tsc pass
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Sync fix (apps/web/lib/maimai-sync.ts, recent-play loop ~l.637): before inserting, look for (a) a row at the exact playedAt, else (b) a manual row (is_manual or details.isManual) with the same songTitle/difficulty/songType/track and numerically equal achievement within ±30 min (closest wins). If the match is manual, promote it: set playedAt, dxScore, fc, fs, track, details (fetched via idx) and isManual=false. Exact-time matches on non-manual rows keep the current behaviour (backfill details only).
2. Cleanup script apps/web/scripts/dedupe-manual-plays.ts: same matching rule run across the whole play_log; for each pair delete the manual row (the official one already has real details). Dry-run by default prints the pairs; --apply deletes. Run the dry run, show the user, and only --apply after they confirm (production Neon DB).
3. Mobile (apps/mobile/db/sync.ts fetchAndCacheRecent): after the upsert, delete local play_log rows with played_at >= oldest fetched played_at whose id is not in the fetched set.
4. Verify: re-fetch /api/recent-plays and run the grouping on it, check 2026-10-28/29 group into credits of 1..4 tracks; web + mobile tsc.

Not changing the grouping heuristic itself: it is correct for clean data.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-30: user approved the plan ("Proceed"), including the optional grouping guard (step 4 of the recap): collapse adjacent plays with the same chart + track + achievement in groupLogsIntoCredits (web) and groupPlaysIntoSessions (mobile).

Implemented (2026-10-30):
- apps/web/lib/play-dedupe.ts (new): MANUAL_MATCH_WINDOW_MS (30 min), isManualPlay, isSamePlay (chart + track + achievement), findManualDuplicate (closest manual within window), stripManualFlag.
- apps/web/lib/maimai-sync.ts recent-play loop: exact-time manual match or a nearby manual match (same chart, ±30 min) is promoted in place (official achievement/dxScore/fc/fs/track/details/playedAt, isManual=false) instead of inserting. Detail fetching extracted to a fetchDetails closure. An exact-time match on a non-manual row keeps the old details-backfill behaviour.
- apps/web/scripts/dedupe-manual-plays.ts (new): dry run by default, --apply deletes. Dry run on prod: 2538 rows (2412 official / 126 manual), 33 duplicate pairs (Oct 27–29, manual +2..+4 min), every official row has details. NOT yet applied; waiting for user confirmation.
- apps/mobile/db/sync.ts fetchAndCacheRecent: after the upsert, deletes local rows in the fetched window that the server no longer returns. Rows with id >= OFFLINE_PLAY_ID_FLOOR (1e12, the Date.now()-based offline manual ids) are kept.
- Grouping guard: dropAdjacentDuplicates in web recent-client groupLogsIntoCredits and mobile sessions groupPlaysIntoSessions (keeps the non-manual row).
Verified: web + mobile tsc clean; with the duplicates still in the DB, /recent shows Oct 29 as 5 credits (was 13), matching the simulation.

2026-10-30 cleanup applied (user confirmed, asked for a backup first):
- Script --apply now writes the deleted rows plus their kept official partners to apps/web/backups/dedupe-manual-plays-<ts>.json (gitignored) before deleting. Backup: backups/dedupe-manual-plays-2026-10-30T04-10-16-449Z.json (33 rows). Deleted 33 manual rows; a re-run dry run finds 0.
- Found and fixed a second bug: the old sync's exact-time check matched ANY row in that minute, so an official play sharing a minute with a manual entry for a different chart was skipped. The exact-time check now also requires the same chart.
- Fallout: Oct 27 09:10 credit now reads t1 t3. Its official t2 was skipped by the old sync (shared a minute with manual #3203) and #3203 is now deleted. That play is still in maimai NET's latest 50, so the next sync with the fixed code should restore it. User to run the sync.
- Full-DB scan: 2505 plays, 710 credits, 12 with a missing/odd track. Only the Oct 27 09:10 one is from this cleanup; the other 11 were already there (mostly manual-only credits).

2026-10-30: user ran a sync with the fixed code. Verified from the DB: the Oct 27 16:10 (UTC+7) credit has all 3 tracks again (t2 頓珍漢の宴 68.4459 restored); 0 manual rows duplicate an official play; 0 non-blank manual plays remain inside maimai NET's latest-50 window. 86 older manual rows stay manual (outside the window). Committed in d1edf5a and pushed.
<!-- SECTION:NOTES:END -->


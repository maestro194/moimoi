---
id: MO-K82FTQ
title: Fix stale INTL chart constants from song DB refresh
status: in-review
priority: high
labels:
  - web
  - song-db
  - rating
createdAt: '2026-10-30T04:13:27.289Z'
updatedAt: '2026-10-30T04:23:41.652Z'
timeSpent: 494
---
# Fix stale INTL chart constants from song DB refresh

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User report (2026-10-30): crazy (about you) has had the wrong chart constant since the CiRCLE PLUS update (shows 13.8, should be 13.7).

How the refresh works (apps/web/lib/song-db.ts refreshSongsDb): it loads otoge-db music-ex-intl.json, then overwrites each chart's *_i constant from DXRating dxdata.json via resolveInternalLevel.

Root cause: in dxdata, internalLevelValue is the JP current version (MAGiCAL, 2026-09-17) and multiverInternalLevelValue holds older versions. INTL is on CiRCLE PLUS. resolveInternalLevel walks ['CiRCLE PLUS', 'CiRCLE', ...] and takes the first key present. When a sheet has no 'CiRCLE PLUS' key, it falls back to an OLDER version instead of the current value. crazy MAS: internalLevelValue 13.7, multiver {CiRCLE: 13.8, PRiSM PLUS: 13.8}, so we store 13.8.

Impact (dxdata fetched 2026-10-30, our DB via /api/songs): 6342 charts compared; 34 differ from the corrected rule (multiver['CiRCLE PLUS'] ?? internalLevelValue). otoge-db INTL has values for 29 of them and confirms 26. 2 of the 34 are "Link" STD ADV/EXP, which is a title collision (dxdata has two different songs titled "Link"; we match by title), not this bug. So 32 real stale constants, by difficulty BAS 19, EXP 6, ADV 4, MAS 4, REMAS 1. Constants >= 13: crazy (about you) DX MAS 13.8->13.7, BOW AND ARROW (anime OP ver.) DX REMAS 13.2->13.3.
Using internalLevelValue alone would be wrong: it would apply 66 JP-only MAGiCAL values (e.g. ソテリア 14.1->14.0).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 resolveInternalLevel returns the INTL-version (CiRCLE PLUS) constant when present, else internalLevelValue; never an older version
- [x] #2 INTL version is one named constant with a note to bump it when INTL updates
- [x] #3 After a song DB refresh the 32 stale constants match the corrected rule (crazy (about you) MAS = 13.7)
- [x] #4 web tsc + eslint pass
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. apps/web/lib/song-db.ts resolveInternalLevel: add `const INTL_VERSION = 'CiRCLE PLUS'` (comment: bump when INTL moves to the next version; dxdata.internalLevelValue tracks JP current). Return sh.multiverInternalLevelValue?.[INTL_VERSION] ?? sh.internalLevelValue ?? sh.internalLevel. Remove the descending version list.
2. Re-run the comparison offline against the fresh dxdata: expect 0 differences under the new rule.
3. Refresh the song DB (Settings > Refresh song DB, i.e. the refresh-songs route; writes the songs table in prod), then re-check /api/songs: crazy (about you) MAS 13.7 and the 32 corrected values. Ratings are computed from song constants at request time, so the B50 updates with no extra migration (verify).
4. Out of scope, separate follow-up: dxdata title collision ("Link" x2) when matching by title.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-30 implemented. User asked that the constants be the CiRCLE PLUS version's (JP or INTL data).
- Finding: DXRating can't be trusted for CiRCLE PLUS. internalLevelValue = JP MAGiCAL, and a missing multiver entry does NOT mean "unchanged" (e.g. QZKago Requiem STD ADV: dxdata 11.3, no history entry; CiRCLE PLUS = 10.7). The authoritative source is otoge-db maimai/data/music-ex-circleplus-final.json (JP data frozen at CiRCLE PLUS). otoge INTL agrees with it on 6231/6233 constants.
- apps/web/lib/song-db.ts: CONSTANTS_VERSION = 'CiRCLE PLUS' + OTOGE_DB_CONSTANTS_URL (bump both together when INTL updates). Constants in priority order: (1) the snapshot, (2) dxdata multiver[CONSTANTS_VERSION], (3) the otoge INTL value, (4) dxdata internalLevelValue only to fill an empty constant. Added pinConstantsOnExistingRows: for snapshot songs not in the INTL list (JP-listed rows already in the table, e.g. 少女A, Absolute Queen), it updates only the constant columns and adds no songs. Lint errors in this file: 7 -> 5.
- Ran the refresh (prod songs table), first directly, then via POST /api/refresh-songs (ok, 1539 songs, 42s). The first attempt via the dev server failed once during batch insert and did not reproduce (likely a transient timeout; refresh takes 40–60s). Pre-refresh copy: scratchpad songs-before-refresh.json.
- Verified straight from the DB: 6299 charts with a CiRCLE PLUS constant; all match except 'Link' ADV/EXP (two different songs titled "Link"; title-keyed). 652 constants changed: STD ADV 621 (JP MAGiCAL raised these), BAS 19, MAS 5, EXP 3. crazy (about you) DX MAS 13.8 -> 13.7. Correction to the earlier analysis: BOW AND ARROW REMAS is 13.2 in CiRCLE PLUS (13.3 was MAGiCAL). B50 re-rendered: crazy drops out of B35 and きゅぴぴぴずむ (299) takes the slot.
- Follow-up: "Link" title collision.
<!-- SECTION:NOTES:END -->


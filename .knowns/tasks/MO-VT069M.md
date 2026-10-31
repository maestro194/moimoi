---
id: MO-VT069M
title: 'Mobile: DX Re:Master charts show "REMAS ?" and +0 rating'
status: done
priority: high
labels:
  - mobile
  - bug
  - rating
createdAt: '2026-10-31T03:27:00.529Z'
updatedAt: '2026-10-31T09:17:24.204Z'
completedAt: '2026-10-31T09:17:24.204Z'
timeSpent: 130
---
# Mobile: DX Re:Master charts show "REMAS ?" and +0 rating

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User report 2026-10-31 (screenshot of the Scores tab): REMAS charts such as 愛♡スクリ～ム！, テトリス, ダイダイダイダイダイキライ and モニタリング show "REMAS ?" with +0 rating, and drop out of B15 into "New remaining".
Server data is correct: Neon has 49 REMAS scores, all on charts that have a REMAS level. Web B50 rates テトリス REMAS 100.8422% at 13.7 → 308.

Root cause: the mobile SQLite songs table (db/client.ts CREATE TABLE, db/schema.ts SongRow) has no dx_lev_remas / dx_lev_remas_i columns, and no dx_lev_adv(_i) / dx_lev_bas(_i) either. db/sync.ts song upsert and db/useLocalData.ts song mapping therefore drop them, so every DX Re:Master chart has no constant. Several readers also use the STD lev_remas* fields for DX charts: scores.tsx level matrix (~l.174), songs.tsx DX section and sort (~l.88, ~l.234), recommend.ts getConstant (~l.74, ~l.332).

Plan (awaiting approval):
1. SQLite: add dx_lev_bas, dx_lev_bas_i, dx_lev_adv, dx_lev_adv_i, dx_lev_remas, dx_lev_remas_i to CREATE TABLE, plus try/catch ALTER TABLE migrations for existing installs (same pattern as bpm/sheets).
2. db/schema.ts SongRow, the db/sync.ts songs upsert and db/useLocalData.ts mapping carry the six fields.
3. Readers pick the field by chart type:
   - scores.tsx matrix: DX REMAS from dx_lev_remas_i, plus an STD REMAS entry.
   - songs.tsx: DX section uses dx_lev_remas*, and the sort considers both.
   - recommend.ts: getConstant REMAS by songType, and REMAS candidates include DX.
4. Data refresh: existing local rows lack the values until songs re-sync. Check whether the normal sync re-pulls songs; if not, re-pull once when the new columns are empty.
5. Verify: mobile tsc and Android bundle. Offline check against /api/songs plus the 49 server REMAS scores: every one resolves a constant with the new mapping (no +0). The user confirms on the phone after a sync.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Step 4 resolved: syncFromWebDb (db/sync.ts ~l.338) only re-fetches songs when the local count is < 1500 or forceSongs is set. /api/songs returns no refresh timestamp. Existing installs therefore never receive song updates: neither the new DX columns nor the 652 CiRCLE PLUS constant fixes from MO-K82FTQ (2026-10-30) have reached the phone. Revised step 4: re-fetch songs on every sync (one CDN-cached request; the upsert is a single transaction of about 1561 rows), dropping the < 1500 gate.

2026-10-31: user approved the plan ("Proceed").

2026-10-31 implemented per plan.
- db/client.ts: 6 columns added to CREATE TABLE songs (dx_lev_bas, dx_lev_bas_i, dx_lev_adv, dx_lev_adv_i, dx_lev_remas, dx_lev_remas_i), plus try/catch ALTER TABLE migrations for existing installs.
- db/schema.ts SongRow, db/sync.ts songs upsert and db/useLocalData.ts Song mapping carry the 6 fields.
- Readers:
  - scores.tsx matrix: REMAS = dx_lev_remas_i || lev_remas_i, typed DX/STD like MAS.
  - songs.tsx: DX REMAS section uses dx_lev_remas*; the sort uses dx || std.
  - recommend.ts: getConstant REMAS picks by songType with fallback; REMAS candidates include dx_lev_remas.
- syncFromWebDb now re-fetches songs on every sync. The < 1500 count gate and the forceSongs param were removed, along with callers in useLocalData and settings. Constant fixes such as MO-K82FTQ now reach the phone.
- Verified:
  - Offline simulation with real data (prod scores + /api/songs, keeping only the fields mobile stores, through packages/core computeRating).
    - Before: total 15141, 31 of 49 REMAS rated 0.
    - After: total 15216 (new 4527, old 10689), 0 REMAS rated 0; テトリス 308 and モニタリング 301 in B15.
    - Identical to the web's current computeRating and to the maimai NET profile_rating, 15216. The earlier 15214 B50 predates the user's sync.
  - Mobile tsc exit 0; `expo export --platform android` OK.
- User to confirm on the phone: update the app, run Sync, check the Scores tab.

2026-10-31: user approved closing ("pass the In review tasks"). Note: MO-TGRRZQ later gated the every-sync song re-fetch on a songs version, so songs are re-downloaded only when the server data changes.
<!-- SECTION:NOTES:END -->


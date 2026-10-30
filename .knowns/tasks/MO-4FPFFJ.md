---
id: MO-4FPFFJ
title: Hardcode displayed times to 24-hour UTC+7 (web + mobile)
status: in-review
priority: medium
labels:
  - web
  - mobile
  - time
createdAt: '2026-10-30T04:01:00.272Z'
updatedAt: '2026-10-30T04:01:04.564Z'
timeSpent: 0
---
# Hardcode displayed times to 24-hour UTC+7 (web + mobile)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User request 2026-10-30: every time shown on the site and in the app is fixed to 24-hour UTC+7, independent of device/server time zone.

Done: apps/web/lib/time.ts + identical apps/mobile/constants/time.ts (fixed +7h offset, reads UTC fields; no Intl timeZone, since Hermes support is patchy). formatTime "19:35", formatShortDate "Oct 29", formatLongDate "Thursday, October 29, 2026", formatIsoDate, formatDateTime "Oct 29, 2026 19:35".
Replaced 13 call sites. Web: recent-client (play time, credit time, credit date), dashboard-client and sync-bar (last synced), chart-detail-drawer (play date), b50-image footer date. Mobile: sessions, modal, index (synced time), arcade (session date/time).
Verified: formatters give correct output with TZ=America/New_York (12:35Z -> 19:35, 17:30Z -> 00:30 next day); /recent SSR shows 19:35 etc.; web + mobile tsc clean. Stored times were already correct (sync parses maimai NET as +09:00).
Not changed: the manual-credit time input still uses the device's local time zone.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All displayed dates/times on web and mobile use 24-hour UTC+7
- [x] #2 Output is independent of device/server time zone
- [x] #3 web + mobile tsc pass
<!-- AC:END -->


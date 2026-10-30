---
id: MO-JHKB1P
title: 'Support two songs titled "Link" (title-keyed song identity)'
status: todo
priority: low
labels:
  - web
  - mobile
  - song-db
  - sync
createdAt: '2026-10-30T04:26:55.206Z'
updatedAt: '2026-10-30T04:26:55.206Z'
timeSpent: 0
---
# Support two songs titled "Link" (title-keyed song identity)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
maimai has two different STD songs titled "Link" (user screenshot 2026-10-30):
- Clean Tears feat. Youna, ver. maimai PLUS: otoge sort 1329, genre maimai, jacket 1e44516a8a3b5a51.png, has REMAS. CiRCLE PLUS constants BAS 6.0 / ADV 7.8 / EXP 12.6 / MAS 12.5 / REMAS 13.5.
- Circle of friends, ver. ORANGE: sort 522, genre niconico＆ボーカロイド, jacket e90f79d9dcff84df.png, no REMAS. CiRCLE PLUS constants 6.0 / 8.2 / 10.7 / 12.5.
(The screenshot's ADV 8.5 / 8.9 are JP MAGiCAL values; DXRating calls them "Link" and "Link (2)".)

Problem: moimoi identifies songs by title everywhere (songs PK, buildSongMap, scores / play_log / score_history songTitle, trackers, tags). The songs table holds ONE hybrid "Link" row: ORANGE artist and jacket plus the PLUS song's REMAS 13.5. Sync only parses the title.
User impact today: none for rating (0 scores, plays or history for "Link"); the song browser / details show a hybrid. Only other duplicate title: [宴]Wonderland Wars オープニング (UTAGE).
tomomai handles this by separating same-name charts by artist, leaving scores unresolved when the source can't disambiguate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->


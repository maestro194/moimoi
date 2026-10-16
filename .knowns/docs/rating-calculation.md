---
title: Rating Calculation
createdAt: '2026-10-16T03:25:11.202Z'
updatedAt: '2026-10-16T03:25:11.202Z'
description: B50 rating formula, rank factors, pool logic
tags:
  - rating
  - algorithm
---
# Rating Calculation

Implemented in `lib/rating.ts`.

## Formula
```
rating = floor(internalLevel × achievement × factor)
```

## Rank Factors
| Rank | Min Achievement | Factor |
|------|----------------|--------|
| SSS+ | 100.5% | 0.224 |
| SSS  | 100.0% | 0.222 |
| SS+  | 99.5%  | 0.216 |
| SS   | 99.0%  | 0.213 |
| S+   | 98.0%  | 0.211 |
| S    | 97.0%  | 0.208 |
| AAA  | 94.0%  | 0.200 |
| AA   | 90.0%  | 0.188 |
| A    | 80.0%  | 0.168 |
| BBB  | 75.0%  | 0.152 |
| BB   | 70.0%  | 0.136 |
| B    | 60.0%  | 0.120 |
| C    | 50.0%  | 0.096 |
| D    | 0%     | 0.000 |

## Pool Logic
- **B15 (New pool):** songs with `version >= currentVersion - 500` (current + last major version)
- **B35 (Old pool):** all other songs

`currentVersion` is auto-detected as the highest version number with ≥20 songs in the database.

CiRCLE PLUS (26500) and CiRCLE (26000) are handled — songs within 500 version units of the max count as "new".

## Deduplication
Before pool filtering, scores are deduplicated to keep only the **best score per (song, difficulty)**.
This prevents the same song appearing multiple times in the rating list.

## B50 Display
The dashboard shows total rating, B15 and B35 split, and top 5 from each pool.
The `/scores` page has a B50 view with horizontal cards matching reference designs.
Analysis page (`/analysis`) shows per-difficulty bar charts and potential rating if all SSS+.

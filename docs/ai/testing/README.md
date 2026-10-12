---
phase: testing
title: Testing Strategy & Verification
description: Testing approach, verification workflows, and sandbox environments
---

# Testing Strategy & Verification

## Testing Philosophy

moimoi follows an evidence-based and sandbox-first testing approach:

1. **Debug-First Development (`AGENTS.md`)**: Any new tracker feature or chart interaction must be prototyped and validated in `/debug/song-details` before touching production tracker files (`app/tracker/tracker-client.tsx`).
2. **Deterministic Algorithm Verification**: Core calculation routines (`rating.ts`, `accuracy-solver.ts`) must have exact mathematical proofs and zero floating-point error tolerances.
3. **Build & Type Health**: Verify compilation with `npx tsc --noEmit` and `npm run build` prior to all deployments.

## Critical Test Areas

### 1. Rating Calculation (`lib/rating.ts`)
- **Single chart rating**: `calcSingleRating(internalLevel, achievement, fc)`. Verifies floor rounding logic and achievement rank multipliers.
- **B50 rating split**: 35 Old charts + 15 New charts. Correct version thresholding based on `detectCurrentVersion(songs)`.
- **UTAGE handling**: UTAGE charts must not skew standard B50 rating metrics; internal level lookups should safely fall back to 0 or raw strings.

### 2. Accuracy Loss Solver (`lib/accuracy-solver.ts`)
- **Note weight algebra**: Tap (1.0), Hold (2.0), Slide (3.0), Touch (1.0), Break (5.0 + 1.0 bonus).
- **Residual error brute force**: Solves Great/Good/Miss and Break sub-tier distributions ($P_{High}, P_{Low}, G_{High}, G_{Mid}, G_{Low}$) to match official achievement percentages down to 0.0000% error.

### 3. maimai NET Scraper (`lib/maimai-sync.ts`)
- **Cookie and session persistence**: Validates authentication cookies (`maimai_clal`) through SEGA ID login sequence.
- **Difficulty parsing**: Correctly handles 6 difficulty categories: BAS (0), ADV (1), EXP (2), MAS (3), REMAS (4), and UTAGE (5).
- **UTAGE image detection**: Matches `playlog_diff_utage.png` in recent plays to prevent misclassification as MASTER.

### 4. Database & Schemas (`lib/db/schema.ts`)
- **Unique constraints**: Ensures deduplication on `(songTitle, difficulty, songType)` across `scores` and `score_trackers`.
- **Drizzle Kit synchronization**: Verification of schema updates with Neon Postgres using `npm run db:push`.

## Sandbox & Debug Tools

| Route | Purpose | Data Source |
|---|---|---|
| `/debug` | B50 image generation preview and canvas test | Local API / Canvas |
| `/debug/song-details` | Song Details Modal, chart actions, and Tracker sandbox | Production Neon DB & Song DB |
| `/docs/dev` | Technical documentation and architecture verification | Live `docs/ai/*.md` files |

## Verification Commands

```bash
# Type check without emitting files
npx tsc --noEmit

# Production build check
npm run build

# Schema push validation
npm run db:push
```

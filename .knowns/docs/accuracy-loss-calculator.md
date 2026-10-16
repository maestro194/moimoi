---
title: Accuracy Loss Calculator
createdAt: '2026-10-16T03:25:11.202Z'
updatedAt: '2026-10-16T03:25:11.202Z'
description: Break note residual loss formula and sub-tier solver
tags:
  - algorithm
  - notes
---
# Accuracy Loss Calculator

Implemented in `lib/accuracy-solver.ts`. Prototyped and testable at `/debug`.

## The Problem
maimai NET's play detail page shows aggregate Perfect and Great counts for Break notes,
but NOT the sub-tier breakdown (p_high vs p_low; g_high vs g_mid vs g_low).
The game has 8 distinct Break judgment tiers, each with a different score value.

Since we don't know the breakdown, we cannot compute Break P+G loss directly.

## Reference Formula (from community calculator)
```
total_weighted = tap×1 + hold×2 + slide×3 + touch×1 + break×5
base = 100 / total_weighted
bpb  = 1 / num_breaks   (break bonus fraction per note)

# Non-break note losses (exact):
Tap/Touch Great  = base / 5
Tap/Touch Good   = base / 2
Tap/Touch Miss   = base
Hold: multiply factor by 2; Slide: multiply factor by 3

# Break Good and Miss (exact):
Break Good loss = count × (3×base + 0.7×bpb)
Break Miss loss = count × (5×base + 1.0×bpb)

# Break P+G (residual — guarantees total = 101 - achievement):
Break P+G loss = 101 - achievement - sum(all_other_losses)
```

The residual approach guarantees that `achievement + totalLoss = 101.0000%` always.

## Sub-Tier Solver
After computing the residual P+G loss, a brute-force solver iterates all valid partitions
of `(p_high, p_low)` and `(g_high, g_mid, g_low)` to find the combination whose computed
loss best matches the residual. The solved breakdown is persisted to `play_log.details.break`.

Individual tier loss rates:
- p_high (2550pts): 0.25/num_breaks per note
- p_low  (2500pts): 0.50/num_breaks per note
- g_high (2000pts): base + 0.6/num_breaks per note
- g_mid  (1500pts): 2×base + 0.6/num_breaks per note
- g_low  (1250pts): 2.5×base + 0.6/num_breaks per note

## Debug Page
The interactive calculator lives at `/debug` — enter note counts + achievement to verify math.
Pre-filled with the Calamity Fortune (95.0392%) example for immediate testing.
The "✓ Matches exactly" card confirms the identity holds.

## Key Rule (AGENTS.md)
New tracker features that touch this calculation MUST be prototyped on `/debug/song-details`
before being wired into the real `/tracker` or `/recent` pages.

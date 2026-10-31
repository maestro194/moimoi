---
id: MO-TGRRZQ
title: 'Mobile: global performance pass (scroll FPS, JS thread)'
status: done
priority: high
labels:
  - mobile
  - performance
  - ui-ux
createdAt: '2026-10-31T08:09:01.419Z'
updatedAt: '2026-10-31T09:17:24.167Z'
completedAt: '2026-10-31T09:17:24.167Z'
timeSpent: 546
---
# Mobile: global performance pass (scroll FPS, JS thread)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User report 2026-10-31: after the REMAS fix and the a11y work, scrolling drops to about 45 FPS, mostly on the Scores tab. The user wants app-wide fixes, not just Scores. Supersedes MO-R1BF7J (Scores virtualization) as phase 3.

Findings:
- Scores renders every card at once: a ScrollView with .map over newB15/oldB35/newRemaining/oldRemaining, grid via flexWrap 48%, and the level matrix in its own ScrollView. All 704 cards plus jacket Images stay mounted.
- components/Tap.tsx (MO-16ZTF2) measures every control with onLayout, and small ones setState and re-render. That's extra work as rows mount while scrolling.
- JacketImage uses RN Image: no disk cache, no recycling, full-size decode.
- recommend.ts getRecommendations takes about 405–427 ms per run in Node (likely 1–2 s on Hermes). Per chart it does a linear scores.find with normalizeTitle on both sides, and re-parses the sheets JSON per difficulty.
- Every tab calls useLocalData() separately, so each reloads all songs/scores synchronously and recomputes rating, skill profile and sessions.
- syncFromWebDb re-downloads and sync-upserts 1561 songs on every sync (MO-VT069M), blocking the JS thread.

Plan (awaiting approval), in order:
1. Tap: drop the onLayout measuring. Use a fixed default hitSlop (8 on each side) unless the caller sets one. No per-control state.
2. JacketImage → expo-image (`npx expo install expo-image`). cachePolicy memory-disk, recyclingKey, no fade, same fallback chain. All 8 jacket call sites benefit.
3. Scores (covers MO-R1BF7J):
   - One FlatList over flattened rows: section headers, grid rows of 2 cards, list rows of 1, matrix level headers plus rows of jackets.
   - Filters as ListHeaderComponent.
   - Cards extracted into React.memo components with stable callbacks.
   - Tuned initialNumToRender / windowSize / maxToRenderPerBatch and removeClippedSubviews.
4. Other lists: memoize the Songs and Sessions row components the same way, and check renderItem dependencies.
5. JS thread:
   - Shared data provider at the root, so data loads once for all tabs and all tabs see the same data after a sync.
   - Recommendations: index scores by normalized key and parse sheets once per song.
6. Sync:
   - /api/songs returns a songs version (max refreshed_at); mobile stores it in sync_meta and re-downloads songs only when it changes.
   - Song writes use the async SQLite API.
7. Verify:
   - Mobile tsc and Android bundle.
   - Node benchmark of recommendations before/after (expect ~400 ms → a few ms).
   - The user checks Perf Monitor with `npx expo start --no-dev --minify` on Scores, Songs and Sessions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-31: user approved ("Proceed"), all phases, no checkpoint requested.

2026-10-31 implementation:
1. Tap.tsx: onLayout measuring removed; fixed DEFAULT_HIT_SLOP of 8 per side.
2. JacketImage → expo-image ~58.0.18 (installed via pnpm). cachePolicy memory-disk, recyclingKey=uri, transition 0. Fallback chain unchanged.
3. scores.tsx:
   - One FlatList over flattened ListRow[] (section / cards / level / charts). Grid has 2 cards per row, list 1, matrix columns from useWindowDimensions.
   - Matrix filters are in ListHeaderComponent. The search/pool/diff/sort controls stay fixed above the list.
   - ScoreCard and MatrixCard are React.memo, with navigateToModal as a useCallback.
   - FlatList settings: initialNumToRender 8, maxToRenderPerBatch 8, windowSize 7, removeClippedSubviews.
   - flexWrap styles replaced by row styles (gridRowLine, matrixRowLine, sectionSpacer, levelSpacer).
4. Songs already uses a FlatList with a useCallback renderItem, so it was left as is. The Sessions renderItem is still inline: the list is small, and with the shared provider it now re-renders only on data changes. Not changed.
5. JS thread:
   - LocalDataProvider at the root (app/_layout.tsx). useLocalData() reads the context, and the value is useMemo'd. triggerSync/triggerWebDbSync are useCallback'd.
   - Settings calls reload() after a sync or clear.
   - recommend.ts:
     - scores indexed into a Map (first match wins, as with find);
     - baseline computed once;
     - sheets JSON parsed once per row (WeakMap);
     - unused playedKeys removed.
6. Sync:
   - Web: getSongsVersion() (max refreshed_at) in lib/song-db.ts; /api/songs returns songsVersion; new no-store /api/songs/version route.
   - Mobile: fetchAndCacheSongs checks the version and skips the download when it matches sync_meta.songs_version and songs exist. The stored version is the one from the payload.
   - The song upsert uses withTransactionAsync + runAsync.
7. Verify:
   - mobile tsc 0, web tsc 0. ESLint: 5 no-explicit-any errors in song-db.ts were already there before this change.
   - Android export bundles (6.6 MB hbc).
   - Node benchmark on real data, before → after:
     - skill profile 17.1 → 3.5 ms
     - push 430 → 7.2 ms
     - farm 462 → 7.7 ms
     - Outputs are identical for profile and both modes.
   - /api/songs/version and /api/songs both return songsVersion 2026-10-31T00:53:12.246Z (1561 songs).
   - Pending: the user's on-device Perf Monitor check.

2026-10-31: user approved closing ("pass the In review tasks").
<!-- SECTION:NOTES:END -->


---
id: MO-R1BF7J
title: 'Mobile: virtualize the Scores tab list'
status: done
priority: high
labels:
  - mobile
  - ui-ux
  - performance
createdAt: '2026-10-30T10:25:35.693Z'
updatedAt: '2026-10-31T09:17:24.322Z'
completedAt: '2026-10-31T09:17:24.322Z'
timeSpent: 0
---
# Mobile: virtualize the Scores tab list

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the ui-ux-pro-max review (2026-10-30), item 3: app/(tabs)/scores.tsx renders every score card at once inside a ScrollView via .map (newB15, oldB35, newRemaining, oldRemaining, ~l.583–617, plus the level matrix ~l.533). The react-native stack guideline says to use FlatList/SectionList for 50+ items (severity High). Songs and Sessions already use FlatList. Convert to a SectionList (B15 / B35 / remaining sections) with the filter header as ListHeaderComponent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-31: folded into the global performance pass task (phase 3) after the user reported FPS drops while scrolling Scores.

2026-10-31: done as phase 3 of MO-TGRRZQ. scores.tsx is now a single FlatList over flattened rows (grid, list and matrix), with memoized cards. User approved closing.
<!-- SECTION:NOTES:END -->


---
id: MO-7QX1G0
title: 'Mobile: text contrast, theme tokens, rank colour parity'
status: todo
priority: medium
labels:
  - mobile
  - ui-ux
  - theme
createdAt: '2026-10-30T10:25:35.742Z'
updatedAt: '2026-10-30T10:25:35.742Z'
timeSpent: 0
---
# Mobile: text contrast, theme tokens, rank colour parity

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the ui-ux-pro-max review (2026-10-30), items 6–8:
- COLORS.textSubtle #6b7280 measures 3.96 / 3.67 / 3.04:1 on bg / surface / surfaceLight, below 4.5:1 for normal text; textMuted #9ca3af passes at 5.8–7.5:1. 118 text styles are fontSize 8–11. Raise textSubtle to about #8b93a1 or above (check ≥4.5:1 on surfaceLight) and set a 11–12pt floor for labels.
- 62 raw hex colours in components, e.g. the tab bar in app/(tabs)/_layout.tsx duplicates COLORS values. Move them to constants/Theme.ts tokens.
- Rank colours (getRankBadge in constants/Theme.ts) differ from the web B50 scheme set 2026-10-30: SS+ and below gold, A pink, B sky, C/D grey. Align them.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->


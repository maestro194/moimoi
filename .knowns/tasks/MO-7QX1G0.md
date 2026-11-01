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
updatedAt: '2026-10-31T10:11:45.680Z'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Research 2026-10-31:
- Contrast:
  - textSubtle #6b7280 measures 3.96 / 3.67 / 3.04:1 on bg / surface / surfaceLight. It is used in 66 places.
  - #8b93a1 measures 6.19 / 5.73 / 4.74:1, passing 4.5:1 everywhere, and stays below textMuted #9ca3af.
- Small text: fontSize 8 ×11, 9 ×26, 10 ×35, 11 ×46. Most 8–9 are pill/badge text inside fixed-width cards (68pt matrix card, 48% grid).
- Rank colours:
  - Mobile getRankBadge uses filled pills (SSS rose, SS amber, S indigo, AAA green, A grey) and stops at 'B' below 80, with no BBB/BB/C/D.
  - Web B50 (lib/b50-image.ts RANK_GLYPHS) colours per letter: gold #fcd34d, sky #5ec4f5, pink #f472a0, grey #b4b0c0. SSS/SSS+ run gold→sky→pink; SS+ and below are gold; A ranks pink; B ranks sky; C/D grey.
  - 8 call sites: modal ×2, songs, arcade, index, scores ×2, sessions.
- Raw hex: 62 in app/, components/.
  - Most are #fff/#ffffff (22) and #000 (13, shadows).
  - Others duplicate COLORS values: tab bar in (tabs)/_layout.tsx, #111827, #1f2937, #9ca3af, #f9fafb, #c084fc …
  - One-offs: B15/B35 badge pinks/cyans in scores.tsx, #4ade80 success text, #3b3839/#555 in index.tsx, arcade skill-tier colours.
  - +not-found.tsx and Colors.ts/Themed.tsx are Expo template leftovers.

Plan:
1. Contrast: COLORS.textSubtle → #8b93a1. Font floor: raise fontSize 8 and 9 to 10 (37 styles). 10–11 stays as is; badge pills are the main users and going higher would break the 68pt matrix cards. Check the matrix/grid cards visually in the Android bundle size budget; no layout changes beyond font size.
2. Rank parity:
   - Constants/Theme.ts: getRankBadge gets the full maimai thresholds (SSS+ 100.5 … A 80, BBB 75, BB 70, B 60, C 50, D) and a `glyphs` list using the web scheme.
   - New components/RankBadge.tsx draws each letter in its colour, with a smaller "+", on a dark translucent pill instead of the coloured fill. Sizes sm/md/lg match the current pills.
   - Replace the 8 call sites with <RankBadge achievement={…} size=…/>.
3. Tokens:
   - Add COLORS.white, black (shadows), success (#4ade80), b15 / b35 badge colours, and a SKILL_TIER_COLOR map for arcade.
   - Tab bar and screens use COLORS.* instead of duplicated hex.
   - Leave the Expo template files (+not-found, Colors.ts, Themed, EditScreenInfo) as they are.
   - Target: no raw hex in app/(tabs), modal.tsx or components/ outside Theme.ts, except the template files.
4. Verify: mobile tsc; Android export; grep for remaining hex. The user checks rank badges and small labels on the phone (Scores grid, list and matrix; song detail; sessions).
<!-- SECTION:PLAN:END -->


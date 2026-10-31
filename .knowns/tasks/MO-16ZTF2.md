---
id: MO-16ZTF2
title: 'Mobile: screen reader labels and 44pt tap targets'
status: done
priority: high
labels:
  - mobile
  - ui-ux
  - a11y
createdAt: '2026-10-30T10:25:35.669Z'
updatedAt: '2026-10-31T09:17:24.282Z'
completedAt: '2026-10-31T09:17:24.282Z'
timeSpent: 230
---
# Mobile: screen reader labels and 44pt tap targets

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the ui-ux-pro-max review (2026-10-30), items 1–2, both CRITICAL:
- Screen reader: 0 of 54 touchables have accessibilityLabel or accessibilityRole. Six are icon-only and have no name: modal.tsx external link and close, settings.tsx delete (Trash2), the search-clear X in scores.tsx and songs.tsx, and the ManualCreditModal close X. TextInputs have no labels.
- Tap targets: the guideline is ≥44pt (iOS) / 48dp (Android). Only 3 controls use hitSlop. Filter and level chips use paddingVertical 0.5–3 (scores.tsx ~713/742, songs.tsx ~579/794, arcade.tsx ~677). The ManualCreditModal judgment grid and timing inputs are height 36.

Plan (awaiting approval):
1. New components/Tap.tsx wraps TouchableOpacity:
   - Required `label` → accessibilityLabel; `role` defaults to 'button'; `selected`/`disabled` → accessibilityState; optional `hint`.
   - Default hitSlop grows the touch area to at least 44x44 without changing the look: measure with onLayout and expand each side by max(0, (44 − size)/2).
   - Same pressed opacity as today, so no visual change.
2. Replace all 54 TouchableOpacity/Pressable uses in app/ and components/ with Tap, each with a meaningful label, e.g. "Close", "Clear search", "Delete local data", "Filter: MAS", "Sort by rating". Chips and segmented controls pass selected. Tab-like groups use role 'tab'.
3. TextInputs get accessibilityLabel (search boxes, achievement, judgment counts, time).
4. ManualCreditModal judgment grid and timing inputs: height 36 → 44.
5. Decorative icons next to visible text need no change (RN doesn't announce lucide SVGs). Score cards get a combined label: "<title> <difficulty>, <achievement>, <rating> rating".
6. Verify: mobile tsc; grep shows no raw TouchableOpacity/Pressable left in app/ or components/; spot-check rendering via Expo web if it starts. The user checks VoiceOver/TalkBack on a device.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-30: user approved the plan ("proceed").

2026-10-30 implemented per plan.
- New components/Tap.tsx wraps TouchableOpacity:
  - Required `label` → accessibilityLabel. `role` defaults to 'button'; it omits RN's own string `role` prop, which clashed with AccessibilityRole.
  - `hint`; `selected`/`checked`/`expanded`/`disabled` → accessibilityState.
  - Auto hitSlop from onLayout grows the target to ≥44 per axis; state is only set when the control is smaller.
- Replaced all 54 TouchableOpacity in app/ and components/ with labelled Tap: modal 2, index 4, sessions 4, settings 6, arcade 6, songs 7, scores 12, ManualCreditModal 13. No raw TouchableOpacity/Pressable remain.
  - Roles: tab (pool/view/category/rec mode/track/entry mode), radio (region, chart type, difficulty), checkbox (Hide unplayed), link (DXRating).
  - Rows and cards get a combined label (title, difficulty, achievement, rating). Expandable rows report expanded.
- 11 TextInputs now have accessibilityLabel. The judgment matrix cells are named "<note> <judgment>", e.g. "tap critical perfect".
- ManualCreditModal matrixInput/timingInput height 36 → 44 (the only visual change).
- Verified: mobile tsc exit 0; `expo export --platform android` bundles OK (6.5MB hbc).
  - `expo export --platform web` fails in Expo Router server rendering with "Cannot read properties of undefined (reading 'replace')". The change adds no .replace calls, so this is likely unrelated; not checked against HEAD.
  - Not done: VoiceOver/TalkBack check on a device (user).

2026-10-31: user approved closing ("pass the In review tasks"). Note: MO-TGRRZQ replaced the onLayout auto hitSlop with a fixed 8pt inset on each side for scroll performance.
<!-- SECTION:NOTES:END -->


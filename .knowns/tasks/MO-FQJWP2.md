---
id: MO-FQJWP2
title: 'Mobile: use real safe-area insets'
status: in-review
priority: medium
labels:
  - mobile
  - ui-ux
  - layout
createdAt: '2026-10-30T10:25:35.710Z'
updatedAt: '2026-10-31T09:24:40.098Z'
timeSpent: 42
---
# Mobile: use real safe-area insets

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the ui-ux-pro-max review (2026-10-30), item 5: no screen uses react-native-safe-area-context (it's installed). The ManualCreditModal header guesses the notch with paddingTop Platform.OS === 'ios' ? 54 : 20 (components/ManualCreditModal.tsx ~l.915), which is wrong on Dynamic Island and taller-notch phones and on Android edge-to-edge. Use useSafeAreaInsets() for the modal header and any fixed bottom CTA, and check app/modal.tsx and the scroll content bottom insets.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Research 2026-10-31:
- Tab screens and app/modal.tsx use native expo-router headers, and the tab bar adds its own bottom inset. Nothing to change at the top or bottom of tab screens.
- The only hand-built full-screen surface is ManualCreditModal, an RN <Modal>.
  - The header guesses the notch with paddingTop Platform.OS === 'ios' ? 54 : 20 (~l.915).
  - Its Save/Delete buttons sit at the end of the ScrollView, with only 16 of bottom padding above the home indicator or gesture bar. Android is edge-to-edge on SDK 58.
- app/modal.tsx content ends with padding 18. On Android the modal is full screen, so the last content can sit under the gesture bar.

Plan:
1. ManualCreditModal:
   - useSafeAreaInsets() from react-native-safe-area-context, already installed and provided by expo-router.
   - Header paddingTop = insets.top + 12, replacing the 54/20 guess.
   - scrollContent paddingBottom = insets.bottom + 16.
2. app/modal.tsx: content paddingBottom = insets.bottom + 18.
3. No change to tab screens (handled natively).
4. Verify: mobile tsc and Android export. The user checks the credit modal header and bottom buttons on the phone.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-31: user approved ("Proceed"). Implemented per plan:
- ManualCreditModal: useSafeAreaInsets(); header paddingTop = insets.top + 12, replacing the Platform 54/20 guess. Scroll content paddingBottom = insets.bottom + 16.
- app/modal.tsx: content paddingBottom = insets.bottom + 18.
- Tab screens unchanged (native headers and tab bar handle insets).
Verified: mobile tsc 0; Android export bundles. Pending: user checks the credit modal header and Save/Delete buttons on the phone.
<!-- SECTION:NOTES:END -->


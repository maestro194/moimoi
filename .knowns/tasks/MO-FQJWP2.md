---
id: MO-FQJWP2
title: 'Mobile: use real safe-area insets'
status: todo
priority: medium
labels:
  - mobile
  - ui-ux
  - layout
createdAt: '2026-10-30T10:25:35.710Z'
updatedAt: '2026-10-30T10:25:35.710Z'
timeSpent: 0
---
# Mobile: use real safe-area insets

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the ui-ux-pro-max review (2026-10-30), item 5: no screen uses react-native-safe-area-context (it's installed). The ManualCreditModal header guesses the notch with paddingTop Platform.OS === 'ios' ? 54 : 20 (components/ManualCreditModal.tsx ~l.915), which is wrong on Dynamic Island and taller-notch phones and on Android edge-to-edge. Use useSafeAreaInsets() for the modal header and any fixed bottom CTA, and check app/modal.tsx and the scroll content bottom insets.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->


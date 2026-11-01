---
id: MO-VWFTGZ
title: Foil cards on the B50 (web + mobile)
status: in-review
priority: medium
labels:
  - web
  - mobile
  - ui-ux
  - b50
createdAt: '2026-11-01T07:33:51.271Z'
updatedAt: '2026-11-01T08:35:43.559Z'
timeSpent: 550
---
# Foil cards on the B50 (web + mobile)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The user approved the look in the foil tryout artifact (https://claude.ai/artifact/QUrEk48Zp5heAHi9gYLk2J, v6) and wants it in both apps.

Rules agreed on 2026-11-01:
- No clear marks or achievement %: rating caps achievement at 100.5%, and AP only adds +1. Raw constant cut-offs also don't fit, since constants scale unevenly.
- Foil tier comes from rating rank inside each pool (B15 and B35 separately): top 10% rainbow, next 20% gold, next 20% silver. Tied ratings share the better tier.
- A recent best adds a blue shimmer: full strength on the day the best was set, fading to 0 over 30 days. Cards from the last 7 days get a "NEW · Nd AGO" tag.
- The B50 #1 (highest-rated chart) gets a gold frame and a "★ B50 #1" tag.
- Look:
  - Turning conic foil edge (3 / 2.5 / 2px).
  - A light band that is a wave of colour sweeping the whole card (4 / 5 / 6.5s).
  - Faint tier tint and outer glow; rating number in foil colours.
  - Pastel palette uses deeper band colours.

Where cards render:
- web app/scores/scores-client.tsx B50Card (l.334, B15/B35 sections); web B50 image: lib/b50-image.ts (canvas).
- mobile app/(tabs)/scores.tsx ScoreCard (B15/B35 rows) and app/(tabs)/index.tsx (Home B50 list).

Mobile has react-native-reanimated 4.7.1 and react-native-svg; there is no linear-gradient or Skia package.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Shared rules (packages/core/src/foil.ts)
   - getFoil(newCharts, oldCharts, now) returns per chart: tier (secret / gold / silver / null), freshness 0–1, isTop1, ageDays.
   - Exported from @maimai-suite/core so web and mobile can't drift.
   - Node check against the real B50: 6 / 13 / 8 tiers, 22 shimmering, 10 tagged, matching the tryout.
2. Web (read the relevant node_modules/next/dist/docs first, per AGENTS.md)
   - components/foil-card.tsx wraps B50Card in B15/B35 only; foil CSS in globals.css.
   - Compositor-friendly version of the tryout:
     - the edge is an oversized pseudo-element rotated with transform, instead of animating an @property angle;
     - the colour band moves with transform: translateX, instead of background-position;
     - so the browser doesn't repaint every frame.
   - Pause animation for cards off-screen (IntersectionObserver), and respect prefers-reduced-motion.
3. Mobile
   - components/FoilFrame.tsx with react-native-svg gradients and Reanimated on the UI thread:
     - rotating rainbow/gold edge clipped by the card radius;
     - translating colour band;
     - one shared clock for all cards.
   - Used in Scores tab B15/B35 cards and the Home B50 list.
   - Rating number in a solid tier colour; gradient text would need a new masked-view dependency.
   - Guards: pause when the tab isn't focused or the card is off-screen (FlatList already unmounts it), and respect Reduce Motion. Perf Monitor check against the earlier 45 FPS issue.
4. Settings: "Foil animation" toggle in both apps (web localStorage, mobile sync_meta). When off, static foil only.
5. Optional: a static foil edge and band in the exported B50 image (lib/b50-image.ts). Only if the user wants it.
6. Verify:
   - tsc in core, web and mobile;
   - web build;
   - mobile Android export;
   - core rule check;
   - the user checks /scores on web and the Scores/Home tabs on the phone.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-01: user approved ("Proceed"). Scope: steps 1–4 and 6. Step 5 (static foil in the exported B50 image) is skipped; the user didn't ask for it.

2026-11-01 implementation:
1. Core
   - packages/core/src/foil.ts, exported: computeFoil(newCharts, oldCharts, now) → Map<foilKey, {tier, freshness, ageDays, tagged, isTop1}>, plus foilKey and foilTagLabel.
   - Real-data check on the tryout snapshot gives 6/13/8, 22 shimmering, 10 tagged, top1 BULK UP (same as the tryout). Current data (rating 15227) gives 6/14/7.
2. Web
   - Now depends on @maimai-suite/core (workspace:*), with transpilePackages in next.config.mjs. It didn't use core before; it has its own lib/ copies.
   - components/foil-card.tsx + foil-card.module.css (CSS Module per the Next CSS docs).
     - Rotating oversized conic edge via transform `rotate`, and a colour band via `translate`, so nothing animates background-position or an @property.
     - Shared IntersectionObserver pauses off-screen cards; prefers-reduced-motion; html[data-foil=static].
   - Foil is computed on the server in app/scores/page.tsx from ratingData.newCharts/oldCharts and passed as a prop, so server and client match and filters don't change the foil.
   - Applied to B50Card in the grid's B15/B35 sections. List view rows unchanged.
   - Settings → Display → "Foil animation" (localStorage, useSyncExternalStore).
3. Mobile
   - components/FoilFrame.tsx: react-native-svg gradients + Reanimated UI-thread animations (rotating diagonal gradient edge, since SVG has no conic; translating colour band; pulsing recent-best glow).
   - Animation stops when the tab isn't focused (useIsFocused), with Reduce Motion (useReducedMotion), or with the setting off. Band width comes from onLayout written to a shared value (no re-render).
   - The foil map comes once from LocalDataProvider.
   - Used in the Scores tab B15/B35 cards (grid + list) and the Home top-5 rows. The rating number uses a solid tier colour.
   - db/foilPref.ts stores the setting in sync_meta 'foil_animation'; Settings → Display switch.
4. Verify
   - web and mobile tsc 0.
   - ESLint on changed web files: no new errors (the try/catch JSX error in scores/page.tsx was already there).
   - `next build` OK (/scores dynamic). Android export OK (6.6 MB hbc).
   - SSR /scores renders 6/14/7 frames, 22 glows, 1 crown, 9 tags (one passed 7 days using real now).
   - Pending: user checks /scores on web, and the Scores/Home tabs + Perf Monitor on the phone.
5. Skipped: static foil in the exported B50 image (not requested).

2026-11-01, before deploy: removed the web dependency on @maimai-suite/core (workspace:*) and transpilePackages. Reason: Vercel's install method is unknown. pnpm-lock.yaml is gitignored and a root package-lock.json is tracked, so an npm install would fail on the workspace: protocol. The web app now uses apps/web/lib/foil.ts, a byte-identical copy of packages/core/src/foil.ts (plus a header), following the existing lib/rating.ts pattern; mobile still imports core. package.json and next.config.mjs are back to HEAD. Re-verified: web tsc 0, `next build` OK, SSR /scores still 6/14/7. Card design feedback → new task.
<!-- SECTION:NOTES:END -->


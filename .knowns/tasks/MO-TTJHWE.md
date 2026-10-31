---
id: MO-TTJHWE
title: Restyle B50 image table to reference card design
status: done
priority: medium
labels:
  - web
  - b50-image
createdAt: '2026-10-29T18:11:20.157Z'
updatedAt: '2026-10-30T10:32:58.314Z'
completedAt: '2026-10-30T10:32:58.314Z'
timeSpent: 220
---
# Restyle B50 image table to reference card design

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Restyle the B50 table in apps/web/lib/b50-image.ts after a reference image the user shared (mimi xd bot "topPlays.png"). User picked (2026-10-30): table + background scope; drop the #N rank pill. Do NOT copy reference branding (mascot watermark, bot footer, CIRCLE PLUS logo / rating plate).

Card: square inset rounded jacket; rating number in a rounded box at the top-right; FC/FS badges only when earned, next to the achievement %; level box flush to the bottom-right corner; light theme for REMAS (dark text); rank letters gold/sky/pink with a dark outline.
Headers: short pill ~1.5 cards wide, NEW = white/dark text, OLD = sky-blue/white text, total number with no "Total:".
Background: table area gradient #966363 -> #5f5677; sidebar tone adjusted to match.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Cards match the reference layout: inset jacket, rating box, earned-only FC/FS badges, flush level box, no #N pill
- [x] #2 REMAS cards use a light theme with dark text; other difficulties use dark bodies
- [x] #3 Section headers are short pills (NEW white, OLD sky-blue) showing the total
- [x] #4 Table background uses the mauve-to-violet gradient; sidebar is retoned to match
- [x] #5 No reference branding copied
- [x] #6 Verified via /debug/song-details B50 preview (real data) and web tsc/eslint
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-30: all changes in apps/web/lib/b50-image.ts.
- CARD_THEME per difficulty replaces DIFF_BG/DIFF_STRIP; REMAS = light theme (#9c85b2 body, dark text, dark level box).
- drawCard: square inset jacket (59px, r3), rating box top-right, rank glyphs gold/sky/pink with a dark outline, FC/FS badges only when earned (pastel on dark cards, deep on REMAS), level box flush bottom-right, #N pill removed (signature dropped the rank arg).
- SYNC badge hidden: the reference is the same player's B50 and shows no SYNC, only FS+.
- Card text now uses M PLUS Rounded Black: Nunito rendered too thin, and FN/FR were removed.
- drawHeader: short pill (1.5 cards wide), NEW white/#1c2b33, OLD #3fa4f0/white, plain total.
- Background gradient #966363 -> #5f5677; sidebar retoned #3d2b3b -> #241c30.
- Not copied: mascot watermark, bot footer, CIRCLE PLUS logo / rating plate.
Verified: /api/b50-image (the endpoint behind the debug page's B50 preview) renders 200 with real data and was inspected visually against the reference; web tsc clean; eslint clean on b50-image.ts.

2026-10-30 follow-up (user feedback: lighter + bigger type, badges under the score, orange AP/FDX):
- Added public/fonts/MPlusRounded1c-Bold.ttf (Google Fonts, OFL). F() = Bold for all text; FH() = Black for rank glyphs only. thickFill removed.
- Sizes up: achievement 9->11.5, rating 18->22 (box 52x28), level 9->10.5, title 8.5->9.5, header 11->12.5/13 (h 24), badges 7.5->8; sidebar text +1 to +2px. CT 21->22.
- FC/FS badges moved under the rating box, right-aligned to it (as in the reference).
- Badge colours sampled from the in-game icons: AP/AP+ and FDX/FDX+ orange (#f4b449 fill / #b51522 edge), FC green (#71cf48 / #0d5728), FS blue (#44beeb / #094591). Only colours sampled; no Sega icon images bundled.
Verified: /api/b50-image renders 200 and was inspected visually (FDX orange on ウミユリ海底譚; no AP in this player's B50 to show). tsc + eslint clean.
<!-- SECTION:NOTES:END -->


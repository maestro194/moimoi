---
id: MO-WZ37ND
title: Jacket image fallback chain (Sega outage)
status: in-review
priority: high
labels:
  - web
  - mobile
  - jacket
createdAt: '2026-10-29T17:11:37.543Z'
updatedAt: '2026-10-29T17:31:36.083Z'
timeSpent: 492
---
# Jacket image fallback chain (Sega outage)

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Sega's maimai-mobile servers (maimaidx-eng.com, maimaidx.jp) are down (confirmed timeouts 2026-10-29/30), so every jacket in web + mobile is broken. Both apps hotlink `https://maimaidx-eng.com/maimai-mobile/img/Music/{image_url}`.

Findings (probed 2026-10-29):
- otoge-db GitHub mirror `https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/jacket/{image_url}` — keyed by the SAME image_url we store, 20/20 sampled hit (incl. 5 newest), 190x190 PNG, CORS *. Already used by web `getJacketUrl` for JP-only songs.
- Other live mirrors need ID mapping: LXNS `assets2.lxns.net/maimai/jacket/{musicId}.png`, diving-fish `/covers/{id:05}.png`, DXRating `shama.dxrating.net/images/cover/v2/{dxdata imageName}.jpg`.
- Reference: tomomai caches jackets to its own R2 (apps/main/src/app/api/admin/image/route.ts) — long-term option, out of scope here.

Call sites: web `apps/web/lib/song-db.ts` getJacketUrl (Jacket component, SongDetailsModal, scores-client, matrix-view, songs-client, chart-detail-drawer); web `apps/web/lib/b50-image.ts` fetchJacket (server-side, Sega + cookie, 8s timeout); mobile: 9 hardcoded Image sources in index.tsx, scores.tsx, modal.tsx, songs.tsx, sessions.tsx.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Web jackets render while Sega is down, via a fallback chain (no hardcoded single host)
- [x] #2 Web <img> jackets advance to the next source on load error, ending in the existing placeholder
- [x] #3 B50 image render fetches jackets from the mirror when Sega fails/times out
- [x] #4 Mobile jackets use a shared JacketImage component with the same fallback chain (all 9 call sites)
- [x] #5 Fallback prototyped on /debug/song-details before tracker wiring
- [x] #6 Web typecheck/lint passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Source order: [otoge-db GitHub mirror, Sega official, placeholder]. Mirror first because Sega currently times out (browser waits long before onError) and the mirror is keyed by the same image_url. Sega stays as secondary.

1. Web helper (apps/web/lib/song-db.ts): add `getJacketUrls(imageName, intl): string[]` returning the ordered list; `getJacketUrl` returns [0] so existing callers keep working (CSS backgroundImage in scores-client stays single-URL).
2. Web component: `apps/web/components/jacket-img.tsx` ('use client') — <img> that steps through getJacketUrls on onError, then renders placeholder. Use it in Jacket, SongDetailsModal, songs-client, chart-detail-drawer, matrix-view.
3. Debug page first (AGENTS.md rule): add a "Jacket fallback" section to /debug/song-details showing a few real songs with each source + a forced-Sega-fail case. Verify, then wiring reaches tracker via Jacket.
4. B50 server render (apps/web/lib/b50-image.ts fetchJacket): try mirror (no cookie, 8s timeout), then Sega with cookie; disk/mem cache unchanged; don't cache a null from a timeout permanently.
5. Mobile: `apps/mobile/components/JacketImage.tsx` (RN Image, onError advances index), same order; replace the 9 hardcoded `maimaidx-eng.com` sources.
6. Verify: web tsc + lint, load /debug/song-details and /tracker, curl-check mirror; mobile tsc.

Out of scope (follow-ups): tertiary mirror (LXNS/DXRating needs title->id mapping), self-hosted R2 cache like tomomai.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-30 implementation:
- apps/web/lib/jacket.ts (new, DB-free): getJacketUrls() = [otoge-db mirror, Sega INTL (intl songs only)]; getJacketUrl() = first. song-db.ts re-exports both.
- apps/web/components/jacket-img.tsx (new): <img> advancing on onError, failure count keyed to the URL list (no setState-in-effect). Used in Jacket (→ tracker/analysis/recent/scores), SongDetailsModal, songs-client, chart-detail-drawer, matrix-view. CSS background-image sites use getJacketUrl (mirror).
- Debug page (/debug/song-details → app/debug/debug-client.tsx): "Jacket fallback" section showing INTL oldest/newest, JP-only, bogus image_url, each source with 8s probe status.
- apps/web/lib/b50-image.ts: fetchJacket tries mirror then Sega+cookie (8s each); misses cached 10 min instead of process lifetime.
- apps/mobile/components/JacketImage.tsx (new): same chain; replaced 8 hardcoded Sega Image sources (plan said 9; arcade.tsx had none).
Verification: mirror HEAD-checked for all 1473 unique image_url in DB → all 200. /api/b50-image rendered 200 PNG in 15s with all 50 jackets while Sega down. web tsc clean; eslint: no new errors in touched files (remaining are pre-existing). mobile tsc 0 errors (same as before).
Not done: visual browser check of /debug/song-details and mobile device run. Follow-ups: 3rd source (LXNS/DXRating needs title→id map), self-hosted R2 cache.
<!-- SECTION:NOTES:END -->


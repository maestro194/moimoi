---
phase: planning
title: Project Planning & Task Breakdown
description: Phased plan for moimoi web (current) + mobile app (Expo)
---

# Project Planning & Task Breakdown

## Current State (Web App — Shipped)

The web app is deployed on Vercel and fully functional. The following features are complete:

- ✅ Dashboard with B15/B35 rating breakdown and profile
- ✅ Score sync from maimaidx.net (SEGA login flow + scraper)
- ✅ B50 card grid view with difficulty borders and achievement display
- ✅ Matrix view (all songs × all difficulties with achievement overlay)
- ✅ Recent plays feed with per-play note detail breakdown
- ✅ Songs browser with search, filter by difficulty/version/tag, sort
- ✅ Song details drawer (chart metadata, internal level, note counts, tags)
- ✅ Personal tags + tag groups (create, assign to charts, filter by)
- ✅ Community tags from dxrating (read-only)
- ✅ Board / Tracker: Goals tab, Session tab, Lists tab
- ✅ Analysis page with rating suggestions (target efficiency ranking)
- ✅ Settings page: SEGA login modal, region selector, dev tools
- ✅ Accuracy solver (brute-forces note sub-tier breakdown from achievement %)
- ✅ UTAGE difficulty support (parse, display string levels, pink border)
- ✅ Debug page: B50 image generator, Song Details sandbox

## Milestones

- [x] **M0: Web App MVP** — Dashboard, sync, scores, recent, songs
- [x] **M1: Tracker + Tags** — Board, tag system, analysis
- [x] **M2: Polish** — Matrix view, UTAGE, difficulty colors, settings overhaul
- [ ] **M3: Monorepo Migration** — Extract shared packages, move web into `apps/web/`
- [ ] **M4: Mobile Scaffold** — Expo app, SQLite sync, core screens
- [ ] **M5: Arcade Mode** — Manual session tracking, post-session sync *(geofencing deferred)*
- [ ] **M6: Mobile Polish** — Animations, offline handling, EAS build

---

## Phase 0 — Monorepo Setup *(~3 days)*

**Goal:** Restructure repo so web and mobile share logic packages without duplication.

- [ ] Init pnpm workspace at repo root
- [ ] Move `moimoi/` → `apps/web/` (update Vercel root directory setting)
- [ ] Create `packages/core` — extract: `lib/types.ts`, `lib/rating.ts`, `lib/normalize.ts`, `lib/accuracy-solver.ts`
- [ ] Create `packages/db-schema` — extract: `lib/db/schema.ts`
- [ ] Update all imports in `apps/web/` from `@/lib/...` to `@moimoi/core` / `@moimoi/db-schema`
- [ ] Verify `next build` still passes
- [ ] Verify Vercel deployment still works

**Dependencies:** None  
**Blocker:** Decision on monorepo timing (do it before mobile scaffold)

---

## Phase 1 — Expo Scaffold *(~1 week)*

**Goal:** Expo app boots, syncs data from existing API, reads from local SQLite.

- [ ] `npx create-expo-app apps/mobile --template tabs` (Expo Router)
- [ ] Configure pnpm workspace to include `apps/mobile`
- [ ] Set up `expo-sqlite` + Drizzle with schema from `packages/db-schema`
- [ ] Implement `db/sync.ts`: fetch songs from `/api/songs` → insert into SQLite
- [ ] Implement `db/sync.ts`: fetch scores from `/api/sync` → upsert into SQLite
- [ ] Scaffold 5 tab screens (empty shells): Dashboard, Sessions, Scores, Arcade, Settings
- [ ] Apply dark theme (match moimoi color palette)
- [ ] Verify SQLite reads work offline after first sync

**Dependencies:** Phase 0 (shared packages)

---

## Phase 2 — Core Screens *(~2 weeks)*

**Goal:** The three main screens are usable and match web app behavior.

- [ ] **Dashboard tab:** Rating display (animated arc), B35/B15 summary, last sync time, Sync Now button
- [ ] **Scores tab:** Full score list, filter by difficulty/type, sort by rating/achievement, pull-to-refresh
- [ ] **Score detail bottom sheet:** Chart metadata, history, target tracker input (mirror ChartDetailDrawer)
- [ ] **Settings tab:** SEGA login (WebView auth handoff), region selector, sync controls
- [ ] **Songs tab (stretch):** Song browser with search + filter

**Dependencies:** Phase 1

---

## Phase 3 — Arcade Mode *(~1.5 weeks)*

**Goal:** Manual session tracking during arcade visits with auto-sync on end.

- [ ] `arcade_sessions` table in SQLite (start, end, location name, play count, rating delta)
- [ ] Manual "Start Session" / "End Session" flow
- [ ] Session timer + live play counter UI
- [ ] Post-session auto-sync (fetch latest scores from `/api/sync`)
- [ ] Session Summary screen: plays, rating delta (before/after), new PBs list

> **Deferred:** Geofencing (`expo-location` + `expo-task-manager`), arcade location management, and push notification "You're at [arcade]" trigger are **not in scope** for initial release. Manual start/end is sufficient for now.

**Dependencies:** Phase 2

---

## Phase 4 — Polish & Distribution *(~1 week)*

- [ ] EAS Build config for Android APK (signing, versioning)
- [ ] OTA updates via EAS Update
- [ ] Offline graceful degradation (stale-while-revalidate UI)
- [ ] Micro-interactions: card press feedback, sync progress, session timer animation
- [ ] Android home screen widget: current rating (stretch goal)

---

## Dependencies

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4
```

*(No blocking decisions remain — all open decisions resolved.)*

## Risks & Mitigation

| Risk | Mitigation |
|---|---|
| SEGA changes maimaidx.net HTML | Modular scraper in one file; fix once, deploy |
| Expo SDK upgrade breaks native modules | Pin SDK version; test upgrades in dev branch |
| SQLite ↔ Neon schema drift | Shared `packages/db-schema`; single source of truth |
| Play Store policy risk from scraping | Distribute as APK only — no store submission |

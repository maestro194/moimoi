# moimoi Mobile App — Architecture & Implementation Plan

> **Goal:** A native Android app (+ web) for maimai sessions — local-first, fast, arcade-aware, and a much better UX than maimaidx.net.

---

## 1. Architecture

### High-Level System Map

```
┌─────────────────────────────────────────────────────────────┐
│                      SEGA ECOSYSTEM                         │
│   maimaidx.net ←── scraper ──→ (read-only, existing impl)  │
└──────────────────────┬──────────────────────────────────────┘
                       │ scraped data
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                   BACKEND (unchanged)                        │
│                                                              │
│   Next.js app (moimoi web)       Neon Postgres               │
│   ├── /api/sync                  ├── scores                  │
│   ├── /api/songs                 ├── play_log                │
│   ├── /api/board                 ├── settings                │
│   ├── /api/recent-plays          ├── score_trackers          │
│   └── /api/settings              └── songs (cached)          │
└──────────────────────┬───────────────────────────────────────┘
                       │ REST API (existing routes)
          ┌────────────┴────────────┐
          ▼                         ▼
┌─────────────────┐      ┌──────────────────────────────────┐
│  Web App        │      │  Mobile App (new)                 │
│  (moimoi today) │      │                                   │
│  Next.js 16     │      │  Expo SDK 52 + Expo Router v4    │
│                 │      │                                   │
│  Reads from:    │      │  Local SQLite (expo-sqlite)       │
│  Neon directly  │      │  ├── songs (15k rows, synced 1x) │
│                 │      │  ├── scores (all time)            │
│                 │      │  ├── play_log                     │
│                 │      │  └── settings                     │
│                 │      │                                   │
│                 │      │  Reads: SQLite (instant, offline) │
│                 │      │  Writes: API → Neon → SQLite      │
└─────────────────┘      └──────────────────────────────────┘
```

### Data Flow: Sync Cycle

```
User triggers sync (manual or auto post-session)
          │
          ▼
  Mobile → POST /api/sync
          │
          ▼
  Next.js scrapes maimaidx.net
  (existing lib/maimai-sync.ts)
          │
          ▼
  Writes to Neon Postgres
          │
          ▼
  Returns delta (new/changed scores) to mobile
          │
          ▼
  Mobile merges into local SQLite
          │
          ▼
  UI re-renders from SQLite (0ms network latency)
```

### Data Flow: Arcade Session

```
Phone enters arcade geofence
          │
          ▼
  Background task fires (expo-task-manager)
  → Push notification: "You're at [arcade]! 🎮 Start session?"
          │
          ▼
  User taps → Session starts (timer, tracking state)
          │
          ▼
  [User plays maimai]
          │
          ▼
  Phone exits geofence (or user taps "End Session")
          │
          ▼
  Auto-sync triggers → fetches new plays from maimaidx.net
          │
          ▼
  Session Summary screen:
  ├── N plays this session
  ├── Rating: 14,250 → 14,312 (+62)
  ├── New PBs: [list]
  └── Best play: [song name] 99.82% AP
```

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| **Mobile framework** | Expo SDK 52 (React Native) | TypeScript, same mental model as Next.js, Android + web from one codebase |
| **Routing** | Expo Router v4 | File-based routing mirrors Next.js `app/` directory |
| **Local DB** | `expo-sqlite` + Drizzle ORM | Same Drizzle schema as the web app; identical query API |
| **Cloud DB** | Neon Postgres (existing) | No new infra; mobile reads via API, not direct connection |
| **State management** | Zustand | Lightweight; no Redux boilerplate; works with SQLite reactively |
| **Animations** | Reanimated 3 + Moti | 60fps native animations on the JS thread |
| **UI components** | Custom (match moimoi dark theme) | Consistency; no third-party component lib to fight |
| **Session detection** | `expo-location` + `expo-task-manager` | Geofencing; runs as a background task even when app is closed |
| **Push notifications** | `expo-notifications` | Session alerts, sync complete, PB achieved |
| **Build/distribution** | EAS Build | Managed native builds, OTA updates via EAS Update |
| **Repo structure** | pnpm monorepo | Share `core` + `db` packages between web and mobile |

### What stays server-side (Next.js only)

The SEGA scraper (`lib/maimai-sync.ts`) **never ships in the mobile APK**. It requires Node.js HTTP + cheerio, and shipping scraping code in a mobile app is both impractical and risky. The mobile app always triggers sync via `POST /api/sync` and receives the result.

---

## 3. Monorepo Structure

```
maimai-suite/                     ← pnpm workspace root
├── apps/
│   ├── web/                      ← current moimoi (Next.js), moved here
│   └── mobile/                   ← new Expo app
│       ├── app/                  ← Expo Router screens
│       │   ├── (tabs)/
│       │   │   ├── index.tsx     ← Dashboard
│       │   │   ├── sessions.tsx  ← Session history
│       │   │   ├── scores.tsx    ← All scores
│       │   │   ├── arcade.tsx    ← Arcade mode
│       │   │   └── settings.tsx
│       │   └── _layout.tsx
│       ├── components/
│       ├── hooks/
│       ├── store/                ← Zustand stores
│       └── db/                   ← SQLite setup
│           ├── client.ts         ← expo-sqlite init
│           ├── sync.ts           ← Neon → SQLite merge logic
│           └── migrations/
│
├── packages/
│   ├── core/                     ← shared business logic
│   │   ├── rating.ts             ← lib/rating.ts (verbatim)
│   │   ├── types.ts              ← lib/types.ts (verbatim)
│   │   ├── normalize.ts
│   │   ├── accuracy-solver.ts
│   │   └── package.json
│   │
│   └── db-schema/                ← shared Drizzle schema
│       ├── schema.ts             ← lib/db/schema.ts (verbatim)
│       └── package.json
│
├── pnpm-workspace.yaml
└── package.json
```

> [!NOTE]
> Moving moimoi web into `apps/web/` is a one-time refactor. The Next.js app itself doesn't change — only its location. Vercel deployments target `apps/web/` via the root directory setting.

---

## 4. Mobile App Screens

### Tab: Dashboard
- Rating gauge (animated arc)
- B35 / B15 mini summary cards
- Last sync timestamp + "Sync Now" button
- Recent session card (last arcade visit)

### Tab: Sessions
- Chronological list of arcade sessions
- Per-session: date, duration, # plays, rating delta
- Tap to expand: all plays from that session, sorted by achievement

### Tab: Scores
- Full score list (mirrors web scores page)
- Filter by difficulty, chart type, rating pool
- Sort by rating, achievement, internal level
- Tap → Song detail sheet (chart info, history, target tracker)

### Tab: Arcade Mode ("Now Playing")
- Big "Start Session" button when idle
- Active session: timer, play counter, live rating estimate
- Map showing nearby known arcades (optional later)
- End Session → triggers sync → Session Summary

### Tab: Settings
- SEGA login (same modal as web)
- Region (JP / INTL)
- Arcade locations (add/manage saved locations for geofencing)
- Notification preferences
- Manual data controls (clear, re-sync from scratch)

---

## 5. Local-First Database Design

The SQLite schema on-device mirrors the Neon schema exactly (shared from `packages/db-schema`). Key addition: a sync metadata table.

```ts
// packages/db-schema/schema.ts additions for mobile
export const syncMeta = sqliteTable('sync_meta', {
  key: text('key').primaryKey(),
  value: text('value'),           // e.g. last_synced_at ISO string
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const arcadeSessions = sqliteTable('arcade_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  locationName: text('location_name'),
  playCount: integer('play_count').default(0),
  ratingBefore: integer('rating_before'),
  ratingAfter: integer('rating_after'),
});
```

### Sync Strategy

| Data | Frequency | Method |
|---|---|---|
| Songs (15k rows) | Once on install, then on app update | Full replace from `/api/songs` |
| Scores (B50) | On demand / post-session | Delta via `/api/sync` |
| Play log (recent 50) | Post-session | Full replace from `/api/recent-plays` |
| Settings | On login + on change | From `/api/settings` |

---

## 6. Implementation Phases

### Phase 0 — Monorepo Setup *(~3 days)*
- [ ] Init pnpm workspace
- [ ] Move current `moimoi/` → `apps/web/`
- [ ] Extract `packages/core` (types, rating, normalize, accuracy-solver)
- [ ] Extract `packages/db-schema` (Drizzle schema)
- [ ] Update all imports in `apps/web/` to use workspace packages
- [ ] Verify Vercel still builds correctly with new root directory

### Phase 1 — Expo Scaffold *(~1 week)*
- [ ] `npx create-expo-app apps/mobile` with Expo Router template
- [ ] Configure pnpm workspace for mobile
- [ ] Set up `expo-sqlite` + Drizzle with shared schema
- [ ] Build sync engine: fetch from API → write to SQLite
- [ ] Verify songs + scores land in SQLite correctly
- [ ] Scaffold all 5 tab screens (empty shells)

### Phase 2 — Core Screens *(~2 weeks)*
- [ ] Dashboard: rating display, B35/B15 summary, sync button
- [ ] Scores: full list, filter/sort, matches web app behavior
- [ ] Song detail bottom sheet (reuse logic from web `ChartDetailDrawer`)
- [ ] Recent plays list
- [ ] Settings: SEGA login flow (WebView for auth handoff)
- [ ] Dark theme matching moimoi color palette

### Phase 3 — Arcade Mode *(~1.5 weeks)*
- [ ] Session model: start/end, play count, rating delta
- [ ] Manual "Start/End Session" flow
- [ ] Geofencing with `expo-location` + `expo-task-manager`
- [ ] Arcade location management (add by GPS or search)
- [ ] Post-session auto-sync
- [ ] Session Summary screen (animated rating change, PB highlights)

### Phase 4 — Polish & Distribution *(~1 week)*
- [ ] EAS Build config for Android APK / AAB
- [ ] OTA updates via EAS Update
- [ ] Push notifications (session alerts, sync complete)
- [ ] Offline state handling (graceful degradation)
- [ ] Animations and micro-interactions (Reanimated 3)
- [ ] Android home screen widget (rating display) — *stretch goal*

---

## 7. Open Decisions — Resolved

> [!NOTE]
> All decisions below have been resolved. No blockers remain before Phase 0.

### ✅ Decision 1: Monorepo migration timing
**→ Option A selected:** Do it now before building mobile.

Monorepo will be set up first. All shared logic (`types`, `rating`, `schema`) extracted into workspace packages before the Expo app is scaffolded.

### ✅ Decision 2: Web target for mobile app
**→ Option B selected:** Keep Next.js for web, Expo for mobile only.

Two separate apps share logic via `packages/core` and `packages/db-schema`. No attempt to unify into a single Expo web/native codebase.

### ✅ Decision 3: Authentication model
**→ Approved:** Mobile triggers sync via the existing web API (`POST /api/sync`). Credentials remain in Neon `settings` table server-side. No local credential storage needed for now.

### ~~Decision 4: Arcade location sourcing~~
~~*Deferred — not implementing geofencing or arcade location management yet. The Arcade Mode session tracking will be manual-only (user taps Start/End) for the initial release. Location features can be added in a later phase.*~~

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| SEGA changes maimaidx.net HTML structure | High — sync breaks | Existing risk on web app too; modular scraper means fix once |
| Expo SDK updates breaking native modules | Medium | Pin SDK version, test upgrades in dev before OTA push |
| Geofencing battery drain | Medium | Use low-accuracy location mode when idle; only high-accuracy in session |
| SQLite ↔ Neon schema drift | Medium | Shared `packages/db-schema` prevents this by design |
| App Store / Play Store policies on scraping | Low (Android sideload) | Distribute as APK directly, no Play Store submission required |

---

## Summary

The architecture is straightforward because **the hard parts are already built** — the scraper, the rating calculator, the schema, and the API routes all exist in moimoi today. The mobile app is primarily a **new UI client** that talks to the same backend, with a local SQLite cache for speed and a geofencing layer for session awareness.

Total estimated calendar time: **6–8 weeks** building solo, or faster with focused sessions.

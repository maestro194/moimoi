---
title: Mobile App Plan
createdAt: '2026-10-16T03:25:11.202Z'
updatedAt: '2026-10-16T03:25:11.202Z'
description: Architecture and implementation plan for the Expo mobile app. Full plan in docs/mobile-app-plan.md
tags:
  - mobile
  - planning
---
# Mobile App Plan

Full plan: `docs/mobile-app-plan.md`

## Goal
Native Android app for maimai sessions — local-first, fast, arcade-aware.

## Architecture
- **Backend:** unchanged (Next.js API on Vercel + Neon Postgres)
- **Mobile:** Expo SDK 52 + Expo Router v4, reads local SQLite (offline-first)
- **Sync:** Mobile → `POST /api/sync` → Neon → delta returned → merged into SQLite

## Tech Stack
- Expo SDK 52, Expo Router v4
- `expo-sqlite` + Drizzle ORM (same schema as web via `packages/db-schema`)
- Zustand (state), Reanimated 3 (animations)
- EAS Build → Android APK (sideload, no Play Store)
- pnpm monorepo (`apps/web`, `apps/mobile`, `packages/core`, `packages/db-schema`)

## Resolved Architecture Decisions
1. **Monorepo:** Do it now (Phase 0 is monorepo migration)
2. **Codebase:** Two separate apps (Next.js web + Expo mobile); features implemented on one first then ported
3. **Auth:** Same as web — SEGA ID + password → `POST /api/settings` → stored in Neon
4. **Geofencing/Arcade locations:** Deferred indefinitely. Arcade Mode tab exists but is manual Start/End only.

## Implementation Phases
| Phase | Scope | Est. |
|-------|-------|------|
| 0 | pnpm monorepo, move web → `apps/web/`, extract `packages/core` + `packages/db-schema` | ~3 days |
| 1 | Expo scaffold, expo-sqlite + Drizzle, sync engine, 5 tab shells | ~1 week |
| 2 | Dashboard, Scores, Song detail sheet, Recent plays, Settings, dark theme | ~2 weeks |
| 3 | Arcade Mode: manual Start/End session, Session Summary, post-session sync | ~1 week |
| 4 | EAS Build, OTA updates, push notifications, offline handling, animations | ~1 week |

**Total: ~5–7 weeks**

## Tabs
- Dashboard (rating gauge, B35/B15, sync button)
- Sessions (arcade session history)
- Scores (full list, filter/sort)
- Arcade Mode (manual session start/end — no geofencing)
- Settings (SEGA login, region, data controls)

## Status
Decisions finalized 2026-10-16. Phase 0 ready to start.

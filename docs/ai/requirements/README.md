---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement

moimoi started as a personal maimai DX score tracker. The maimaidx.net official site is slow, unusable on mobile, and provides no rating context, no goals, and no session awareness. The goal is to build a complete companion ecosystem — web + Android — that replaces that experience entirely.

**Who is affected:** Players on the INTL (SEA/international) and JP regions who want to track and improve their rating.

**Current workaround:** Players use the official maimaidx.net directly or third-party tools with limited feature sets.

## Goals & Objectives

### Primary goals
- Fast, actionable score tracking with rating context per chart
- Sync scores from maimai NET via SEGA login (no manual input)
- Android + web app from a shared codebase/backend
- Local-first data on mobile for instant reads and offline use

### Secondary goals
- Arcade session awareness via geofencing (auto-sync on session end)
- Personal tag system for chart labeling and custom filtering
- Goal tracker with rating delta projections
- Accuracy loss breakdown (note-level analysis from achievement %)

### Non-goals (explicitly out of scope)
- Play Store submission (APK sideload only, to avoid policy review risk)
- Social features / leaderboards (no public API from SEGA)
- Real-time play detection during a game session (would require arcade API access)

## User Stories

- As a player, I want to see my B35/B15 breakdown with internal levels so I know which charts to grind.
- As a player, I want to set a rating target for a chart and see exactly what score I need to hit it.
- As a player arriving at an arcade, I want to start a session and see a summary of what I achieved when I leave.
- As a player on a phone, I want the app to load instantly without a network round trip.
- As a player, I want to tag charts (e.g. "Too Hard", "Almost FC") and filter my song list by them.

## Success Criteria

- Dashboard loads under 200ms on mobile (SQLite local read)
- Sync completes under 30s for full B50 + recent 50 plays
- Geofence triggers reliably within 1 minute of entering/exiting an arcade
- Rating calculation matches maimaidx.net within ±1 point

## Constraints & Assumptions

- SEGA provides no public API; all data must be scraped from maimaidx.net HTML
- Scraping must be done server-side (Next.js API) — never shipped in the mobile APK
- The song database (dxrating API) is read-only and externally maintained
- User is the primary/sole user — no multi-user account system needed

## Open Items

- [ ] Decision: monorepo migration timing (before or after mobile scaffold)
- [ ] Decision: which Thai/JP arcades to pre-seed as geofence locations
- [ ] Decision: Expo Router web target vs keeping Next.js for web only
- [ ] Research: EAS Build setup and signing for Android APK distribution

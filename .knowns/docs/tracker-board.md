---
title: Tracker Board
createdAt: '2026-10-16T03:25:11.202Z'
updatedAt: '2026-10-16T03:25:11.202Z'
description: Session, Goals, and Lists tracker feature
tags:
  - ui
  - tracker
---
# Tracker Board

Route: `/tracker` (`app/tracker/tracker-client.tsx`)

Three-tab board for managing arcade sessions and practice goals.

## Tab: Session
- Today's play queue for an arcade visit
- Add songs via the Chart Action modal (from Songs or other pages)
- Check off songs as played during a session
- "Clear All" resets the session
- DB table: `session_items`

## Tab: Goals
- Target-achievement tracker per chart
- Each goal card shows: chart name, difficulty, current vs target achievement, rating delta
- Clicking a card opens the goal detail popup
- Goals are **auto-cleared on sync** when the target is reached
- DB table: `score_trackers`

## Tab: Lists
- Permanent custom folders (emoji + name + color)
- Each list contains charts with optional target scores
- Items can have notes and sort order
- DB tables: `tracker_lists`, `tracker_items`

## Song Details Integration
- Clicking the album art jacket on any tracker card opens the `SongDetailsModal`
- On Goals cards, a hoverable 🔍 button in the top-right corner also opens it
  without dismissing the goal detail popup

## Debug-First Rule (AGENTS.md)
Every new feature or function added to the Tracker page MUST be prototyped and
testable on the debug page (`/debug/song-details`) BEFORE it is wired into the real
tracker page. The debug page uses real DB data so previews are faithful to production.

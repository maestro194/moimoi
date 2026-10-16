---
title: Tag System
createdAt: '2026-10-16T03:25:11.202Z'
updatedAt: '2026-10-16T03:25:11.202Z'
description: Community and personal chart tagging feature
tags:
  - ui
  - tags
---
# Tag System

## Overview
Tags are labels applied to specific charts (song + sheet type + difficulty).
They are displayed in the Song Details modal and used as filters on the Songs page.

## Structure
- **Tag Groups** (`tag_groups`): Color-coded categories, e.g. "Technical" (#8957e5), "Physical" (#e85c0d)
- **Tags** (`tags`): Individual labels within a group, e.g. "Gimmick", "Stream", "Stamina". Each can have a description shown in a tooltip.
- **Song Tags** (`tag_songs`): The junction table. Unique per `(tag_id, song_title, sheet_type, sheet_difficulty)`.

## API
- `GET /api/tags` — all tag groups + their tags
- `POST /api/tags/attach` — attach/detach a tag from a chart
- `GET /api/tags/combined` — combined community + personal tags for a chart
- `GET /api/tags/groups` — tag group list

## UI
- Tags shown in the Song Details modal with group color chips
- Add / remove tags inline from the modal
- Songs page filter bar has a tag filter (AND logic — song must have ALL selected tags)
- Songs can be sorted by "most tagged"

## Notes
- Tags are currently shared/global (not per-user). All users see the same tags.
- Personal tags are planned but not yet implemented.

---
id: MO-N681BV
title: Create packages/db-schema shared library
status: todo
priority: high
labels:
  - infra
createdAt: '2026-10-18T17:17:50.838Z'
updatedAt: '2026-10-18T17:17:50.838Z'
timeSpent: 0
parent: MO-YR0RRW
---
# Create packages/db-schema shared library

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 packages/db-schema/package.json with name @moimoi/db-schema
- [ ] #2 schema.ts extracted from lib/db/schema.ts — all tables, types, relations
- [ ] #3 apps/web imports schema from @moimoi/db-schema — no duplicate schema files
- [ ] #4 apps/mobile will also import from @moimoi/db-schema in Phase 1
<!-- AC:END -->


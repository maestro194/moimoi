---
id: MO-YR0RRW
title: Phase 0 — Monorepo Setup
status: todo
priority: high
labels:
  - mobile infra
createdAt: '2026-10-18T17:13:35.591Z'
updatedAt: '2026-10-18T17:13:35.591Z'
timeSpent: 0
parent: MO-9NQPT8
---
# Phase 0 — Monorepo Setup

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Migrate moimoi into a pnpm monorepo. Move web app to apps/web/, extract shared packages. See @doc/mobile-app-plan.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pnpm workspace initialised at repo root
- [ ] #2 All moimoi source moved to apps/web/ with no path breakage
- [ ] #3 packages/core created: rating.ts, types.ts, accuracy-solver.ts
- [ ] #4 packages/db-schema created: schema.ts
- [ ] #5 All imports in apps/web/ updated to use workspace package paths
- [ ] #6 Vercel root directory updated to apps/web/
- [ ] #7 npm run build passes in apps/web/
- [ ] #8 .knowns/ committed and synced to GitHub
<!-- AC:END -->


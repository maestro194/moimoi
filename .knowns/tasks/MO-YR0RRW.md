---
id: MO-YR0RRW
title: Phase 0 — Monorepo Setup
status: todo
priority: high
labels:
  - mobile infra
createdAt: '2026-10-18T17:13:35.591Z'
updatedAt: '2026-10-18T17:41:03.620Z'
timeSpent: 0
parent: MO-9NQPT8
---
# Phase 0 — Monorepo Setup

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Migrate moimoi into an npm workspace monorepo. Move web app to apps/web/, extract shared packages. See @doc/mobile-app-plan.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All moimoi source moved to apps/web/ with no path breakage
- [ ] #2 packages/core created: rating.ts, types.ts, accuracy-solver.ts
- [ ] #3 packages/db-schema created: schema.ts
- [ ] #4 All imports in apps/web/ updated to use workspace package paths
- [ ] #5 Vercel root directory updated to apps/web/
- [ ] #6 npm run build passes in apps/web/
- [ ] #7 .knowns/ committed and synced to GitHub
- [ ] #8 npm workspace initialised at repo root (private: true + workspaces in root package.json)
<!-- AC:END -->


---
id: MO-ZKQNGP
title: Verify monorepo build end-to-end
status: done
priority: high
labels:
  - infra
createdAt: '2026-10-18T17:17:58.031Z'
updatedAt: '2026-10-19T04:48:35.848Z'
completedAt: '2026-10-19T04:48:35.848Z'
timeSpent: 0
parent: MO-YR0RRW
---
# Verify monorepo build end-to-end

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pnpm install from repo root resolves all workspaces
- [ ] #2 pnpm --filter @moimoi/web build succeeds
- [ ] #3 No TypeScript or import errors in apps/web/
- [ ] #4 Vercel preview deploy passes after root directory update
- [ ] #5 Existing app behaviour unchanged at production URL
<!-- AC:END -->


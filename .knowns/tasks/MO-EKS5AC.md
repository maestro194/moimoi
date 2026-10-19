---
id: MO-EKS5AC
title: Init pnpm workspace at repo root
status: in-progress
priority: high
labels:
  - infra
createdAt: '2026-10-18T17:16:23.487Z'
updatedAt: '2026-10-18T17:37:17.975Z'
timeSpent: 0
assignee: '@me'
parent: MO-YR0RRW
---
# Init pnpm workspace at repo root

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 package.json at repo root with workspaces: ['apps/*', 'packages/*']
- [ ] #2 pnpm-workspace.yaml created
- [ ] #3 pnpm install succeeds from repo root
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add 'private: true' and 'workspaces: [apps/*, packages/*]' to existing root package.json (npm workspaces — no pnpm needed)
2. Create empty apps/ and packages/ stub directories
3. Run npm install from repo root — verify success and package-lock.json updated
4. Commit: chore: init npm workspace
<!-- SECTION:PLAN:END -->


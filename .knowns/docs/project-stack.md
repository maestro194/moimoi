---
title: Project Stack
createdAt: '2026-10-16T03:25:11.202Z'
updatedAt: '2026-10-16T03:25:11.202Z'
description: 'Tech stack, dependencies, deployment, and environment setup'
tags:
  - stack
  - infra
---
# Project Stack

## Framework & Runtime
- **Next.js 16.2.9** — App Router, Turbopack (dev), React 19.2.4, TypeScript 5
- **Tailwind CSS v4** — styling
- **Node.js 22** — runtime (v22.17.0 on Windows dev machine)

## Database
- **Neon Postgres** (serverless) — cloud-only, no local DB needed
- **Drizzle ORM** — schema in `lib/db/schema.ts`, client in `lib/db/index.ts`
- `npm run db:push` — apply schema changes; `npm run db:studio` — Drizzle Studio UI

## Key Dependencies
- `@napi-rs/canvas` — native Node addon for server-side B50 image rendering (in dev, untracked). Marked `serverExternalPackages` in `next.config.mjs`.
- `@neondatabase/serverless` — Neon HTTP driver
- `cheerio` + `node-html-parser` — HTML scraping from maimai NET
- `framer-motion` — UI animations
- `@tanstack/react-virtual` — virtualised lists (Songs page, Recent page)
- `fetch-cookie` + `tough-cookie` — cookie jar for SEGA login session

## Environment Variables
- Only one required: `DATABASE_URL` in `.env.local` (Neon connection string)
- User credentials (SEGA ID + password) stored in `settings` DB table — NOT in env vars

## Deployment
- **Vercel** — auto-deploys on push to `main` branch
- No `vercel.json` needed
- `npm run build` → `npm run start` for local production preview

## Repo Structure
- `app/` — Next.js App Router pages + API routes
- `lib/` — shared server-side logic (sync, rating, DB schema)
- `components/` — shared React components
- `public/` — static assets
- `.knowns/` — project knowledge base (this system)
- Untracked (dev-only): `app/api/b50-image/`, `lib/b50-image.ts`, `public/fonts/`

## Scripts
| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server with HMR (Turbopack) |
| `npm run build` | Production build |
| `npm run db:push` | Push Drizzle schema to Neon |
| `npm run db:studio` | Open Drizzle Studio at :4983 |
| `npm run lint` | ESLint |

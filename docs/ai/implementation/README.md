---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines for moimoi
---

# Implementation Guide

## Repository Structure

```
moimoi/
├── app/                        Next.js App Router pages
│   ├── page.tsx                Dashboard
│   ├── analysis/               Rating suggestions
│   ├── api/                    API routes (sync, songs, settings, board, tags)
│   ├── debug/                  Dev sandbox (B50 image generator, song details test)
│   ├── docs/                   User-facing documentation page
│   ├── recent/                 Recent plays feed
│   ├── scores/                 B50 grid + matrix view
│   ├── settings/               Settings UI + SEGA login modal
│   ├── songs/                  Full song browser
│   └── tracker/                Board (Goals / Session / Lists)
├── components/                 Shared UI components
│   ├── chart-detail-drawer.tsx Song detail bottom drawer
│   ├── chart-action-modal.tsx  Quick action modal for a chart
│   ├── jacket.tsx              Album art with difficulty border
│   └── page-wrapper.tsx        Nav layout wrapper
├── lib/                        Core business logic
│   ├── types.ts                Shared TypeScript types
│   ├── rating.ts               Rating calculation + B50 computation
│   ├── maimai-sync.ts          SEGA scraper (server-only)
│   ├── song-db.ts              Song data fetching + caching
│   ├── accuracy-solver.ts      Note breakdown brute-force solver
│   ├── normalize.ts            Title normalization for song matching
│   └── db/
│       ├── index.ts            Drizzle client (lazy init)
│       └── schema.ts           Full Drizzle schema
├── docs/ai/                    AI-readable project knowledge docs
│   ├── requirements/README.md
│   ├── design/README.md
│   ├── planning/README.md
│   ├── implementation/README.md  (this file)
│   ├── testing/README.md
│   ├── deployment/README.md
│   └── monitoring/README.md
├── next.config.mjs             TypeScript error bypass for build
├── .env.local                  DATABASE_URL (never committed)
└── package.json
```

## Development Setup

1. Copy `.env.local.example` → `.env.local`, fill in `DATABASE_URL` (Neon connection string)
2. `npm install`
3. `npm run dev` — starts Next.js dev server with Turbopack

Database migrations: `npm run db:push` (Drizzle Kit push, no migration files needed for dev)

## Key Patterns

### DIFF_COLOR mapping
Every component that renders difficulty colors must use this exact palette:
```ts
const DIFF_COLOR = {
  BAS:   '#3fb950',
  ADV:   '#d4a017',
  EXP:   '#f64861',
  MAS:   '#9f51dc',
  REMAS: '#e4b7eb',
  UTAGE: '#bf1b5e',
};
```
Also define lowercase variants (`bas`, `adv`, ...) for CSS-class-keyed lookups.

### UTAGE level display
UTAGE levels are stored as **strings** (e.g. `"13?"`, `"光"`, `"14+"`). Never call `.toFixed(1)` on them.
```tsx
// Correct:
{diff === 'UTAGE' ? song?.lev_utage || '?' : internalLevel.toFixed(1)}
```

### Rating calculation
Always use `computeRating(scores, songMap, currentVersion)` from `lib/rating.ts`.
Never hardcode a version number — use `detectCurrentVersion(songs)` which reads the max version from the song DB.

### Song matching
Always normalize titles before looking up in the song map:
```ts
const song = songMap.get(normalizeTitle(score.songTitle));
```

### Tracker / debug page rule (from AGENTS.md)
Every new feature for the Tracker page MUST be prototyped in `app/debug/song-details/debug-client.tsx` first, then applied to `app/tracker/tracker-client.tsx`.

### ESLint during builds
`next.config.mjs` has `typescript: { ignoreBuildErrors: true }`. The `eslint` config key was removed in Next.js 16 — ESLint no longer runs during `next build` by default. Run `npm run lint` separately for lint checks.

## Integration Points

### SEGA scraper (`lib/maimai-sync.ts`)
- Uses `fetch-cookie` + `tough-cookie` to maintain session across redirects
- Login flow: POST to SEGA auth → stores session cookie in Neon `settings` table as `maimai_clal`
- Scores scraped per difficulty (diff 0–5, where 5 = UTAGE) from `/record/musicGenre/search/?genre=99&diff=X`
- Recent plays scraped from `/record/` — difficulty detected by image filename (e.g. `playlog_diff_utage.png`)
- **Server-only** — never import in client components

### Song DB (`lib/song-db.ts`)
- Primary source: `https://maimaidx-eng.com/maimai-mobile/img/Music/` (jackets) + dxrating API
- `fetchSongs()` → tries Neon cache first, falls back to external API
- `buildSongMap(songs)` → `Map<normalizedTitle, Song>`

### Neon Postgres
- Connection: `DATABASE_URL` env var, lazy-initialized in `lib/db/index.ts`
- ORM: Drizzle with `drizzle-orm/neon-http` adapter
- Build safety: DB client init throws if `DATABASE_URL` is missing (build proceeds because `ignoreBuildErrors: true`)

## Error Handling

- All server page components use `try/catch` blocks; failures render a "Database not connected" message
- API routes return `{ ok: false, error: message }` with HTTP 500 on failures
- Scraper catches per-difficulty errors and continues (partial sync preferred over full failure)

## Performance Considerations

- Songs page uses virtualized list (`@tanstack/react-virtual`) for 15k-row rendering
- Dashboard fires all DB queries in parallel (`Promise.all`)
- `/api/songs` response has `Cache-Control: public, max-age=3600, s-maxage=86400`
- Matrix view renders only visible cells via CSS `content-visibility: auto`

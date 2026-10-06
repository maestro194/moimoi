# Moimoi — Development Setup Guide

This guide covers everything needed to run the project locally on **Arch Linux** (or any
other Linux distro). All commands are bash unless noted.

---

## 1. System Prerequisites

### Node.js

The project requires **Node.js 22** (LTS). The exact version currently used on Windows is `v22.17.0`.

**Install via `nvm` (recommended):**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# restart shell, then:
nvm install 22
nvm use 22
node --version   # should print v22.x.x
```

**Or via `pacman` / AUR:**

```bash
sudo pacman -S nodejs npm
# verify: node --version should be >= 22
```

### npm

npm `10.x` ships with Node 22 automatically. No separate install needed.

### Git

```bash
sudo pacman -S git
```

---

## 2. Native Add-on: `@napi-rs/canvas`

`@napi-rs/canvas` is used for server-side canvas rendering (B50 image generator, currently in development). It ships prebuilt `.node` binaries for `linux-x64-gnu` so **no build toolchain is needed** for that package on Arch.

However, `npm install` may need these system libs to link the binary at install time:

```bash
sudo pacman -S cairo pango libjpeg-turbo
```

If `npm install` still fails with canvas errors you can skip it temporarily:

```bash
npm install --ignore-scripts
```

The tracker, recent plays, scores, and all other pages work without it — only `/api/b50-image` requires canvas.

---

## 3. Clone the Repository

```bash
git clone https://github.com/maestro194/moimoi.git
cd moimoi
```

---

## 4. Install Dependencies

```bash
npm install
```

---

## 5. Environment Variables

Create `.env.local` in the project root:

```bash
cp .env.local.example .env.local   # if an example exists, otherwise create manually
```

`.env.local` needs:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
```

Get this from **Neon** → your project → **Connection string** (choose the pooled or
direct connection string — either works for local dev).

> **Nothing else is required.** The session cookie / credentials are stored inside the
> database itself via the Settings page.

---

## 6. Database

The database lives on **Neon** (cloud Postgres). There is nothing to run locally.

If the schema has drifted (e.g. after pulling new migrations), apply it with:

```bash
npm run db:push
```

To inspect the database visually:

```bash
npm run db:studio
# opens Drizzle Studio at http://localhost:4983
```

### Tables

| Table | Purpose |
|-------|---------|
| `scores` | Best score per (song, difficulty, type) |
| `play_log` | Chronological play history with note-breakdown `details` JSON |
| `settings` | Key-value store for session cookie, region, etc. |
| `songs` | Canonical song/chart database (seeded from otoge-db + dxrating) |
| `goals` | Tracker goals |
| `lists` | Tracker custom lists |
| `list_items` | Junction: list ↔ song |
| `chart_stats` | Aggregate stats per chart (play count, best score) |
| `tags` / `tag_groups` / `song_tags` | Community + personal tagging |

---

## 7. Development Server

```bash
npm run dev
```

Opens at **http://localhost:3000**.

Next.js 16 uses Turbopack by default for dev — incremental rebuilds are fast.

---

## 8. Build

```bash
npm run build
npm run start   # production server at :3000
```

---

## 9. Useful Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack, HMR) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Drizzle schema changes to Neon |
| `npm run db:generate` | Generate SQL migration files (not required for push workflow) |
| `npm run db:studio` | Open Drizzle Studio UI |

---

## 10. Project Structure

```
moimoi/
├── app/                    Next.js App Router pages & API routes
│   ├── api/                Server-side API handlers
│   │   ├── sync/           POST — full score sync from maimai NET
│   │   ├── chart-plays/    GET — leaderboard + play count for a chart
│   │   ├── settings/       GET/POST — credentials & config
│   │   ├── refresh-songs/  POST — fetch/update song DB from otoge-db
│   │   ├── tags/           GET/POST — tag management
│   │   └── b50-image/      GET — B50 card image (in development, untracked)
│   ├── debug/              Internal test sandbox at /debug (not in nav)
│   ├── recent/             Play history page
│   ├── scores/             Score list page
│   ├── tracker/            Session / Goals / Lists board
│   ├── analysis/           Rating analysis charts
│   ├── songs/              Song explorer + chart browser
│   └── settings/           Settings page
├── components/             Shared React components
├── lib/
│   ├── db/
│   │   ├── schema.ts       Drizzle table definitions
│   │   └── index.ts        DB client (Neon serverless)
│   ├── maimai-sync.ts      Core sync logic (fetches from maimai NET)
│   ├── rating.ts           Rating calculation (B15/B35, rank factors)
│   ├── version-label.ts    Version number → display name
│   └── b50-image.ts        B50 image renderer (in development, untracked)
├── public/                 Static assets
├── AGENTS.md               Rules for AI coding agents
├── DOCS.md                 Architecture & API reference
├── SETUP.md                ← this file
├── package.json
├── tsconfig.json
├── next.config.ts
└── .env.local              (not committed — create manually)
```

---

## 11. First-time App Setup (after deploy or fresh clone)

1. Open **http://localhost:3000/settings**
2. Paste your maimai NET session cookie into the **Session Cookie** field
3. Select your region (INTL / JP)
4. Click **Refresh Song DB** to seed the `songs` table from otoge-db (~1–2 s)
5. Click **Sync Scores** on the dashboard to pull your scores
6. Done — `/` shows your rating, `/recent` shows play history

---

## 12. Linting & Type Checking

```bash
npm run lint          # ESLint (Next.js config)
npx tsc --noEmit      # TypeScript strict check
```

Both run automatically in CI (Vercel build pipeline).

---

## 13. Gotchas on Linux

| Issue | Fix |
|-------|-----|
| `@napi-rs/canvas` install error | `sudo pacman -S cairo pango libjpeg-turbo` then `npm install` |
| Port 3000 already in use | `npm run dev -- -p 3001` |
| `.env.local` line endings | Use LF — git might have converted CRLF on Windows clone; run `dos2unix .env.local` if needed |
| Case-sensitive filenames | Linux FS is case-sensitive; imports must match exact file casing (already correct in this repo) |
| `node_modules/.bin` not in PATH | Add `export PATH="./node_modules/.bin:$PATH"` to `~/.bashrc` / `~/.zshrc` |

---

## 14. Deployment (Vercel)

The production app is deployed to **Vercel** from the `main` branch automatically.

Local changes → push to `main` → Vercel redeploys within ~1 min.

```bash
git add .
git commit -m "your message"
git push
```

No `vercel.json` is needed — default Next.js settings work out of the box.

The only required environment variable in Vercel is `DATABASE_URL` (same Neon connection string as `.env.local`).

<div align="center">
  <h1>もいもい (moimoi)</h1>
  <p>A self-hosted maimai DX score tracker with rating calculation, song database, and play history — built for the international server.</p>

  ![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-00e5bf?logo=postgresql)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
  ![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4-38bdf8?logo=tailwindcss)
</div>

---

## Features

- 📊 **Rating dashboard** — live B15 (new) + B35 (old) breakdown with accurate chart constant calculation
- 🎵 **Song database** — full otoge-db integration (intl + JP), cached in Postgres, searchable by title/artist/romaji
- 📈 **Score tracking** — syncs directly from maimai NET, stores best scores per difficulty
- 🕹️ **Recent plays** — play history with FC/FS badges and difficulty colours
- 🔍 **Songs explorer** — grid/list view, filter by level group · genre · version, sort by constant

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Neon Postgres (serverless) via Drizzle ORM |
| Song Data | [otoge-db](https://github.com/zvuc/otoge-db) (GitHub) |
| Styling | Tailwind CSS v4 + Vanilla CSS |
| Deployment | Vercel |

---

## Getting Started (local)

### 1. Clone & install

```bash
git clone https://github.com/your-username/moimoi.git
cd moimoi
npm install
```

### 2. Set up the database

Create a free [Neon](https://neon.tech) project and copy the connection string.

```bash
cp .env.local.example .env.local
# Fill in DATABASE_URL in .env.local
```

Push the schema:

```bash
npx drizzle-kit push
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Configure maimai NET

Go to **Settings** in the app and paste your maimai NET session cookie (`_t` + `userId` for International, `clal` for JP).

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import the repository at [vercel.com/new](https://vercel.com/new).
3. Add the `DATABASE_URL` environment variable (from your Neon dashboard).
4. Deploy — Vercel will build and serve the app automatically.

> **Tip:** You can link your Neon database directly in the Vercel dashboard under **Storage** to have the `DATABASE_URL` injected automatically.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |

---

## Project Structure

```
moimoi/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── scores/               # Score list with grid/list toggle
│   ├── songs/                # Song explorer
│   ├── analysis/             # Rating breakdown (B15 + B35)
│   ├── recent/               # Play history
│   ├── settings/             # Credentials & database management
│   └── api/                  # API routes (sync, settings, refresh-songs …)
├── lib/
│   ├── types.ts              # Shared TypeScript types
│   ├── db/                   # Drizzle schema & client
│   ├── song-db.ts            # Song fetch/cache (GitHub → Neon)
│   ├── rating.ts             # Rating calculation engine
│   └── maimai-sync.ts        # maimai NET scraper
└── .env.local.example        # Environment variable template
```

---

## Song Database

Song data is sourced from [zvuc/otoge-db](https://github.com/zvuc/otoge-db) and cached in your Neon database on first load (automatic). To pull the latest internal levels after a new game version:

**Settings → Song Database → Refresh Song DB**

---

## Rating Calculation

Follows the official maimai DX formula:

```
rating = floor(internalLevel × achievement × factor)
```

Where `factor` is determined by rank (SSS+ = 0.224, SSS = 0.222, …, C = 0.096).

- **New pool (B15):** songs from the current version and the previous version
- **Old pool (B35):** all other versions, best 35 scores

---

## License

MIT

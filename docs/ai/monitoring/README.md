---
phase: monitoring
title: Monitoring & Observability
description: Performance metrics, error handling, and sync telemetry
---

# Monitoring & Observability

## Key Monitoring Dimensions

### 1. maimai NET Sync Health
- **Session freshness**: `settings` table tracks `last_sync` timestamp displayed directly on Dashboard and Recent pages.
- **Scraper errors**: API routes `/api/sync` and `/api/validate-session` return structured error details when SEGA ID cookies expire or CAPTCHA triggers.
- **Fail-soft design**: Per-difficulty scraping catches exceptions per batch, ensuring partial records are saved even if one difficulty times out.

### 2. Database & API Performance
- **Neon Postgres Metrics**: Monitor query compute hours, connection pooling usage, and latency via the Neon console.
- **Vercel Serverless Function Logs**: Execution duration and runtime logs for API endpoints.
- **Client Cache Performance**: Song database cache is stored in Neon `songs` table with fallbacks to remote dxrating API.

### 3. Client Health & UX
- **Virtualized rendering**: `@tanstack/react-virtual` ensures 60 FPS performance when scrolling through 15,000+ song charts.
- **Database connection fallbacks**: All top-level page components wrap DB queries in try/catch blocks to gracefully render offline/setup instructions instead of crashing with HTTP 500.

## Error Reporting Strategy

- **API Errors**: Return JSON `{ ok: false, error: message }` with appropriate HTTP status codes (400, 401, 500).
- **Client UI Feedback**: Toast messages and status banners for sync in progress, sync succeeded, and sync failed.
- **Dev Tools**: `/debug` sandbox page to inspect canvas and raw B50 data payloads.

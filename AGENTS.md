<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:tracker-debug-rules -->
# Tracker page — debug-first development

**Route:** `app/tracker/tracker-client.tsx` (and related tracker files)
**Debug page:** `app/debug/song-details/` → accessible at `/debug/song-details`

## Rule
Every new feature or function added to the Tracker page MUST be prototyped and testable on the debug page **before** it is wired into the real tracker page. This means:

1. Implement the feature/UI in `app/debug/song-details/debug-client.tsx` first (or add a new section to that page).
2. Verify it works correctly on `/debug/song-details`.
3. Only then apply it to `app/tracker/tracker-client.tsx`.

The debug page uses real DB data (session, goals, lists, song map) — so the preview is faithful to production.
<!-- END:tracker-debug-rules -->

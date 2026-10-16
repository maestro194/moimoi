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

<!-- KNOWNS GUIDELINES START -->
# Knowns Guidelines

> These rules are NON-NEGOTIABLE. Violating them causes data corruption.

## Session Init (Required)

```json
mcp__knowns__detect_projects({})
mcp__knowns__set_project({ "projectRoot": "/path/to/project" })
```

**Skip this = tools fail or work on wrong project.**

---

## Critical Rules

| Rule | Description |
|------|-------------|
| **Never edit .md** | Use MCP tools (preferred) or CLI. NEVER edit task/doc files directly |
| **Docs first** | Read project docs BEFORE planning or coding |
| **Plan → Approve → Code** | Share plan, WAIT for approval, then implement |
| **AC after work** | Only check acceptance criteria AFTER completing work |
| **Time tracking** | `start_time` when taking task, `stop_time` when done |
| **Validate** | Run `validate` before marking task done |
| **appendNotes** | Use `appendNotes` for progress. `notes` REPLACES all (destroys history) |

---

## CLI Pitfalls

### The `-a` flag trap

| Command | `-a` means | NOT this |
|---------|------------|----------|
| `task create/edit` | `--assignee` | ~~acceptance criteria~~ |
| `doc edit` | `--append` | ~~assignee~~ |

```bash
# WRONG - sets assignee to garbage!
knowns task edit 35 -a "Criterion text"

# CORRECT
knowns task edit 35 --ac "Criterion text"
```

### --plain flag

**Only for view/list/search commands:**
```bash
knowns task <id> --plain      # ✓
knowns task list --plain      # ✓
knowns task create --plain    # ✗ ERROR
knowns task edit --plain      # ✗ ERROR
```

### Subtasks

```bash
knowns task create "Sub" --parent 48    # ✓ raw ID
knowns task create "Sub" --parent task-48  # ✗ WRONG
```

---

## References

Tasks and docs can reference each other:

| Type | Format |
|------|--------|
| Task | `@task-<id>` |
| Doc | `@doc/<path>` |
| Template | `@template/<name>` |

**Always follow refs recursively** before planning.

---

> **Full reference:** Run `knowns guidelines --plain` for complete documentation
<!-- KNOWNS GUIDELINES END -->

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trackerLists, trackerItems, sessionItems } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

// GET /api/board — fetch full board state (lists + items + session)
export async function GET() {
  const [lists, items, session] = await Promise.all([
    db.select().from(trackerLists).orderBy(asc(trackerLists.sortOrder), asc(trackerLists.createdAt)),
    db.select().from(trackerItems).orderBy(asc(trackerItems.sortOrder), asc(trackerItems.createdAt)),
    db.select().from(sessionItems).orderBy(asc(sessionItems.sortOrder), asc(sessionItems.addedAt)),
  ]);
  return NextResponse.json({ lists, items, session });
}

// POST /api/board — create or update resources
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  switch (action) {
    // ── Lists ──────────────────────────────────────────────────────────────
    case 'create_list': {
      const [list] = await db.insert(trackerLists).values({
        name: body.name,
        emoji: body.emoji ?? '🎵',
        color: body.color ?? '#8957e5',
      }).returning();
      return NextResponse.json(list);
    }

    case 'update_list': {
      const [list] = await db.update(trackerLists)
        .set({ name: body.name, emoji: body.emoji, color: body.color })
        .where(eq(trackerLists.id, body.id))
        .returning();
      return NextResponse.json(list);
    }

    case 'delete_list': {
      await db.delete(trackerLists).where(eq(trackerLists.id, body.id));
      return NextResponse.json({ ok: true });
    }

    // ── Items ──────────────────────────────────────────────────────────────
    case 'add_item': {
      // Get current max sort_order for this list
      const existing = await db.select().from(trackerItems).where(eq(trackerItems.listId, body.listId));
      const maxOrder = existing.reduce((m, i) => Math.max(m, i.sortOrder ?? 0), -1);
      const [item] = await db.insert(trackerItems).values({
        listId: body.listId,
        songTitle: body.songTitle,
        sheetType: body.sheetType ?? 'DX',
        sheetDifficulty: body.sheetDifficulty,
        targetScore: body.targetScore ?? null,
        notes: body.notes ?? null,
        sortOrder: maxOrder + 1,
      }).returning();
      return NextResponse.json(item);
    }

    case 'update_item': {
      const [item] = await db.update(trackerItems)
        .set({
          targetScore: body.targetScore ?? null,
          notes: body.notes ?? null,
          achievedAt: body.achievedAt ? new Date(body.achievedAt) : null,
        })
        .where(eq(trackerItems.id, body.id))
        .returning();
      return NextResponse.json(item);
    }

    case 'delete_item': {
      await db.delete(trackerItems).where(eq(trackerItems.id, body.id));
      return NextResponse.json({ ok: true });
    }

    case 'mark_achieved': {
      const [item] = await db.update(trackerItems)
        .set({ achievedAt: body.achieved ? new Date() : null })
        .where(eq(trackerItems.id, body.id))
        .returning();
      return NextResponse.json(item);
    }

    // ── Session ────────────────────────────────────────────────────────────
    case 'session_add': {
      const existing = await db.select().from(sessionItems);
      const maxOrder = existing.reduce((m, i) => Math.max(m, i.sortOrder ?? 0), -1);
      const [item] = await db.insert(sessionItems).values({
        songTitle: body.songTitle,
        sheetType: body.sheetType ?? 'DX',
        sheetDifficulty: body.sheetDifficulty,
        sortOrder: maxOrder + 1,
      }).returning();
      return NextResponse.json(item);
    }

    case 'session_toggle': {
      const [item] = await db.update(sessionItems)
        .set({ played: body.played })
        .where(eq(sessionItems.id, body.id))
        .returning();
      return NextResponse.json(item);
    }

    case 'session_remove': {
      await db.delete(sessionItems).where(eq(sessionItems.id, body.id));
      return NextResponse.json({ ok: true });
    }

    case 'session_clear': {
      await db.delete(sessionItems);
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}

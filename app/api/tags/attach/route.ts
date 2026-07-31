import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tagSongs } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface AttachBody {
  tagId: number;
  songTitle: string;
  sheetType: string;    // 'DX' | 'STD'
  sheetDifficulty: string; // 'BAS' | 'ADV' | 'EXP' | 'MAS' | 'REMAS'
}

function validateBody(body: unknown): body is AttachBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.tagId === 'number' &&
    typeof b.songTitle === 'string' && b.songTitle.trim().length > 0 &&
    typeof b.sheetType === 'string' &&
    typeof b.sheetDifficulty === 'string'
  );
}

// POST /api/tags/attach — attach a personal tag to a chart (idempotent)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!validateBody(body)) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const { tagId, songTitle, sheetType, sheetDifficulty } = body;

    // Upsert: ignore duplicate (unique constraint handles it gracefully)
    const existing = await db
      .select({ id: tagSongs.id })
      .from(tagSongs)
      .where(
        and(
          eq(tagSongs.tagId, tagId),
          eq(tagSongs.songTitle, songTitle),
          eq(tagSongs.sheetType, sheetType),
          eq(tagSongs.sheetDifficulty, sheetDifficulty),
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ ok: true, id: existing[0].id });
    }

    const [row] = await db
      .insert(tagSongs)
      .values({ tagId, songTitle, sheetType, sheetDifficulty })
      .returning({ id: tagSongs.id });

    return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/tags/attach]', err);
    return NextResponse.json({ error: 'Failed to attach tag' }, { status: 500 });
  }
}

// DELETE /api/tags/attach — remove a personal tag from a chart
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    if (!validateBody(body)) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const { tagId, songTitle, sheetType, sheetDifficulty } = body;

    await db
      .delete(tagSongs)
      .where(
        and(
          eq(tagSongs.tagId, tagId),
          eq(tagSongs.songTitle, songTitle),
          eq(tagSongs.sheetType, sheetType),
          eq(tagSongs.sheetDifficulty, sheetDifficulty),
        )
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/tags/attach]', err);
    return NextResponse.json({ error: 'Failed to detach tag' }, { status: 500 });
  }
}

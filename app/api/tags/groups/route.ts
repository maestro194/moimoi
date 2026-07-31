import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tagGroups } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

// POST /api/tags/groups — create a new personal tag group
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, color, sortOrder } = body as {
      name: string;
      color: string;
      sortOrder?: number;
    };

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!color || typeof color !== 'string') {
      return NextResponse.json({ error: 'color is required' }, { status: 400 });
    }

    const [group] = await db
      .insert(tagGroups)
      .values({ name: name.trim(), color, sortOrder: sortOrder ?? 0 })
      .returning({ id: tagGroups.id, name: tagGroups.name, color: tagGroups.color, sortOrder: tagGroups.sortOrder });

    return NextResponse.json({ ...group, sortOrder: group.sortOrder ?? 0, source: 'personal' }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/tags/groups]', err);
    return NextResponse.json({ error: 'Failed to create tag group' }, { status: 500 });
  }
}

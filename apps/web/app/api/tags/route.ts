import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tags } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

// POST /api/tags — create a new personal tag
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, groupId } = body as {
      name: string;
      description?: string;
      groupId?: number;
    };

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const [tag] = await db
      .insert(tags)
      .values({ name: name.trim(), description: description?.trim() ?? null, groupId: groupId ?? null })
      .returning({ id: tags.id, name: tags.name, description: tags.description, groupId: tags.groupId });

    return NextResponse.json({ ...tag, source: 'personal' }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/tags]', err);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}

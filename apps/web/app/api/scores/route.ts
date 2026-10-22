import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scores } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allScores = await db.select().from(scores).orderBy(desc(scores.playedAt));
    return NextResponse.json({ scores: allScores });
  } catch (err) {
    console.error('[api/scores] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 });
  }
}

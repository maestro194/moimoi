import { db } from '@/lib/db';
import { playLog, scoreHistory } from '@/lib/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get('title');
  const diff  = searchParams.get('diff');
  const type  = searchParams.get('type') ?? 'DX';

  if (!title || !diff) {
    return Response.json({ error: 'Missing title or diff' }, { status: 400 });
  }

  const [plays, history, countResult] = await Promise.all([
    db
      .select()
      .from(playLog)
      .where(
        and(
          eq(playLog.songTitle, title),
          eq(playLog.difficulty, diff),
          eq(playLog.songType, type),
        ),
      )
      .orderBy(desc(playLog.achievement))
      .limit(10),

    db
      .select()
      .from(scoreHistory)
      .where(
        and(
          eq(scoreHistory.songTitle, title),
          eq(scoreHistory.difficulty, diff),
          eq(scoreHistory.songType, type),
        ),
      )
      .orderBy(scoreHistory.recordedAt),

    db
      .select({ count: count() })
      .from(playLog)
      .where(
        and(
          eq(playLog.songTitle, title),
          eq(playLog.difficulty, diff),
          eq(playLog.songType, type),
        ),
      ),
  ]);

  return Response.json({ plays, history, playCount: countResult[0].count });
}

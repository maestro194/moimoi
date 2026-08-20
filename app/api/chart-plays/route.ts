import { db } from '@/lib/db';
import { playLog, scoreHistory } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
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

  // Top 10 individual plays for this chart from play_log, sorted by achievement desc
  const plays = await db
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
    .limit(10);

  // Score improvement history (from score_history — snapshots on each improvement)
  const history = await db
    .select()
    .from(scoreHistory)
    .where(
      and(
        eq(scoreHistory.songTitle, title),
        eq(scoreHistory.difficulty, diff),
        eq(scoreHistory.songType, type),
      ),
    )
    .orderBy(scoreHistory.recordedAt);

  return Response.json({ plays, history });
}

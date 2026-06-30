import { db } from '@/lib/db';
import { scores, playLog, settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function DELETE() {
  try {
    await db.delete(scores);
    await db.delete(playLog);
    // Clear sync timestamp but keep credentials/config
    await db.delete(settings).where(eq(settings.key, 'last_sync'));
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

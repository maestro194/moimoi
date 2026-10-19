import { refreshSongsDb, bustMemCache } from '@/lib/song-db';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await refreshSongsDb();

    // Bust in-memory cache so next fetchSongs() reads fresh data
    bustMemCache();
    // Revalidate all pages that consume song data
    revalidatePath('/', 'layout');

    return Response.json({
      ok: true,
      count: result.count,
      dxratingVersion: result.dxratingVersion,
      intlFetched: result.intlFetched,
      durationMs: result.durationMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

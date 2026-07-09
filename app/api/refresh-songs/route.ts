import { refreshSongsDb } from '@/lib/song-db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await refreshSongsDb();

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

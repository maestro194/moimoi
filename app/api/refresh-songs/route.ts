import { fetchSongsFromGitHub, persistSongsToDb, fetchSongs } from '@/lib/song-db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const songs = await fetchSongsFromGitHub();
    await persistSongsToDb(songs);

    // Bust the in-memory cache so next request gets fresh data from DB
    await fetchSongs(true);

    return Response.json({ ok: true, count: songs.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

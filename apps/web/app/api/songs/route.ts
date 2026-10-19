import { NextResponse } from 'next/server';
import { fetchSongs, detectCurrentVersion, getSongCategories } from '@/lib/song-db';

// Cache the server-side response for 1 hour across Vercel invocations.
// GET handlers are dynamic by default in Next.js 15+, so we opt back in here.
export const revalidate = 3600;

export async function GET() {
  try {
    const songs = await fetchSongs();
    const currentVersion = detectCurrentVersion(songs);
    const categories = getSongCategories(songs);

    return NextResponse.json(
      { songs, currentVersion, categories },
      {
        headers: {
          // Browser/CDN cache: fresh for 5 min, serve stale for up to 1 hour while revalidating
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        },
      }
    );
  } catch (err) {
    console.error('[api/songs] Error:', err);
    return NextResponse.json({ error: 'Failed to load songs' }, { status: 500 });
  }
}

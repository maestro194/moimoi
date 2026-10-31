import { NextResponse } from 'next/server';
import { getSongsVersion } from '@/lib/song-db';

// Tiny and never cached: the mobile app checks this on every sync and only downloads /api/songs when it changes
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(
      { songsVersion: await getSongsVersion() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[api/songs/version] Error:', err);
    return NextResponse.json({ error: 'Failed to read songs version' }, { status: 500 });
  }
}

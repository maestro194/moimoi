import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tagGroups, tags, tagSongs } from '@/lib/db/schema';
import type {
  CombinedTagsPayload,
  CommunityTagGroup,
  CommunityTag,
  CommunityTagSong,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

// ── Community tag cache ────────────────────────────────────────────────────────
let communityCache: {
  tagGroups: CommunityTagGroup[];
  tags: CommunityTag[];
  tagSongs: CommunityTagSong[];
} | null = null;
let communityCacheAt = 0;
const COMMUNITY_TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchCommunityTags() {
  const now = Date.now();
  if (communityCache && now - communityCacheAt < COMMUNITY_TTL_MS) {
    return communityCache;
  }

  try {
    const res = await fetch('https://miruku.dxrating.net/api/v1/tags', {
      next: { revalidate: 3600 },
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      console.warn('[tags/combined] dxrating API returned', res.status, '— returning cached or empty');
      return communityCache ?? { tagGroups: [], tags: [], tagSongs: [] };
    }

    const data = await res.json();
    communityCache = {
      tagGroups: (data.tagGroups ?? []).map((g: Record<string, unknown>) => ({ ...g, source: 'community' as const })),
      tags: (data.tags ?? []).map((t: Record<string, unknown>) => ({ ...t, source: 'community' as const })),
      tagSongs: data.tagSongs ?? [],
    };
    communityCacheAt = now;
    return communityCache;
  } catch (err) {
    console.warn('[tags/combined] Failed to fetch dxrating tags:', err);
    return communityCache ?? { tagGroups: [], tags: [], tagSongs: [] };
  }
}

// ── GET /api/tags/combined ─────────────────────────────────────────────────────
export async function GET() {
  try {
    // Fetch personal tags from local DB and community tags concurrently
    const [personalGroupRows, personalTagRows, personalTagSongRows, community] = await Promise.all([
      db.select().from(tagGroups).orderBy(tagGroups.sortOrder, tagGroups.id),
      db.select().from(tags).orderBy(tags.groupId, tags.id),
      db.select().from(tagSongs).orderBy(tagSongs.tagId),
      fetchCommunityTags(),
    ]);

    const payload: CombinedTagsPayload = {
      personal: {
        tagGroups: personalGroupRows.map(g => ({ ...g, sortOrder: g.sortOrder ?? 0, source: 'personal' as const })),
        tags: personalTagRows.map(t => ({ ...t, source: 'personal' as const })),
        tagSongs: personalTagSongRows,
      },
      community,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error('[tags/combined] Error:', err);
    return NextResponse.json({ error: 'Failed to load tags' }, { status: 500 });
  }
}

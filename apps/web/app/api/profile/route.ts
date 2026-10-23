import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settingRows = await db.select().from(settings);
    const getSet = (k: string) => settingRows.find(r => r.key === k)?.value ?? null;

    const profile = {
      name: getSet('profile_name'),
      avatar: getSet('profile_avatar'),
      courseRank: getSet('profile_course_rank'),
      classRank: getSet('profile_class_rank'),
      ratingBase: getSet('profile_rating_base'),
      rating: getSet('profile_rating'),
      title: getSet('profile_title'),
      stars: getSet('profile_stars'),
      versionPlays: getSet('profile_version_plays'),
      totalPlays: getSet('profile_total_plays'),
      lastSync: getSet('last_sync'),
    };

    return NextResponse.json({ profile });
  } catch (err) {
    console.error('[api/profile] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch player profile' }, { status: 500 });
  }
}

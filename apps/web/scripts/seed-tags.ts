/**
 * Seed script — populates default tag groups and tags into Neon.
 * Run with: npx tsx scripts/seed-tags.ts
 *
 * Safe to re-run: skips groups/tags that already exist by name.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../lib/db/schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const DEFAULT_GROUPS: Array<{ name: string; color: string; sortOrder: number; tags: Array<{ name: string; description: string }> }> = [
  {
    name: 'Technique',
    color: '#8957e5',
    sortOrder: 0,
    tags: [
      { name: 'Gimmick', description: 'Chart has tricky or unusual gimmick patterns that require special attention.' },
      { name: 'Tech', description: 'Requires precise technical execution — complex rhythms or timing windows.' },
      { name: 'Slide-heavy', description: 'Heavy slide note density.' },
      { name: 'Tap-heavy', description: 'Dense tap note patterns.' },
      { name: 'Hold-heavy', description: 'Frequent hold notes that require sustained pressing.' },
    ],
  },
  {
    name: 'Physical',
    color: '#da3633',
    sortOrder: 1,
    tags: [
      { name: 'Stream', description: 'Contains long streams of consecutive notes at high tempo.' },
      { name: 'Jack', description: 'Repeated rapid taps on the same or adjacent panels.' },
      { name: 'Vibro', description: 'Very fast alternating note patterns.' },
      { name: 'Long combo', description: 'Chart features one or more very long combo chains.' },
    ],
  },
  {
    name: 'Pattern',
    color: '#d4a017',
    sortOrder: 2,
    tags: [
      { name: 'Symmetry', description: 'Patterns are mirrored across the play field.' },
      { name: 'Alternating', description: 'Regular left-right or hand alternating patterns.' },
      { name: 'Cross-tap', description: 'Requires crossing hands or arms across the play field.' },
      { name: 'Touch-heavy', description: 'High density of touch / swipe notes (for maimai console).' },
    ],
  },
  {
    name: 'Personal',
    color: '#3fb950',
    sortOrder: 3,
    tags: [
      { name: 'Practice', description: 'Chart I am currently practicing.' },
      { name: 'Favorite', description: 'One of my favorite charts to play.' },
      { name: 'Fun', description: 'Enjoyable to play regardless of difficulty.' },
      { name: 'Hard for me', description: 'Personally challenging beyond its rated level.' },
      { name: 'Easy for me', description: 'Easier than its rated level for my skill set.' },
    ],
  },
  {
    name: 'Meta',
    color: '#60a5fa',
    sortOrder: 4,
    tags: [
      { name: 'BU (Underrated)', description: 'Boss Underrated — chart constant feels lower than the actual difficulty.' },
      { name: 'BO (Overrated)', description: 'Boss Overrated — chart constant feels higher than the actual difficulty.' },
      { name: 'Popular', description: 'Widely played or well-known in the community.' },
      { name: 'Underrated', description: 'Not widely recognized but deserves more attention.' },
    ],
  },
];

async function main() {
  console.log('🏷️  Seeding tag groups and tags...\n');

  for (const groupDef of DEFAULT_GROUPS) {
    // Check if group already exists
    const existing = await db
      .select({ id: schema.tagGroups.id })
      .from(schema.tagGroups)
      .where(eq(schema.tagGroups.name, groupDef.name))
      .limit(1);

    let groupId: number;

    if (existing.length > 0) {
      groupId = existing[0].id;
      console.log(`  ↩  Group "${groupDef.name}" already exists (id=${groupId}), skipping.`);
    } else {
      const [newGroup] = await db
        .insert(schema.tagGroups)
        .values({ name: groupDef.name, color: groupDef.color, sortOrder: groupDef.sortOrder })
        .returning({ id: schema.tagGroups.id });
      groupId = newGroup.id;
      console.log(`  ✅ Created group "${groupDef.name}" (id=${groupId}, color=${groupDef.color})`);
    }

    for (const tagDef of groupDef.tags) {
      const existingTag = await db
        .select({ id: schema.tags.id })
        .from(schema.tags)
        .where(eq(schema.tags.name, tagDef.name))
        .limit(1);

      if (existingTag.length > 0) {
        console.log(`     ↩  Tag "${tagDef.name}" already exists, skipping.`);
      } else {
        await db
          .insert(schema.tags)
          .values({ name: tagDef.name, description: tagDef.description, groupId });
        console.log(`     ✅ Created tag "${tagDef.name}"`);
      }
    }

    console.log('');
  }

  console.log('✨ Seed complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

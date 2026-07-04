'use server';

import { db } from '@/lib/db';
import { scoreTrackers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getTrackers() {
  return await db.select().from(scoreTrackers);
}

export async function addTracker(songTitle: string, difficulty: string, songType: string, targetAchievement: number) {
  await db.insert(scoreTrackers).values({
    songTitle,
    difficulty,
    songType,
    targetAchievement: String(targetAchievement),
  }).onConflictDoUpdate({
    target: [scoreTrackers.songTitle, scoreTrackers.difficulty, scoreTrackers.songType],
    set: { targetAchievement: String(targetAchievement) }
  });
  revalidatePath('/tracker');
}

export async function deleteTracker(id: number) {
  await db.delete(scoreTrackers).where(eq(scoreTrackers.id, id));
  revalidatePath('/tracker');
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { playLog, scores, scoreHistory } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { solvePlayDetails } from '@/lib/accuracy-solver';

export const dynamic = 'force-dynamic';

interface TrackInput {
  songTitle: string;
  difficulty: string; // BAS/ADV/EXP/MAS/REMAS
  songType?: string;  // DX/STD
  achievement: string | number;
  dxScore?: number | null;
  fc?: string | null;
  fs?: string | null;
  track?: number | null;
  playedAt?: string | null;
  details?: any | null;
}

function calculateDxScoreFromDetails(details: any): number | null {
  if (!details) return null;
  const d = details;
  const cp = (d.tap?.cp || 0) + (d.hold?.cp || 0) + (d.slide?.cp || 0) + (d.touch?.cp || 0) + (d.break?.cp || 0);
  const p = (d.tap?.p || 0) + (d.hold?.p || 0) + (d.slide?.p || 0) + (d.touch?.p || 0) +
            ((d.break?.p_high || 0) + (d.break?.p_low || 0) || (d.break?.p || 0));
  const gr = (d.tap?.gr || 0) + (d.hold?.gr || 0) + (d.slide?.gr || 0) + (d.touch?.gr || 0) +
             ((d.break?.g_high || 0) + (d.break?.g_mid || 0) + (d.break?.g_low || 0) || (d.break?.gr || 0));
  if (cp + p + gr > 0) {
    return cp * 3 + p * 2 + gr * 1;
  }
  return null;
}

/**
 * Re-evaluates and synchronizes the personal best in the `scores` table
 * for a specific chart by combining plays from `play_log` and progression
 * snapshots from `scoreHistory`.
 *
 * Sorts numerically descending (so 100.5% > 97.7%) and handles chart removals.
 */
async function reevaluateChartPb(songTitle: string, difficulty: string, songType: string) {
  // 1. Fetch all plays for this chart from playLog
  const plays = await db
    .select()
    .from(playLog)
    .where(
      and(
        eq(playLog.songTitle, songTitle),
        eq(playLog.difficulty, difficulty),
        eq(playLog.songType, songType)
      )
    );

  // 2. Fetch history snapshots for this chart from scoreHistory
  const history = await db
    .select()
    .from(scoreHistory)
    .where(
      and(
        eq(scoreHistory.songTitle, songTitle),
        eq(scoreHistory.difficulty, difficulty),
        eq(scoreHistory.songType, songType)
      )
    );

  // 3. Build candidate list with parsed numerical achievements
  const candidates: Array<{
    achievement: string;
    achvNum: number;
    dxScore: number | null;
    fc: string | null;
    fs: string | null;
    playedAt: Date;
  }> = [];

  for (const p of plays) {
    const num = parseFloat(p.achievement);
    if (!isNaN(num) && num > 0) {
      candidates.push({
        achievement: p.achievement,
        achvNum: num,
        dxScore: p.dxScore,
        fc: p.fc,
        fs: p.fs,
        playedAt: p.playedAt,
      });
    }
  }

  for (const h of history) {
    const num = parseFloat(h.achievement);
    if (!isNaN(num) && num > 0) {
      candidates.push({
        achievement: h.achievement,
        achvNum: num,
        dxScore: h.dxScore,
        fc: h.fc,
        fs: h.fs,
        playedAt: h.recordedAt,
      });
    }
  }

  // Sort candidates numerically descending by achievement, breaking ties with dxScore
  candidates.sort((a, b) => {
    if (b.achvNum !== a.achvNum) return b.achvNum - a.achvNum;
    return (b.dxScore ?? 0) - (a.dxScore ?? 0);
  });

  const existingScoreRows = await db
    .select()
    .from(scores)
    .where(
      and(
        eq(scores.songTitle, songTitle),
        eq(scores.difficulty, difficulty),
        eq(scores.songType, songType)
      )
    )
    .limit(1);

  if (candidates.length > 0) {
    const best = candidates[0];
    if (existingScoreRows.length > 0) {
      await db
        .update(scores)
        .set({
          achievement: best.achievement,
          dxScore: best.dxScore,
          fc: best.fc,
          fs: best.fs,
          playedAt: best.playedAt,
        })
        .where(eq(scores.id, existingScoreRows[0].id));
    } else {
      await db.insert(scores).values({
        songTitle,
        difficulty,
        songType,
        achievement: best.achievement,
        dxScore: best.dxScore,
        fc: best.fc,
        fs: best.fs,
        playedAt: best.playedAt,
      });
    }
    return best;
  } else if (existingScoreRows.length > 0) {
    // If no plays or history remain for this chart, clean up scores row
    await db.delete(scores).where(eq(scores.id, existingScoreRows[0].id));
    return null;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tracks: TrackInput[] = body.tracks;

    if (!Array.isArray(tracks) || tracks.length === 0) {
      return NextResponse.json({ error: 'Missing or empty tracks array' }, { status: 400 });
    }

    const baseTime = body.playedAt ? new Date(body.playedAt) : new Date();
    const insertedPlays = [];

    // Process tracks in chronological order (track 1 first, then 2, etc.)
    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];
      if (!t.songTitle || !t.difficulty || t.achievement === undefined) {
        continue;
      }

      const songType = t.songType ?? 'DX';
      const achievementNum = typeof t.achievement === 'number' ? t.achievement : parseFloat(t.achievement);
      const achievementStr = achievementNum.toFixed(4);

      // Track 1 played at baseTime, subsequent tracks offset by a few minutes
      const trackOffsetMs = i * 2 * 60 * 1000;
      const trackPlayedAt = t.playedAt ? new Date(t.playedAt) : new Date(baseTime.getTime() + trackOffsetMs);

      let processedDetails = t.details ? { ...t.details } : { isManual: true };
      let finalDxScore = t.dxScore ?? null;

      if (t.details && (t.details.tap || t.details.break)) {
        processedDetails = solvePlayDetails(t.details, achievementNum);
        processedDetails.isManual = true;
        if (finalDxScore === null) {
          finalDxScore = calculateDxScoreFromDetails(processedDetails);
        }
      } else {
        processedDetails.isManual = true;
      }

      // 1. Insert into playLog
      const [newPlay] = await db.insert(playLog).values({
        songTitle: t.songTitle,
        difficulty: t.difficulty,
        songType,
        achievement: achievementStr,
        dxScore: finalDxScore,
        fc: t.fc ?? null,
        fs: t.fs ?? null,
        track: t.track ?? (i + 1),
        details: processedDetails,
        isManual: true,
        playedAt: trackPlayedAt,
      }).returning();

      insertedPlays.push(newPlay);

      // 2. Check and upsert scores table if new PB
      const existingScores = await db
        .select()
        .from(scores)
        .where(
          and(
            eq(scores.songTitle, t.songTitle),
            eq(scores.difficulty, t.difficulty),
            eq(scores.songType, songType)
          )
        )
        .limit(1);

      if (existingScores.length > 0) {
        const existing = existingScores[0];
        const existingAch = parseFloat(existing.achievement);
        if (achievementNum > existingAch) {
          // PB updated!
          await db
            .update(scores)
            .set({
              achievement: achievementStr,
              dxScore: finalDxScore ?? existing.dxScore,
              fc: t.fc ?? existing.fc,
              fs: t.fs ?? existing.fs,
              playedAt: trackPlayedAt,
            })
            .where(eq(scores.id, existing.id));

          // Snapshot in scoreHistory
          await db.insert(scoreHistory).values({
            songTitle: t.songTitle,
            difficulty: t.difficulty,
            songType,
            achievement: achievementStr,
            dxScore: finalDxScore ?? existing.dxScore,
            fc: t.fc ?? existing.fc,
            fs: t.fs ?? existing.fs,
            recordedAt: trackPlayedAt,
          });
        }
      } else {
        // First time recording score for this song/chart
        await db.insert(scores).values({
          songTitle: t.songTitle,
          difficulty: t.difficulty,
          songType,
          achievement: achievementStr,
          dxScore: finalDxScore,
          fc: t.fc ?? null,
          fs: t.fs ?? null,
          playedAt: trackPlayedAt,
        });

        await db.insert(scoreHistory).values({
          songTitle: t.songTitle,
          difficulty: t.difficulty,
          songType,
          achievement: achievementStr,
          dxScore: finalDxScore,
          fc: t.fc ?? null,
          fs: t.fs ?? null,
          recordedAt: trackPlayedAt,
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: insertedPlays.length,
      insertedPlays,
    });
  } catch (error: any) {
    console.error('Error logging manual credit:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing play id' }, { status: 400 });
    }

    const existingRows = await db.select().from(playLog).where(eq(playLog.id, id)).limit(1);
    if (!existingRows.length) {
      return NextResponse.json({ error: 'Play not found' }, { status: 404 });
    }

    const existing = existingRows[0];
    const isManualPlay = existing.isManual === true || (existing.details as any)?.isManual === true;

    if (!isManualPlay) {
      return NextResponse.json(
        { error: 'Cannot edit plays imported from maimaidx.net' },
        { status: 403 }
      );
    }

    const songTitle = body.songTitle ?? existing.songTitle;
    const difficulty = body.difficulty ?? existing.difficulty;
    const songType = body.songType ?? existing.songType ?? 'DX';
    const achievementNum = body.achievement !== undefined
      ? (typeof body.achievement === 'number' ? body.achievement : parseFloat(body.achievement))
      : parseFloat(existing.achievement);
    const achievementStr = achievementNum.toFixed(4);

    let finalDxScore = body.dxScore !== undefined ? body.dxScore : existing.dxScore;
    let processedDetails = body.details !== undefined ? body.details : existing.details;

    if (processedDetails && (processedDetails.tap || processedDetails.break)) {
      processedDetails = solvePlayDetails(processedDetails, achievementNum);
      processedDetails.isManual = true;
      if (finalDxScore === null || finalDxScore === undefined) {
        finalDxScore = calculateDxScoreFromDetails(processedDetails);
      }
    } else if (processedDetails) {
      processedDetails.isManual = true;
    }

    const [updatedPlay] = await db
      .update(playLog)
      .set({
        songTitle,
        difficulty,
        songType,
        achievement: achievementStr,
        dxScore: finalDxScore,
        fc: body.fc !== undefined ? body.fc : existing.fc,
        fs: body.fs !== undefined ? body.fs : existing.fs,
        track: body.track !== undefined ? body.track : existing.track,
        details: processedDetails,
        playedAt: body.playedAt ? new Date(body.playedAt) : existing.playedAt,
      })
      .where(eq(playLog.id, id))
      .returning();

    // Re-evaluate PB in scores table for the target chart
    const reevaluatedScore = await reevaluateChartPb(songTitle, difficulty, songType);

    // If the play's chart identity changed (songTitle, difficulty, or songType),
    // also re-evaluate the previous chart so it does not leave a phantom PB behind.
    const oldTitle = existing.songTitle;
    const oldDifficulty = existing.difficulty;
    const oldType = existing.songType ?? 'DX';
    if (oldTitle !== songTitle || oldDifficulty !== difficulty || oldType !== songType) {
      await reevaluateChartPb(oldTitle, oldDifficulty, oldType);
    }

    return NextResponse.json({ success: true, updatedPlay, reevaluatedScore });
  } catch (error: any) {
    console.error('Error updating manual play:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const id = idParam ? parseInt(idParam, 10) : null;

    if (!id) {
      return NextResponse.json({ error: 'Missing play id parameter' }, { status: 400 });
    }

    const existingRows = await db.select().from(playLog).where(eq(playLog.id, id)).limit(1);
    if (!existingRows.length) {
      return NextResponse.json({ error: 'Play not found' }, { status: 404 });
    }

    const existing = existingRows[0];
    const isManualPlay = existing.isManual === true || (existing.details as any)?.isManual === true;

    if (!isManualPlay) {
      return NextResponse.json(
        { error: 'Cannot delete plays imported from maimaidx.net' },
        { status: 403 }
      );
    }

    await db.delete(playLog).where(eq(playLog.id, id));

    // Re-evaluate PB in scores table using numerical comparison across remaining plays & history
    await reevaluateChartPb(existing.songTitle, existing.difficulty, existing.songType ?? 'DX');

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('Error deleting manual play:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

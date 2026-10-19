import { getDb } from '../lib/db';
import { playLog, scores } from '../lib/db/schema';
import * as fs from 'fs';
import * as path from 'path';
import { eq, and } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const rawData = fs.readFileSync(path.join(process.cwd(), 'scratch', 'tomomai_plays.json'), 'utf-8');
const plays = JSON.parse(rawData);

const db = getDb();

async function run() {
  console.log(`Loaded ${plays.length} plays from tomomai_plays.json`);
  
  console.log('Wiping current playLog to prevent duplicates...');
  await db.delete(playLog);

  // Sort oldest to newest to replay history
  plays.sort((a: any, b: any) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime());

  let insertedLogs = 0;
  
  for (const p of plays) {
    try {
      const achievementNum = (p.achievement / 10000).toString(); 
      
      const diffMap: Record<string, string> = {
        'basic': 'BAS',
        'advanced': 'ADV',
        'expert': 'EXP',
        'master': 'MAS',
        'remaster': 'REMAS'
      };
      const diff = diffMap[p.difficulty] || 'BAS';
      const type = p.type === 'dx' ? 'DX' : 'STD';
      
      const fcMap: Record<string, string | null> = {
        'none': null, 'fc': 'FC', 'fcp': 'FC+', 'ap': 'AP', 'app': 'AP+', 'fcplus': 'FC+', 'applus': 'AP+'
      };
      
      const fsMap: Record<string, string | null> = {
        'none': null, 'sync': 'SYNC', 'fs': 'FS', 'fsp': 'FS+', 'fdx': 'FDX', 'fdxp': 'FDX+', 'fsplus': 'FS+', 'fsd': 'FDX', 'fsdplus': 'FDX+'
      };

      const fc = fcMap[p.fc] || null;
      const fsVal = fsMap[p.fs] || null;

      // Extract detailed stats
      const details = {
        fastCount: p.fastCount,
        lateCount: p.lateCount,
        totalRating: p.rating,
        ratingChange: p.ratingChange,
        combo: p.combo,
        maxCombo: p.maxCombo,
        tap: { cp: p.tapCPerfect, p: p.tapPerfect, gr: p.tapGreat, go: p.tapGood, miss: p.tapMiss },
        hold: { cp: p.holdCPerfect, p: p.holdPerfect, gr: p.holdGreat, go: p.holdGood, miss: p.holdMiss },
        slide: { cp: p.slideCPerfect, p: p.slidePerfect, gr: p.slideGreat, go: p.slideGood, miss: p.slideMiss },
        touch: { cp: p.touchCPerfect, p: p.touchPerfect, gr: p.touchGreat, go: p.touchGood, miss: p.touchMiss },
        break: { cp: p.breakCPerfect, p: p.breakPerfect, gr: p.breakGreat, go: p.breakGood, miss: p.breakMiss }
      };

      // Insert playLog
      await db.insert(playLog).values({
        songTitle: p.songName,
        difficulty: diff,
        songType: type,
        achievement: achievementNum,
        dxScore: p.dxScore,
        fc: fc,
        fs: fsVal,
        track: p.track,
        details: details,
        playedAt: new Date(p.playedAt)
      });
      
      // Update best scores
      const existing = await db.select().from(scores).where(
        and(
          eq(scores.songTitle, p.songName),
          eq(scores.difficulty, diff),
          eq(scores.songType, type)
        )
      ).limit(1);

      if (existing.length === 0) {
        await db.insert(scores).values({
          songTitle: p.songName,
          difficulty: diff,
          songType: type,
          achievement: achievementNum,
          dxScore: p.dxScore,
          fc: fc,
          fs: fsVal,
          playedAt: new Date(p.playedAt)
        });
      } else {
        const current = existing[0];
        const currentAch = parseFloat(current.achievement as string);
        const newAch = parseFloat(achievementNum);
        
        let shouldUpdate = false;
        let finalFc = current.fc;
        let finalFs = current.fs;
        let finalDx = current.dxScore;
        
        if (newAch > currentAch) {
          shouldUpdate = true;
        }
        
        // Update flags if better
        const fcRank = { null: 0, 'FC': 1, 'FC+': 2, 'AP': 3, 'AP+': 4 };
        const fsRank = { null: 0, 'SYNC': 1, 'FS': 2, 'FS+': 3, 'FDX': 4, 'FDX+': 5 };
        
        if ((fcRank[fc as keyof typeof fcRank] || 0) > (fcRank[current.fc as keyof typeof fcRank] || 0)) {
          shouldUpdate = true;
          finalFc = fc;
        }
        if ((fsRank[fsVal as keyof typeof fsRank] || 0) > (fsRank[current.fs as keyof typeof fsRank] || 0)) {
          shouldUpdate = true;
          finalFs = fsVal;
        }
        if (p.dxScore !== null && current.dxScore !== null && p.dxScore > current.dxScore) {
          shouldUpdate = true;
          finalDx = p.dxScore;
        } else if (current.dxScore === null && p.dxScore !== null) {
          shouldUpdate = true;
          finalDx = p.dxScore;
        }
        
        if (shouldUpdate) {
          await db.update(scores)
            .set({
              achievement: newAch > currentAch ? achievementNum : current.achievement,
              dxScore: finalDx,
              fc: finalFc,
              fs: finalFs,
              playedAt: newAch > currentAch ? new Date(p.playedAt) : current.playedAt
            })
            .where(eq(scores.id, current.id));
        }
      }
      
      insertedLogs++;
      if (insertedLogs % 100 === 0) console.log(`Processed ${insertedLogs} logs...`);
    } catch(e) {
      console.error('Error inserting play:', p.songName, e);
    }
  }
  
  console.log(`Finished inserting ${insertedLogs} logs!`);
}

run();

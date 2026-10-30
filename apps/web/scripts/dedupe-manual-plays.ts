/**
 * One-off cleanup: delete manual play_log entries that duplicate an official (synced) play.
 *
 * Plays entered manually while maimai NET was down were later re-imported by the sync with their
 * exact time, leaving two rows per play and breaking credit grouping. A manual row is a duplicate
 * when an official row has the same chart, track and achievement within MANUAL_MATCH_WINDOW_MS
 * (same rule the sync now uses — see lib/play-dedupe.ts). The official row is kept.
 *
 * Usage:
 *   npx tsx scripts/dedupe-manual-plays.ts           # dry run: prints the pairs, changes nothing
 *   npx tsx scripts/dedupe-manual-plays.ts --apply   # backs up, then deletes the manual duplicates
 *
 * --apply first writes the full rows it will delete to backups/dedupe-manual-plays-<timestamp>.json
 * (gitignored) and aborts if that write fails.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { inArray } from 'drizzle-orm';
import { db } from '../lib/db';
import { playLog, type SelectPlayLog } from '../lib/db/schema';
import { findManualDuplicate, isManualPlay } from '../lib/play-dedupe';

const apply = process.argv.includes('--apply');

async function main() {
  const rows = await db.select().from(playLog);
  const official = rows.filter(r => !isManualPlay(r));
  const manual = rows.filter(isManualPlay);
  console.log(`play_log: ${rows.length} rows (${official.length} official, ${manual.length} manual)\n`);

  const used = new Set<number>();
  const pairs: { official: SelectPlayLog; manual: SelectPlayLog }[] = [];
  for (const o of official) {
    const match = findManualDuplicate(o, manual.filter(m => !used.has(m.id)));
    if (match) { used.add(match.id); pairs.push({ official: o, manual: match }); }
  }

  const fmt = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ');
  for (const { official: o, manual: m } of pairs) {
    const diffMin = Math.round((m.playedAt.getTime() - o.playedAt.getTime()) / 60000);
    console.log(
      `keep official #${o.id} ${fmt(o.playedAt)}Z  delete manual #${m.id} ${fmt(m.playedAt)}Z ` +
      `(${diffMin >= 0 ? '+' : ''}${diffMin}m)  tr${o.track} ${o.difficulty} ${o.achievement}% ${o.songTitle}` +
      (o.details ? '' : '  [official has no details]'),
    );
  }
  console.log(`\n${pairs.length} manual duplicate(s) found.`);

  if (!apply) {
    console.log('Dry run — nothing deleted. Re-run with --apply to delete them.');
    return;
  }
  if (pairs.length === 0) return;

  const backupDir = path.join(process.cwd(), 'backups');
  const backupPath = path.join(backupDir, `dedupe-manual-plays-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  mkdirSync(backupDir, { recursive: true });
  writeFileSync(backupPath, JSON.stringify(pairs.map(p => ({ deleted: p.manual, keptOfficial: p.official })), null, 2));
  console.log(`Backed up ${pairs.length} row(s) to ${backupPath}`);

  await db.delete(playLog).where(inArray(playLog.id, pairs.map(p => p.manual.id)));
  console.log(`Deleted ${pairs.length} manual duplicate(s).`);
}

main()
  .then(() => process.exit(0))
  .catch(err => { console.error('dedupe failed:', err); process.exit(1); });

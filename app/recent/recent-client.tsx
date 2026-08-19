'use client';

import React, { useState, useMemo, useCallback, memo } from 'react';
import type { FC, FS, Difficulty, PlayerProfile } from '@/lib/types';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { FCBadge, FSBadge } from '@/components/badges';
import { PageWrapper } from '@/components/page-wrapper';
import { Jacket } from '@/components/jacket';
import { SyncBar } from '@/components/sync-bar';

interface HydratedLog {
  id: number;
  songTitle: string;
  difficulty: string;
  achievement: string;
  dxScore: number | null;
  fc: string | null;
  fs: string | null;
  track: number | null;
  playedAt: Date | string;
  song: any;
  internalLevel: number;
  rating: number;
  details?: any;
}

interface RecentClientProps {
  logs: HydratedLog[];
  lastSync: string | null;
  profile: PlayerProfile;
}

interface CreditGroup {
  id: string;
  timestamp: Date;
  plays: HydratedLog[];
}

// ── Pure helpers (defined outside component — no re-creation on render) ─────────

function getDifficultyColor(diff: string): string {
  switch (diff.toUpperCase()) {
    case 'BAS': return '#3fb950';
    case 'ADV': return '#d4a017';
    case 'EXP': return '#da3633';
    case 'MAS': return '#8957e5';
    case 'REMAS': return '#d2a8ff';
    default: return '#9ca3af';
  }
}

function groupLogsIntoCredits(logs: HydratedLog[]): CreditGroup[] {
  const groups: CreditGroup[] = [];
  let currentGroup: CreditGroup | null = null;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const logDate = new Date(log.playedAt);

    if (!currentGroup) {
      currentGroup = { id: log.id.toString(), timestamp: logDate, plays: [] };
      groups.push(currentGroup);
    }

    currentGroup.plays.unshift(log);

    const nextLog = logs[i + 1];
    if (nextLog) {
      const nextDate = new Date(nextLog.playedAt);
      const timeDiffMs = logDate.getTime() - nextDate.getTime();
      const isBigGap = timeDiffMs > 30 * 60 * 1000;
      const isTrackAnomaly =
        log.track !== null &&
        nextLog.track !== null &&
        nextLog.track >= log.track;

      if (log.track === 1 || isBigGap || isTrackAnomaly) {
        currentGroup = null;
      }
    }
  }

  return groups;
}

function computeDrops(d: any) {
  if (!d?.tap || !d?.break) return null;

  const tap   = d.tap.cp + d.tap.p + d.tap.gr + d.tap.go + d.tap.miss;
  const hold  = d.hold.cp + d.hold.p + d.hold.gr + d.hold.go + d.hold.miss;
  const slide = d.slide.cp + d.slide.p + d.slide.gr + d.slide.go + d.slide.miss;
  const touch = d.touch.cp + d.touch.p + d.touch.gr + d.touch.go + d.touch.miss;
  const brk   = d.break.cp + d.break.p + d.break.gr + d.break.go + d.break.miss;

  if (brk === 0) return null;

  const maxBase = (tap + slide + touch) * 500 + hold * 1000 + brk * 2500;
  if (maxBase === 0) return null;

  const bpb = 1 / brk; // bonus per break
  const bpp = 100 / maxBase; // base per point

  const std = { gr: 100 * bpp, go: 250 * bpp, miss: 500 * bpp };
  const hld = { gr: 200 * bpp, go: 500 * bpp, miss: 1000 * bpp };
  const brkRates = {
    p: 0.25 * bpb,
    gr: 0.6 * bpb + 500 * bpp,
    go: 0.7 * bpb + 1500 * bpp,
    miss: 1 * bpb + 2500 * bpp,
  };

  return { tap: std, hold: hld, slide: std, touch: std, break: brkRates };
}

function computeMaxDxScore(d: any): number {
  if (!d?.tap) return 0;
  const total =
    (d.tap.cp + d.tap.p + d.tap.gr + d.tap.go + d.tap.miss) +
    (d.hold.cp + d.hold.p + d.hold.gr + d.hold.go + d.hold.miss) +
    (d.slide.cp + d.slide.p + d.slide.gr + d.slide.go + d.slide.miss) +
    (d.touch.cp + d.touch.p + d.touch.gr + d.touch.go + d.touch.miss) +
    (d.break.cp + d.break.p + d.break.gr + d.break.go + d.break.miss);
  return total * 3;
}

// ── Note row inside the detail table ─────────────────────────────────────────
const NoteRow = memo(function NoteRow({
  label,
  data,
  dropRates,
}: {
  label: string;
  data: any;
  dropRates: any;
}) {
  if (!data || (data.cp === 0 && data.p === 0 && data.gr === 0 && data.go === 0 && data.miss === 0))
    return null;

  const total = data.cp + data.p + data.gr + data.go + data.miss;
  let loss = 0, pLoss = 0, grLoss = 0, goLoss = 0, missLoss = 0;

  if (dropRates) {
    if (label === 'Break' && 'p' in dropRates) { pLoss = dropRates.p * data.p; loss += pLoss; }
    if ('gr' in dropRates) { grLoss = dropRates.gr * data.gr; loss += grLoss; }
    if ('go' in dropRates) { goLoss = dropRates.go * data.go; loss += goLoss; }
    if ('miss' in dropRates) { missLoss = dropRates.miss * data.miss; loss += missLoss; }
  }

  return (
    <tr className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors text-center text-xs">
      <td className="py-2 px-1 font-bold text-left text-white/80">{label}</td>
      <td className="py-2 px-1 text-white/90">{total}</td>
      <td className="py-2 px-1 text-[#facc15] font-bold align-top"><div>{data.cp}</div></td>
      <td className="py-2 px-1 text-[#fb923c] font-bold align-top">
        <div>{data.p}</div>
        {pLoss > 0 && <div className="text-[10px] text-red-400 font-normal mt-0.5">(-{pLoss.toFixed(4)}%)</div>}
      </td>
      <td className="py-2 px-1 text-[#f472b6] font-bold align-top">
        <div>{data.gr}</div>
        {grLoss > 0 && <div className="text-[10px] text-red-400 font-normal mt-0.5">(-{grLoss.toFixed(4)}%)</div>}
      </td>
      <td className="py-2 px-1 text-[#4ade80] font-bold align-top">
        <div>{data.go}</div>
        {goLoss > 0 && <div className="text-[10px] text-red-400 font-normal mt-0.5">(-{goLoss.toFixed(4)}%)</div>}
      </td>
      <td className="py-2 px-1 text-white/50 font-bold align-top">
        <div>{data.miss}</div>
        {missLoss > 0 && <div className="text-[10px] text-red-400 font-normal mt-0.5">(-{missLoss.toFixed(4)}%)</div>}
      </td>
      <td className="py-2 px-1 text-white/80 align-middle">
        {loss > 0 ? `-${loss.toFixed(4)}%` : '-'}
      </td>
    </tr>
  );
});

// ── PlayRow — memoized so sibling expansions don't re-render this ─────────────
const PlayRow = memo(function PlayRow({ play }: { play: HydratedLog }) {
  const [expanded, setExpanded] = useState(false);

  const accent = getDifficultyColor(play.difficulty);
  const achvNum = parseFloat(play.achievement);
  const d = play.details;
  const hasDetails = !!d?.tap;

  // Heavy calculations — memoized and only computed once per play instance
  const { drops, maxDxScore, dxStars } = useMemo(() => {
    if (!hasDetails) return { drops: null, maxDxScore: 0, dxStars: 0 };
    const drops = computeDrops(d);
    const maxDxScore = computeMaxDxScore(d);
    let dxStars = 0;
    if (maxDxScore > 0 && play.dxScore) {
      const p = play.dxScore / maxDxScore;
      if (p >= 0.97) dxStars = 5;
      else if (p >= 0.95) dxStars = 4;
      else if (p >= 0.93) dxStars = 3;
      else if (p >= 0.90) dxStars = 2;
      else if (p >= 0.85) dxStars = 1;
    }
    return { drops, maxDxScore, dxStars };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play.id]); // keyed on play.id — never changes for a given row

  const toggle = useCallback(() => {
    if (hasDetails) setExpanded(v => !v);
  }, [hasDetails]);

  return (
    <div className="bg-[#16151f] rounded-xl overflow-hidden border border-white/5 mb-3">
      {/* ── Main Row ── */}
      <div
        className={`flex flex-col sm:flex-row items-stretch sm:items-center p-3 gap-4 ${hasDetails ? 'cursor-pointer hover:bg-white/5' : ''}`}
        onClick={toggle}
      >
        <div className="flex gap-4 flex-1 items-center min-w-0">
          <Jacket
            imageUrl={play.song?.image_url}
            intl={play.song?.intl}
            songTitle={play.songTitle}
            difficulty={play.difficulty}
            internalLevel={play.internalLevel}
            className="w-16 h-16"
          />
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h3 className="font-bold text-white text-base sm:text-lg line-clamp-1">{play.songTitle}</h3>
            <div className="text-xs text-white/50 truncate flex items-center gap-2 mt-0.5">
              <span>{play.song?.artist || 'Unknown Artist'}</span>
              {play.song?.catcode && (
                <span className="px-1.5 py-0.5 rounded bg-white/10">{play.song.catcode}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between sm:flex-col sm:items-end gap-2 sm:gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-0.5" suppressHydrationWarning>
                {new Date(play.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex justify-end gap-1">
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-bold tracking-wider">
                  Track {play.track || '?'}
                </span>
                {play.internalLevel > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ backgroundColor: accent + '22', color: accent }}>
                    {play.internalLevel.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1 mb-1">
              <span className="text-xl font-extrabold font-num drop-shadow-md" style={{ color: accent }}>
                {achvNum.toFixed(4)}<span className="text-sm ml-0.5">%</span>
              </span>
            </div>
            <div className="flex justify-end items-center gap-1">
              {play.rating > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold font-num tabular-nums">
                  ★ {play.rating}
                </span>
              )}
              <FCBadge fc={play.fc as FC} className="bg-white/5" />
              <FSBadge fs={play.fs as FS} className="bg-white/5" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Expanded Details — CSS grid trick, no layout reflow ── */}
      <div
        className="border-t border-white/5 bg-black/20 overflow-hidden transition-[grid-template-rows] duration-200"
        style={{
          display: 'grid',
          gridTemplateRows: expanded && hasDetails ? '1fr' : '0fr',
        }}
      >
        <div className="overflow-hidden">
          {/* Only render detail content once expanded for the first time */}
          {hasDetails && (
            <div className="p-4 text-xs">
              <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-2 mb-2 text-white/80 font-num text-[11px] sm:text-xs">
                <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10">
                  <span className="text-purple-400">✧ DX</span>
                  {play.dxScore || '-'} <span className="text-white/40">/ {maxDxScore || '-'}</span>
                </div>
                {maxDxScore > 0 && play.dxScore && (
                  <>
                    <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10">
                      <span className={dxStars >= 1 ? 'text-yellow-400' : 'text-white/30'}>{dxStars} ☆</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10">
                      {((play.dxScore / maxDxScore) * 100).toFixed(2)}%
                    </div>
                  </>
                )}
                {d.totalRating !== undefined && (
                  <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10">
                    <span className="text-yellow-400">🏆</span> {d.totalRating}
                    {d.ratingChange > 0 && <span className="text-green-400">~ {d.ratingChange}</span>}
                  </div>
                )}
                {d.maxCombo !== undefined && (
                  <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10">
                    <span className="text-blue-400">::: Combo</span> {d.combo} <span className="text-white/40">/ {d.maxCombo}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mb-4 text-white/80 font-num text-xs px-1">
                <div className="flex items-center gap-1.5"><span className="text-orange-400">⇡ Fast</span> {d.fastCount}</div>
                <div className="flex items-center gap-1.5"><span className="text-blue-400">⇣ Late</span> {d.lateCount}</div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center whitespace-nowrap">
                  <thead>
                    <tr className="text-white/40 border-b border-white/10">
                      <th className="pb-1.5 px-2 font-medium text-left">Type</th>
                      <th className="pb-1.5 px-2 font-medium text-white/60">Total</th>
                      <th className="pb-1.5 px-2 font-medium text-[#facc15]">C.Perfect</th>
                      <th className="pb-1.5 px-2 font-medium text-[#fb923c]">Perfect</th>
                      <th className="pb-1.5 px-2 font-medium text-[#f472b6]">Great</th>
                      <th className="pb-1.5 px-2 font-medium text-[#4ade80]">Good</th>
                      <th className="pb-1.5 px-2 font-medium text-white/40">Miss</th>
                      <th className="pb-1.5 px-2 font-medium text-red-400">Loss</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/80 font-num">
                    {[
                      { label: 'Tap',   data: d.tap,   dropRates: drops?.tap },
                      { label: 'Hold',  data: d.hold,  dropRates: drops?.hold },
                      { label: 'Slide', data: d.slide, dropRates: drops?.slide },
                      { label: 'Touch', data: d.touch, dropRates: drops?.touch },
                      { label: 'Break', data: d.break, dropRates: drops?.break },
                    ].map(row => (
                      <NoteRow key={row.label} {...row} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {!expanded && hasDetails && (
        <div
          className="flex justify-center py-1 text-white/20 cursor-pointer hover:text-white/40 transition-colors"
          onClick={toggle}
        >
          <ChevronDown size={14} />
        </div>
      )}
      {expanded && hasDetails && (
        <div
          className="flex justify-center p-2 border-t border-white/5 text-white/30 hover:text-white/60 cursor-pointer transition-colors"
          onClick={toggle}
        >
          <ChevronUp size={16} />
        </div>
      )}
    </div>
  );
});

// ── CreditGroup — memoized, re-renders only when its plays reference changes ──
const CreditSection = memo(function CreditSection({
  credit,
  creditNumber,
}: {
  credit: CreditGroup;
  creditNumber: number;
}) {
  // Reverse is done once here, not on every render
  const orderedPlays = useMemo(() => [...credit.plays].reverse(), [credit.plays]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2 border-b border-white/5 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-5 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
          <h2 className="text-lg font-bold text-white">Credit #{creditNumber}</h2>
          <div className="flex items-center gap-1.5 text-sm text-white/40 font-num" suppressHydrationWarning>
            <Clock size={14} />
            {credit.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="text-xs text-white/30 hidden sm:block" suppressHydrationWarning>
          {credit.timestamp.toLocaleDateString(undefined, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </div>
      </div>
      <div className="flex flex-col">
        {orderedPlays.map(play => (
          <PlayRow key={play.id} play={play} />
        ))}
      </div>
    </div>
  );
});

// ── Main page component ────────────────────────────────────────────────────────

const PAGE_SIZE = 20; // credits per page

export default function RecentClient({ logs, lastSync, profile }: RecentClientProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Memoized — only recomputed when logs reference changes (i.e. on page load)
  const credits = useMemo(() => groupLogsIntoCredits(logs), [logs]);
  const visibleCredits = useMemo(() => credits.slice(0, visibleCount), [credits, visibleCount]);
  const hasMore = visibleCount < credits.length;

  const loadMore = useCallback(() => {
    setVisibleCount(v => Math.min(v + PAGE_SIZE, credits.length));
  }, [credits.length]);

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-black/20 rounded-xl border border-white/5">
        <p className="text-white/50 text-sm">No recent plays found. Sync with maimai NET to see your history!</p>
      </div>
    );
  }

  return (
    <PageWrapper className="space-y-8 max-w-4xl mx-auto p-4 md:p-6">
      <SyncBar profile={profile} lastSync={lastSync} />

      <div className="space-y-10">
        {visibleCredits.map((credit, i) => (
          <CreditSection
            key={credit.id}
            credit={credit}
            creditNumber={credits.length - i + 8}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pb-8">
          <button
            onClick={loadMore}
            className="px-6 py-3 rounded-2xl text-sm font-semibold glass border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-all"
          >
            Load more · {credits.length - visibleCount} credits remaining
          </button>
        </div>
      )}
    </PageWrapper>
  );
}

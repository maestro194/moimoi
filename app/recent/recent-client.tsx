'use client';

import React, { useState } from 'react';
import type { FC, FS, Difficulty, PlayerProfile } from '@/lib/types';
import { Clock, DownloadCloud, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { FCBadge, FSBadge } from '@/components/badges';
import { PageWrapper } from '@/components/page-wrapper';
import { motion, AnimatePresence } from 'framer-motion';
import { getJacketUrl } from '@/lib/song-db';

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

function getDifficultyColor(diff: Difficulty | string): string {
  switch (diff.toUpperCase()) {
    case 'BAS': return '#3fb950';
    case 'ADV': return '#d4a017';
    case 'EXP': return '#da3633';
    case 'MAS': return '#8957e5';
    case 'REMAS': return '#d2a8ff';
    default: return '#9ca3af';
  }
}

function getDifficultyGradient(diff: Difficulty | string): string {
  switch (diff.toUpperCase()) {
    case 'BAS': return 'linear-gradient(135deg, #10b981 0%, #34d399 100%)';
    case 'ADV': return 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)';
    case 'EXP': return 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)';
    case 'MAS': return 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)';
    case 'REMAS': return 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)';
    default: return 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)';
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
      const isTrack1 = log.track === 1;
      
      const timeDiffMs = logDate.getTime() - nextDate.getTime();
      const isBigGap = timeDiffMs > 30 * 60 * 1000;
      
      const isTrackAnomaly = log.track !== null && nextLog.track !== null && nextLog.track >= log.track;
      
      if (isTrack1 || isBigGap || isTrackAnomaly) {
        currentGroup = null;
      }
    }
  }
  
  return groups;
}

function calculateDrops(d: any) {
  if (!d || !d.tap || !d.break) return null;

  const tapCount = d.tap.cp + d.tap.p + d.tap.gr + d.tap.go + d.tap.miss;
  const holdCount = d.hold.cp + d.hold.p + d.hold.gr + d.hold.go + d.hold.miss;
  const slideCount = d.slide.cp + d.slide.p + d.slide.gr + d.slide.go + d.slide.miss;
  const touchCount = d.touch.cp + d.touch.p + d.touch.gr + d.touch.go + d.touch.miss;
  const breakCount = d.break.cp + d.break.p + d.break.gr + d.break.go + d.break.miss;

  if (breakCount === 0) return null;

  const maxBasePoints = (tapCount + slideCount + touchCount) * 500 + holdCount * 1000 + breakCount * 2500;
  if (maxBasePoints === 0) return null;

  const bonusPerBreak = 1 / breakCount;
  const basePerPoint = 100 / maxBasePoints;

  const std = {
    gr: 100 * basePerPoint,
    go: 250 * basePerPoint,
    miss: 500 * basePerPoint,
  };

  const hold = {
    gr: 200 * basePerPoint,
    go: 500 * basePerPoint,
    miss: 1000 * basePerPoint,
  };

  const brk = {
    p: 0.25 * bonusPerBreak,
    gr: 0.6 * bonusPerBreak + 500 * basePerPoint,
    go: 0.7 * bonusPerBreak + 1500 * basePerPoint,
    miss: 1 * bonusPerBreak + 2500 * basePerPoint,
  };

  return { tap: std, hold: hold, slide: std, touch: std, break: brk };
}

function PlayRow({ play }: { play: HydratedLog }) {
  const [expanded, setExpanded] = useState(false);
  const accent = getDifficultyColor(play.difficulty);
  const bg = getDifficultyGradient(play.difficulty);
  const achvNum = parseFloat(play.achievement);

  const jacketUrl = play.song?.image_url 
    ? getJacketUrl(play.song.image_url, play.song.intl)
    : null;

  const d = play.details;
  const hasDetails = !!d && !!d.tap;
  const drops = hasDetails ? calculateDrops(d) : null;

  let maxDxScore = 0;
  if (hasDetails) {
    const tap = d.tap.cp + d.tap.p + d.tap.gr + d.tap.go + d.tap.miss;
    const hold = d.hold.cp + d.hold.p + d.hold.gr + d.hold.go + d.hold.miss;
    const slide = d.slide.cp + d.slide.p + d.slide.gr + d.slide.go + d.slide.miss;
    const touch = d.touch.cp + d.touch.p + d.touch.gr + d.touch.go + d.touch.miss;
    const breakCount = d.break.cp + d.break.p + d.break.gr + d.break.go + d.break.miss;
    maxDxScore = (tap + hold + slide + touch + breakCount) * 3;
  }

  let dxStars = 0;
  if (maxDxScore > 0 && play.dxScore) {
    const p = play.dxScore / maxDxScore;
    if (p >= 0.97) dxStars = 5;
    else if (p >= 0.95) dxStars = 4;
    else if (p >= 0.93) dxStars = 3;
    else if (p >= 0.90) dxStars = 2;
    else if (p >= 0.85) dxStars = 1;
  }

  return (
    <div className="bg-[#16151f] rounded-xl overflow-hidden border border-white/5 transition-all mb-3">
      {/* ── Main Row ── */}
      <div 
        className={`flex flex-col sm:flex-row items-stretch sm:items-center p-3 gap-4 ${hasDetails ? 'cursor-pointer hover:bg-white/5' : ''}`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <div className="flex gap-4 flex-1 items-center min-w-0">
          <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-black/40 relative border border-white/10">
            {jacketUrl && <img src={jacketUrl} alt={play.songTitle} className="w-full h-full object-cover" />}
            <div className="absolute bottom-0 left-0 right-0 py-0.5 text-center text-[10px] font-bold text-white shadow-lg" style={{ background: bg }}>
              {play.internalLevel > 0 ? play.internalLevel.toFixed(1) : play.difficulty}
            </div>
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h3 className="font-bold text-white text-base sm:text-lg line-clamp-1">{play.songTitle}</h3>
            <div className="text-xs text-white/50 truncate flex items-center gap-2 mt-0.5">
              <span>{play.song?.artist || 'Unknown Artist'}</span>
              {play.song?.catcode && <span className="px-1.5 py-0.5 rounded bg-white/10">{play.song.catcode}</span>}
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
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1 mb-1">
              <span className="text-xl font-extrabold font-num drop-shadow-md" style={{ color: accent }}>
                {achvNum.toFixed(4)}<span className="text-sm ml-0.5">%</span>
              </span>
            </div>
            <div className="flex justify-end gap-1">
              <FCBadge fc={play.fc as FC} className="bg-white/5" />
              <FSBadge fs={play.fs as FS} className="bg-white/5" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Expanded Details ── */}
      <AnimatePresence>
        {expanded && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 overflow-hidden bg-black/20"
          >
            <div className="p-4 text-xs">
                <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-2 mb-2 text-white/80 font-num text-[11px] sm:text-xs">
                  <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10">
                    <span className="text-purple-400">✧ DX</span>
                    {play.dxScore || '-'} <span className="text-white/40">/ {maxDxScore || '-'}</span>
                  </div>
                  {maxDxScore > 0 && play.dxScore && (
                    <>
                      <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10">
                        <span className={dxStars >= 1 ? "text-yellow-400" : "text-white/30"}>{dxStars} ☆</span>
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
                      { label: 'Tap', data: d.tap },
                      { label: 'Hold', data: d.hold },
                      { label: 'Slide', data: d.slide },
                      { label: 'Touch', data: d.touch },
                      { label: 'Break', data: d.break },
                    ].map(({ label, data }) => {
                      if (!data || (data.cp === 0 && data.p === 0 && data.gr === 0 && data.go === 0 && data.miss === 0)) return null;
                      const total = data.cp + data.p + data.gr + data.go + data.miss;
                      const key = label.toLowerCase() as keyof typeof drops;
                      const dropRates = drops?.[key];

                      let loss = 0;
                      let pLoss = 0, grLoss = 0, goLoss = 0, missLoss = 0;

                      if (dropRates) {
                        const rates = dropRates as any;
                        if (label === 'Break' && 'p' in rates) {
                          pLoss = rates.p * data.p;
                          loss += pLoss;
                        }
                        if ('gr' in rates) {
                          grLoss = rates.gr * data.gr;
                          loss += grLoss;
                        }
                        if ('go' in rates) {
                          goLoss = rates.go * data.go;
                          loss += goLoss;
                        }
                        if ('miss' in rates) {
                          missLoss = rates.miss * data.miss;
                          loss += missLoss;
                        }
                      }

                      return (
                        <tr key={label} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors text-center text-xs">
                          <td className="py-2 px-1 font-bold text-left text-white/80">{label}</td>
                          <td className="py-2 px-1 text-white/90">{total}</td>
                          <td className="py-2 px-1 text-[#facc15] font-bold align-top">
                            <div>{data.cp}</div>
                          </td>
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
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex justify-center p-2 border-t border-white/5 text-white/30 hover:text-white/60 cursor-pointer transition-colors" onClick={() => setExpanded(false)}>
              <ChevronUp size={16} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!expanded && hasDetails && (
        <div className="flex justify-center py-1 text-white/20">
          <ChevronDown size={14} />
        </div>
      )}
    </div>
  );
}

export default function RecentClient({ logs, lastSync, profile }: RecentClientProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-black/20 rounded-xl border border-white/5">
        <p className="text-white/50 text-sm">No recent plays found. Sync with maimai NET to see your history!</p>
      </div>
    );
  }

  const credits = groupLogsIntoCredits(logs);

  return (
    <PageWrapper className="space-y-8 max-w-4xl mx-auto p-4 md:p-6">
      
      {/* ── Data Snapshot Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111] border border-white/10 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
            <Clock className="text-purple-400" size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-white/60 mb-1 flex items-center gap-2">
              Data Snapshot
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg text-white tracking-wider">{profile.name}</span>
              <span className="px-2 py-0.5 rounded bg-[#da3633]/20 text-[#da3633] text-xs font-bold font-num border border-[#da3633]/30 shadow-sm">
                {profile.rating}
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-white/60 text-[10px] font-bold uppercase border border-white/5">
                {profile.region}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto relative z-10">
          <div className="text-xs text-right text-white/40 hidden md:block" suppressHydrationWarning>
            Last synced:<br/>
            {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
          </div>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 active:scale-95 transition-all shadow-lg">
            <DownloadCloud size={16} />
            Fetch New Data
          </button>
        </div>
      </div>

      {/* ── List of Credits ── */}
      <div className="space-y-10">
        {credits.map((credit, i) => (
          <div key={credit.id} className="space-y-4">
            {/* Credit Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2 border-b border-white/5 pb-2">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-5 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                <h2 className="text-lg font-bold text-white">
                  Credit #{credits.length - i}
                </h2>
                <div className="flex items-center gap-1.5 text-sm text-white/40 font-num" suppressHydrationWarning>
                  <Clock size={14} />
                  {credit.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="text-xs text-white/30 hidden sm:block" suppressHydrationWarning>
                {credit.timestamp.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
            
            {/* Rows */}
            <div className="flex flex-col">
              {[...credit.plays].reverse().map(play => (
                <PlayRow key={play.id} play={play} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}

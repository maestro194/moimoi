'use client';

import { TrendingUp, Target, ArrowUp, ChevronRight, ArrowRight, ExternalLink } from 'lucide-react';
import { FCBadge, FSBadge } from '@/components/badges';
import type { RatingData, ScoreWithRating } from '@/lib/types';
import type { TargetSuggestion } from '@/lib/rating';
import { RANK_DEFINITIONS } from '@/lib/rating';
import { PageWrapper } from '@/components/page-wrapper';
import { motion, useSpring, useTransform, Variants } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  ratingData: RatingData;
  suggestions: TargetSuggestion[];
  totalScores: number;
}

const DIFF_COLOR: Record<string, string> = {
  BAS:   '#3fb950',
  ADV:   '#d4a017',
  EXP:   '#da3633',
  MAS:   '#8957e5',
  REMAS: '#d2a8ff',
  UTAGE: '#bf1b5e',
};

function DiffBadge({ diff }: { diff: string }) {
  return (
    <span className={`diff-${diff.toLowerCase()} text-xs font-semibold px-1.5 py-0.5 rounded border uppercase shrink-0`}>
      {diff === 'REMAS' ? 'Re:M' : diff}
    </span>
  );
}

function RankDistBar({ charts }: { charts: ScoreWithRating[] }) {
  const totals: Record<string, number> = {};
  for (const c of charts) {
    totals[c.rank] = (totals[c.rank] || 0) + 1;
  }
  const total = charts.length || 1;

  const ranks = ['SSS+', 'SSS', 'SS+', 'SS', 'S+', 'S', 'AAA', 'AA', 'A'];
  const colors: Record<string, string> = {
    'SSS+': '#f9a8d4', SSS: '#f472b6', 'SS+': '#c084fc',
    SS: '#a78bfa', 'S+': '#818cf8', S: '#60a5fa',
    AAA: '#fbbf24', AA: '#fb923c', A: '#86efac',
  };

  return (
    <div className="space-y-2">
      {ranks.map((rank, i) => {
        const count = totals[rank] || 0;
        const pct = (count / total) * 100;
        return (
          <div key={rank} className="flex items-center gap-3">
            <span className="text-xs font-bold w-8 text-right shrink-0" style={{ color: colors[rank] }}>
              {rank}
            </span>
            <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, delay: i * 0.05, ease: 'easeOut' }}
                style={{ background: colors[rank] }}
              />
            </div>
            <span className="text-xs w-6 shrink-0 font-num" style={{ color: 'var(--foreground-subtle)' }}>
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 50, damping: 20 });
  const display = useTransform(spring, current => Math.round(current).toLocaleString());
  
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);
  
  return <motion.span>{display}</motion.span>;
}

export default function AnalysisClient({ ratingData, suggestions, totalScores }: Props) {
  const allCharts = [...ratingData.newCharts, ...ratingData.oldCharts];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <PageWrapper className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Analysis</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
          Rating breakdown and improvement targets
        </p>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Rating composition */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} style={{ color: 'var(--accent-pink)' }} />
            <h2 className="font-semibold text-sm">NEW Pool Grade Distribution</h2>
          </div>
          {ratingData.newCharts.length > 0
            ? <RankDistBar charts={ratingData.newCharts} />
            : <p className="text-xs text-center py-4" style={{ color: 'var(--foreground-subtle)' }}>No data yet</p>}
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} style={{ color: 'var(--accent-purple)' }} />
            <h2 className="font-semibold text-sm">OLD Pool Grade Distribution</h2>
          </div>
          {ratingData.oldCharts.length > 0
            ? <RankDistBar charts={ratingData.oldCharts} />
            : <p className="text-xs text-center py-4" style={{ color: 'var(--foreground-subtle)' }}>No data yet</p>}
        </div>
      </motion.div>

      {/* Rating summary */}
      <motion.div variants={itemVariants} className="glass rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--accent-cyan)' }}>Rating Composition</h2>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1 bg-white/5 rounded-full h-4 overflow-hidden flex">
            <div
              className="h-full rounded-l-full transition-all"
              style={{
                width: `${(ratingData.newRating / (ratingData.totalRating || 1)) * 100}%`,
                background: 'linear-gradient(90deg,#7c3aed,#f472b6)',
              }}
            />
            <div
              className="h-full rounded-r-full"
              style={{
                width: `${(ratingData.oldRating / (ratingData.totalRating || 1)) * 100}%`,
                background: 'linear-gradient(90deg,#a78bfa,#818cf8)',
              }}
            />
          </div>
          <span className="text-xl font-bold font-num gradient-text">
            <AnimatedNumber value={ratingData.totalRating} />
          </span>
        </div>
        <div className="flex gap-6 text-xs" style={{ color: 'var(--foreground-muted)' }}>
          <span>
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: '#f472b6' }} />
            NEW: {ratingData.newRating} ({ratingData.newCharts.length}/15 slots)
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: '#a78bfa' }} />
            OLD: {ratingData.oldRating} ({ratingData.oldCharts.length}/35 slots)
          </span>
        </div>
      </motion.div>

      {/* Target suggestions */}
      <motion.div variants={itemVariants} className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target size={16} style={{ color: 'var(--accent-yellow)' }} />
          <h2 className="font-semibold text-sm">Rating Improvement Targets</h2>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--accent-yellow)' }}>
            {suggestions.length} Charts
          </span>
        </div>

        {suggestions.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: 'var(--foreground-subtle)' }}>
            Sync your scores first to see suggestions!
          </p>
        ) : (
          <div className="glass rounded-xl overflow-hidden divide-y divide-white/5">
            {suggestions.map((s, i) => (
              <div
                key={`${s.songTitle}-${s.difficulty}`}
                className="flex items-center gap-3 pr-4 hover:bg-white/5 transition-colors group relative animate-slide-up"
                style={{ animationDelay: `${Math.min(i, 30) * 0.03}s`, animationFillMode: 'both' }}
              >
                {/* Ranking Number */}
                <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center bg-black/40 text-[10px] font-bold text-white/40 z-10 font-num">
                  #{i + 1}
                </div>

                <div className="w-1.5 h-16 shrink-0 z-10" style={{ background: DIFF_COLOR[s.difficulty] }} />
                
                <div className="w-12 h-12 shrink-0 bg-white/5 overflow-hidden rounded relative ml-7">
                  {s.song?.image_url ? (
                    <img loading="lazy" src={`https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/jacket/${s.song.image_url}`} alt={s.songTitle} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-white/5" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 py-2">
                  <div className="font-bold text-sm truncate text-white">{s.songTitle}</div>
                  <div className="text-xs mt-0.5 truncate flex items-center gap-2" style={{ color: 'var(--foreground-muted)' }}>
                    <span style={{ color: DIFF_COLOR[s.difficulty] }}>{s.difficulty === 'REMAS' ? 'Re:M' : s.difficulty} {s.internalLevel > 0 ? s.internalLevel.toFixed(1) : '?'}</span>
                    <span>•</span>
                    <span className="truncate">{s.song?.artist || 'Unknown Artist'}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-num font-bold text-[11px] text-white/70 tabular-nums">
                    {s.currentRank} {s.currentAchievement.toFixed(4)}% 
                    <span className="mx-1 opacity-50">→</span> 
                    <span style={{ color: 'var(--accent-yellow)' }}>{s.targetRank} {s.targetAchievement.toFixed(2)}%</span>
                  </div>
                  <div className="flex gap-1 justify-end mt-1">
                    <FCBadge fc={s.fc} />
                    <FSBadge fs={s.fs} />
                  </div>
                </div>

                <div className="font-num text-right shrink-0 tabular-nums flex flex-col items-end justify-center w-14 border-r border-white/10 pr-4 mr-1 hidden sm:flex">
                  <div className="text-[10px] text-white/40 mb-0.5 uppercase tracking-wider font-sans">Chart</div>
                  <div className="text-sm font-bold leading-none" style={{ color: DIFF_COLOR[s.difficulty] }}>
                    {s.targetRating}
                  </div>
                  <div className="flex items-center gap-0.5 mt-1 text-white/50">
                    <ArrowUp size={8} />
                    <span className="text-[9px] font-bold">+{s.ratingGain.toFixed(0)}</span>
                  </div>
                </div>

                <div className="font-num text-right shrink-0 tabular-nums flex flex-col items-end justify-center w-12">
                  <div className="text-[10px] text-[#4ade80]/60 mb-0.5 uppercase tracking-wider font-sans">Total Δ</div>
                  <div className="flex items-center gap-0.5 text-[#4ade80]">
                    <ArrowUp size={12} />
                    <span className="text-lg font-bold">+{s.totalRatingGain.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
      </motion.div>
    </PageWrapper>
  );
}

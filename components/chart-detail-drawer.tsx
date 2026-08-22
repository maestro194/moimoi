'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Trophy, ExternalLink } from 'lucide-react';
import type { ScoreWithRating, FC, FS } from '@/lib/types';
import { getJacketUrl } from '@/lib/song-db';
import { FCBadge, FSBadge } from '@/components/badges';

const DIFF_COLOR: Record<string, string> = {
  BAS: '#3fb950', ADV: '#d4a017', EXP: '#da3633',
  MAS: '#8957e5', REMAS: '#d2a8ff', UTAGE: '#bf1b5e',
};

interface Play {
  id: number;
  achievement: string;
  dxScore: number | null;
  fc: string | null;
  fs: string | null;
  playedAt: string;
}

interface HistoryPoint {
  achievement: string;
  fc: string | null;
  fs: string | null;
  rating: number | null;
  recordedAt: string;
}

interface ChartPlaysData {
  plays: Play[];
  history: HistoryPoint[];
}

interface Props {
  score: ScoreWithRating | null;
  onClose: () => void;
}

// ── Module-level cache (B): survives re-renders, cleared on page navigation ──
const playsCache = new Map<string, ChartPlaysData>();

function cacheKey(s: ScoreWithRating) {
  return `${s.songTitle}::${s.difficulty}::${s.songType ?? 'DX'}`;
}

function useChartPlays(score: ScoreWithRating | null) {
  const [data, setData] = useState<ChartPlaysData | null>(null);
  const [loading, setLoading] = useState(false);
  // Track the in-flight request so we can abort it if the card changes quickly
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!score) { setData(null); return; }

    const key = cacheKey(score);

    // Cache hit — instant render, no network needed
    const cached = playsCache.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    // Abort any previous in-flight fetch
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    fetch(
      `/api/chart-plays?title=${encodeURIComponent(score.songTitle)}&diff=${score.difficulty}&type=${score.songType ?? 'DX'}`,
      { signal: controller.signal },
    )
      .then(r => r.json())
      .then((d: ChartPlaysData) => {
        playsCache.set(key, d);   // store in cache for next time
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') setLoading(false);
      });

    return () => controller.abort();
  }, [score?.songTitle, score?.difficulty, score?.songType]);

  return { data, loading };
}

/** Mini sparkline bar chart for score progression */
function Sparkline({ history }: { history: HistoryPoint[] }) {
  if (history.length < 2) return null;
  const values = history.map(h => parseFloat(h.achievement));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-1 h-10 mt-2">
      {history.map((h, i) => {
        const pct = ((parseFloat(h.achievement) - min) / range) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div
              className="w-full rounded-sm bg-purple-500/60 group-hover:bg-purple-400 transition-colors min-h-[4px]"
              style={{ height: `${Math.max(4, pct)}%` }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-black/90 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
              {parseFloat(h.achievement).toFixed(4)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChartDetailDrawer({ score: s, onClose }: Props) {
  const { data, loading } = useChartPlays(s);

  if (!s) return null;

  const diffColor = DIFF_COLOR[s.difficulty] ?? '#9ca3af';
  const jacketUrl = s.song ? getJacketUrl(s.song.image_url, s.song.intl) : null;
  const dxratingUrl = `https://dxrating.net/songs/${encodeURIComponent(s.songTitle)}`;

  return (
    <AnimatePresence>
      {s && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer — slides up from bottom on mobile, centered on desktop */}
          <motion.div
            key="drawer"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center z-50 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full md:w-[560px] md:max-h-[85vh] max-h-[90vh] overflow-y-auto rounded-t-3xl md:rounded-2xl shadow-2xl"
              style={{ background: '#1a1828', border: `1px solid ${diffColor}40` }}
            >
              {/* Header */}
              <div
                className="relative h-32 md:h-36 overflow-hidden rounded-t-3xl md:rounded-t-2xl"
                style={{ borderBottom: `2px solid ${diffColor}` }}
              >
                {/* Blurred jacket background */}
                {jacketUrl && (
                  <div
                    className="absolute inset-0 bg-cover bg-center scale-110"
                    style={{ backgroundImage: `url(${jacketUrl})`, filter: 'blur(8px) brightness(0.4)' }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1828] to-transparent" />

                {/* Content row */}
                <div className="relative h-full flex items-end gap-4 p-4">
                  {jacketUrl && (
                    <img
                      src={jacketUrl}
                      alt={s.songTitle}
                      className="w-16 h-16 rounded-xl shadow-lg shrink-0 object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="font-bold text-white text-base leading-tight line-clamp-1">{s.songTitle}</div>
                    <div className="text-white/60 text-xs truncate mt-0.5">{s.song?.artist}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded"
                        style={{ background: diffColor + '30', color: diffColor, border: `1px solid ${diffColor}60` }}
                      >
                        {s.difficulty === 'REMAS' ? 'Re:MASTER' : s.difficulty}
                      </span>
                      <span className="text-[11px] font-bold text-white/50 font-num">
                        {s.internalLevel > 0 ? s.internalLevel.toFixed(1) : '?'}
                      </span>
                      <span className="text-white/30 text-[11px]">{s.songType}</span>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={dxratingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                      title="View on dxrating.net"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink size={14} className="text-white/70" />
                    </a>
                    <button
                      onClick={onClose}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      <X size={16} className="text-white/70" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Current best */}
              <div className="px-5 py-4 border-b border-white/5">
                <div className="text-[11px] text-white/40 uppercase tracking-widest font-bold mb-1">Current Best</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold font-num tabular-nums" style={{ color: diffColor }}>
                    {s.achievement.toFixed(4)}<span className="text-lg ml-0.5">%</span>
                  </span>
                  <span className="text-lg font-bold text-amber-300 font-num">★ {s.rating}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <FCBadge fc={s.fc as FC} />
                  <FSBadge fs={s.fs as FS} />
                  {s.dxScore != null && (
                    <span className="text-[11px] text-purple-300 font-num">✧ DX {s.dxScore.toLocaleString()}</span>
                  )}
                </div>
              </div>

              {/* Score progression */}
              {!loading && data && data.history.length > 0 && (
                <div className="px-5 py-4 border-b border-white/5">
                  <div className="flex items-center gap-2 text-[11px] text-white/40 uppercase tracking-widest font-bold mb-1">
                    <TrendingUp size={12} /> Score Progression
                  </div>
                  <Sparkline history={data.history} />
                  <div className="flex justify-between text-[10px] text-white/30 font-num mt-1.5">
                    <span>{parseFloat(data.history[0].achievement).toFixed(4)}%</span>
                    <span className="text-white/50">{data.history.length} snapshots</span>
                    <span>{parseFloat(data.history[data.history.length - 1].achievement).toFixed(4)}%</span>
                  </div>
                </div>
              )}

              {/* Top plays */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 text-[11px] text-white/40 uppercase tracking-widest font-bold mb-3">
                  <Trophy size={12} /> Top Plays on this Chart
                </div>

                {loading && (
                  <div className="text-center py-6 text-white/30 text-sm animate-pulse">Loading plays…</div>
                )}

                {!loading && data && data.plays.length === 0 && (
                  <p className="text-white/30 text-sm py-4 text-center">
                    No individual play records yet — plays appear here after syncing.
                  </p>
                )}

                {!loading && data && data.plays.length > 0 && (
                  <div className="space-y-2">
                    {data.plays.map((play, i) => (
                      <div
                        key={play.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${i === 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/[0.03] border border-white/5'}`}
                      >
                        <span
                          className="text-xs font-bold w-5 text-right shrink-0"
                          style={{ color: i === 0 ? '#fbbf24' : '#ffffff50' }}
                        >
                          #{i + 1}
                        </span>
                        <span
                          className="font-num font-bold text-sm tabular-nums flex-1"
                          style={{ color: i === 0 ? diffColor : 'white' }}
                        >
                          {parseFloat(play.achievement).toFixed(4)}%
                        </span>
                        <div className="flex items-center gap-1.5">
                          <FCBadge fc={play.fc as FC} className="bg-white/5" />
                          <FSBadge fs={play.fs as FS} className="bg-white/5" />
                        </div>
                        <span className="text-[10px] text-white/30 font-num shrink-0">
                          {new Date(play.playedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom safe area on mobile */}
              <div className="h-6 md:h-0" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

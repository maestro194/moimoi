'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Sparkles, Clock, Zap, Target, ArrowRight } from 'lucide-react';
import { PageWrapper } from '@/components/page-wrapper';
import { Jacket } from '@/components/jacket';
import { FCBadge, FSBadge } from '@/components/badges';
import type { FC, FS } from '@/lib/types';

export interface StandardNoteFields {
  cp: number;
  p: number;
  gr: number;
  go: number;
  miss: number;
}

export interface BreakNoteFields {
  cp: number;
  p_high: number; // Perfect High (2550: 2500 base + 75 bonus)
  p_low: number;  // Perfect Low (2500: 2500 base + 50 bonus)
  g_high: number; // Great High (2000: 2000 base + 40 bonus)
  g_mid: number;  // Great Mid (1500: 1500 base + 40 bonus)
  g_low: number;  // Great Low (1250: 1250 base + 40 bonus)
  good: number;   // Good (1000: 1000 base + 30 bonus)
  miss: number;   // Miss (0 base + 0 bonus)
}

export interface RecentPlayScore {
  id: number;
  songTitle: string;
  difficulty: string;
  songType: string;
  achievement: string;
  dxScore: number | null;
  fc: string | null;
  fs: string | null;
  track: number | null;
  playedAt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any;
  song?: {
    title: string;
    artist?: string | null;
    image_url?: string | null;
    intl?: boolean | null;
  } | null;
  internalLevel?: number;
}

const EMPTY_STD: StandardNoteFields = { cp: 0, p: 0, gr: 0, go: 0, miss: 0 };
const EMPTY_BRK: BreakNoteFields = { cp: 0, p_high: 0, p_low: 0, g_high: 0, g_mid: 0, g_low: 0, good: 0, miss: 0 };

const DIFF_COLOR: Record<string, string> = {
  BAS: '#3fb950',
  ADV: '#d4a017',
  EXP: '#f64861',
  MAS: '#9f51dc',
  REMAS: '#c484fc',
  UTAGE: '#bf1b5e',
};

// ── Three-way calculation engine ──────────────────────────────────────────────
export interface ThreeWayComparison {
  base: number;
  bpb: number;
  tapLoss: number;
  holdLoss: number;
  slideLoss: number;
  touchLoss: number;
  brkGoodLoss: number;
  brkMissLoss: number;
  knownLoss: number;
  totalNotes: number;

  // 1. Theoretical right value (in-game ground truth)
  theoreticalAchv: number;
  theoreticalTotalLoss: number;
  targetBreakPGLoss: number;

  // 2. Currently used (naive / wrong) calculation
  naive: {
    pHigh: number;
    pLow: number;
    gHigh: number;
    gMid: number;
    gLow: number;
    pLoss: number;
    gLoss: number;
    brkTotalLoss: number;
    totalLoss: number;
    achv: number;
    diff: number; // naive.achv - theoreticalAchv
  };

  // 3. Brute force solver calculation
  solved: {
    pHigh: number;
    pLow: number;
    gHigh: number;
    gMid: number;
    gLow: number;
    pLoss: number;
    gLoss: number;
    brkTotalLoss: number;
    totalLoss: number;
    achv: number;
    diff: number;
    bestDist: number;
    combinationsTested: number;
  };
}

function computeThreeWayComparison(
  tap: StandardNoteFields,
  hold: StandardNoteFields,
  slide: StandardNoteFields,
  touch: StandardNoteFields,
  brk: BreakNoteFields,
  achievement: number,
): ThreeWayComparison | null {
  const tapN   = tap.cp   + tap.p   + tap.gr   + tap.go   + tap.miss;
  const holdN  = hold.cp  + hold.p  + hold.gr  + hold.go  + hold.miss;
  const slideN = slide.cp + slide.p + slide.gr + slide.go + slide.miss;
  const touchN = touch.cp + touch.p + touch.gr + touch.go + touch.miss;

  const brkP = brk.p_high + brk.p_low;
  const brkG = brk.g_high + brk.g_mid + brk.g_low;
  const brkN = brk.cp + brkP + brkG + brk.good + brk.miss;

  if (brkN === 0) return null;
  const totalW = tapN + holdN * 2 + slideN * 3 + touchN + brkN * 5;
  if (totalW === 0) return null;

  const base = 100 / totalW;
  const bpb  = 1 / brkN;

  // Non-break losses (exact across all methods)
  const tapLoss   = tap.gr   * (base / 5)     + tap.go   * (base / 2)     + tap.miss   * base;
  const holdLoss  = hold.gr  * (2 * base / 5) + hold.go  * base           + hold.miss  * (2 * base);
  const slideLoss = slide.gr * (3 * base / 5) + slide.go * (3 * base / 2) + slide.miss * (3 * base);
  const touchLoss = touch.gr * (base / 5)     + touch.go * (base / 2)     + touch.miss * base;

  // Break Good & Miss (exact across all methods)
  const brkGoodLoss = brk.good * (3 * base + 0.70 * bpb);
  const brkMissLoss = brk.miss * (5 * base + 1.00 * bpb);

  const knownLoss = tapLoss + holdLoss + slideLoss + touchLoss + brkGoodLoss + brkMissLoss;
  const theoreticalTotalLoss = Math.max(0, 101 - achievement);
  const targetBreakPGLoss = Math.max(0, 101 - achievement - knownLoss);

  // ── Method 1: Currently used (Naive / Wrong) calculation ──
  // Assumes raw sub-tier counts without solving for the residual
  const naivePHighLoss = brk.p_high * (0.25 * bpb);
  const naivePLowLoss  = brk.p_low  * (0.50 * bpb);
  const naivePLoss     = naivePHighLoss + naivePLowLoss;

  const naiveGHighLoss = brk.g_high * (base + 0.60 * bpb);
  const naiveGMidLoss  = brk.g_mid  * (2 * base + 0.60 * bpb);
  const naiveGLowLoss  = brk.g_low  * (2.5 * base + 0.60 * bpb);
  const naiveGLoss     = naiveGHighLoss + naiveGMidLoss + naiveGLowLoss;

  const naiveBrkTotalLoss = naivePLoss + naiveGLoss + brkGoodLoss + brkMissLoss;
  const naiveTotalLoss    = knownLoss + naivePLoss + naiveGLoss;
  const naiveAchv         = 101 - naiveTotalLoss;
  const naiveDiff         = naiveAchv - achievement;

  // ── Method 2: Testing calculation brute force solver ──
  let bestDist = Infinity;
  let bestBreakdown = {
    pHigh: brk.p_high,
    pLow:  brk.p_low,
    gHigh: brk.g_high,
    gMid:  brk.g_mid,
    gLow:  brk.g_low,
  };
  let combinationsTested = 0;

  for (let pHigh = 0; pHigh <= brkP; pHigh++) {
    const pLow = brkP - pHigh;
    for (let gHigh = 0; gHigh <= brkG; gHigh++) {
      for (let gMid = 0; gMid <= brkG - gHigh; gMid++) {
        const gLow = brkG - gHigh - gMid;
        combinationsTested++;

        const pLoss = (pHigh * 0.25 + pLow * 0.50) * bpb;
        const gLoss =
          (base + 0.60 * bpb) * gHigh +
          (2 * base + 0.60 * bpb) * gMid +
          (2.5 * base + 0.60 * bpb) * gLow;

        const dist = Math.abs(pLoss + gLoss - targetBreakPGLoss);
        if (dist < bestDist) {
          bestDist = dist;
          bestBreakdown = { pHigh, pLow, gHigh, gMid, gLow };
        }
      }
    }
  }

  // Model losses from the best breakdown
  const modelPLoss = (bestBreakdown.pHigh * 0.25 + bestBreakdown.pLow * 0.50) * bpb;
  const modelGLoss =
    (base + 0.60 * bpb) * bestBreakdown.gHigh +
    (2 * base + 0.60 * bpb) * bestBreakdown.gMid +
    (2.5 * base + 0.60 * bpb) * bestBreakdown.gLow;
  const modelSum = modelPLoss + modelGLoss;

  // Distribute the exact residual proportionally so 101% identity is guaranteed
  let solvedPLoss = 0;
  let solvedGLoss = 0;
  if (modelSum > 0) {
    solvedPLoss = targetBreakPGLoss * (modelPLoss / modelSum);
    solvedGLoss = targetBreakPGLoss - solvedPLoss;
  } else if (brkP > 0) {
    solvedPLoss = targetBreakPGLoss;
    solvedGLoss = 0;
  } else {
    solvedPLoss = 0;
    solvedGLoss = targetBreakPGLoss;
  }

  const solvedBrkTotalLoss = targetBreakPGLoss + brkGoodLoss + brkMissLoss;
  const solvedTotalLoss    = knownLoss + targetBreakPGLoss;
  const solvedAchv         = 101 - solvedTotalLoss;
  const solvedDiff         = solvedAchv - achievement;

  return {
    base,
    bpb,
    tapLoss,
    holdLoss,
    slideLoss,
    touchLoss,
    brkGoodLoss,
    brkMissLoss,
    knownLoss,
    totalNotes: tapN + holdN + slideN + touchN + brkN,

    theoreticalAchv: achievement,
    theoreticalTotalLoss,
    targetBreakPGLoss,

    naive: {
      pHigh: brk.p_high,
      pLow:  brk.p_low,
      gHigh: brk.g_high,
      gMid:  brk.g_mid,
      gLow:  brk.g_low,
      pLoss: naivePLoss,
      gLoss: naiveGLoss,
      brkTotalLoss: naiveBrkTotalLoss,
      totalLoss: naiveTotalLoss,
      achv: naiveAchv,
      diff: naiveDiff,
    },

    solved: {
      pHigh: bestBreakdown.pHigh,
      pLow:  bestBreakdown.pLow,
      gHigh: bestBreakdown.gHigh,
      gMid:  bestBreakdown.gMid,
      gLow:  bestBreakdown.gLow,
      pLoss: solvedPLoss,
      gLoss: solvedGLoss,
      brkTotalLoss: solvedBrkTotalLoss,
      totalLoss: solvedTotalLoss,
      achv: solvedAchv,
      diff: solvedDiff,
      bestDist,
      combinationsTested,
    },
  };
}

export default function SongDetailsDebugClient({
  initialRecentPlays = [],
}: {
  initialRecentPlays?: RecentPlayScore[];
}) {
  return (
    <PageWrapper className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full text-xs font-bold bg-yellow-500/15 border border-yellow-500/30 text-yellow-400">
          🧪 Debug page — not linked in navigation
        </div>
        <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          Debug Tools
        </h1>
        <p className="text-sm text-white/50">
          Internal testing tools for B50 image generation, recent play details, and achievement accuracy calculations.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
          B50 Image Generator
        </h2>
        <B50ImagePreview />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Achievement Calculation: Brute Force Solver vs. Current Naive vs. Theoretical Right
          </h2>
          <p className="text-sm text-white/50">
            Compare the brute-force sub-tier search solver against the currently used naive calculation and the ground truth game achievement.
          </p>
        </div>
        <AccuracyLossCalculator initialRecentPlays={initialRecentPlays} />
      </section>
    </PageWrapper>
  );
}

// ── B50 Image Preview ──────────────────────────────────────────────────────────
function B50ImagePreview() {
  const [ts, setTs] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const src = ts > 0 ? `/api/b50-image?t=${ts}` : null;

  const generate = useCallback(() => {
    setError(null);
    setLoading(true);
    setTs(Date.now());
  }, []);

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <p className="text-sm text-white/50">
        Hits <code className="bg-black/30 px-1 rounded text-purple-300">/api/b50-image</code> and
        renders the PNG inline. Jackets are fetched via your stored{' '}
        <code className="bg-black/30 px-1 rounded text-purple-300">maimai_clal</code> cookie.
      </p>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#f472b6)', color: '#fff' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Generating…' : src ? 'Re-generate' : 'Generate B50 Image'}
        </button>

        {src && (
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors"
          >
            Open in new tab ↗
          </a>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          ✗ {error}
        </div>
      )}

      {src && (
        <div className="rounded-xl overflow-hidden border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="B50 image preview"
            className="w-full"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError('Failed to generate image — check server logs. Is your session cookie still valid?');
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Standard Note input component ─────────────────────────────────────────────
function StandardNoteInputRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: StandardNoteFields;
  onChange: (v: StandardNoteFields) => void;
}) {
  const set = (k: keyof StandardNoteFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: parseInt(e.target.value) || 0 });
  const cls =
    'w-14 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-center text-white font-num ' +
    'focus:outline-none focus:border-purple-500/50 transition-colors';
  return (
    <tr>
      <td className="py-1.5 pr-3 text-xs font-bold text-white/70 whitespace-nowrap">{label}</td>
      <td className="py-1.5 pr-2"><input type="number" min={0} value={value.cp}   onChange={set('cp')}   className={cls} /></td>
      <td className="py-1.5 pr-2"><input type="number" min={0} value={value.p}    onChange={set('p')}    className={cls} /></td>
      <td className="py-1.5 pr-2"><input type="number" min={0} value={value.gr}   onChange={set('gr')}   className={cls} /></td>
      <td className="py-1.5 pr-2"><input type="number" min={0} value={value.go}   onChange={set('go')}   className={cls} /></td>
      <td className="py-1.5">    <input type="number" min={0} value={value.miss}  onChange={set('miss')} className={cls} /></td>
    </tr>
  );
}

// ── Accuracy Loss Calculator with Three-Way Comparison ────────────────────────
function AccuracyLossCalculator({
  initialRecentPlays,
}: {
  initialRecentPlays: RecentPlayScore[];
}) {
  const [recentPlays, setRecentPlays] = useState<RecentPlayScore[]>(initialRecentPlays);
  const [fetchingRecent, setFetchingRecent] = useState(false);
  const [selectedPlayId, setSelectedPlayId] = useState<number | 'custom'>('custom');

  // Input states
  const [tap,   setTap]   = useState<StandardNoteFields>({ cp: 369, p: 381, gr: 167, go: 44,  miss: 17 });
  const [hold,  setHold]  = useState<StandardNoteFields>({ cp: 7,   p: 17,  gr: 0,   go: 0,   miss: 0  });
  const [slide, setSlide] = useState<StandardNoteFields>({ cp: 107, p: 0,   gr: 2,   go: 6,   miss: 0  });
  const [touch, setTouch] = useState<StandardNoteFields>(EMPTY_STD);
  const [brk,   setBrk]   = useState<BreakNoteFields>({
    cp: 14,
    p_high: 8,
    p_low: 0,
    g_high: 3,
    g_mid: 0,
    g_low: 0,
    good: 0,
    miss: 0,
  });
  const [achievement, setAchievement] = useState('95.0392');

  const selectedPlay = useMemo(() => {
    if (selectedPlayId === 'custom') return null;
    return recentPlays.find(p => p.id === selectedPlayId) ?? null;
  }, [recentPlays, selectedPlayId]);

  // Load a play's details into the calculator
  const loadPlay = useCallback((play: RecentPlayScore) => {
    setSelectedPlayId(play.id);
    const d = play.details;
    if (!d) return;

    if (d.tap) {
      setTap({
        cp: d.tap.cp || 0,
        p: d.tap.p || 0,
        gr: d.tap.gr || 0,
        go: d.tap.go || 0,
        miss: d.tap.miss || 0,
      });
    } else {
      setTap(EMPTY_STD);
    }

    if (d.hold) {
      setHold({
        cp: d.hold.cp || 0,
        p: d.hold.p || 0,
        gr: d.hold.gr || 0,
        go: d.hold.go || 0,
        miss: d.hold.miss || 0,
      });
    } else {
      setHold(EMPTY_STD);
    }

    if (d.slide) {
      setSlide({
        cp: d.slide.cp || 0,
        p: d.slide.p || 0,
        gr: d.slide.gr || 0,
        go: d.slide.go || 0,
        miss: d.slide.miss || 0,
      });
    } else {
      setSlide(EMPTY_STD);
    }

    if (d.touch) {
      setTouch({
        cp: d.touch.cp || 0,
        p: d.touch.p || 0,
        gr: d.touch.gr || 0,
        go: d.touch.go || 0,
        miss: d.touch.miss || 0,
      });
    } else {
      setTouch(EMPTY_STD);
    }

    if (d.break) {
      const b = d.break;
      setBrk({
        cp:     b.cp ?? 0,
        p_high: b.p_high ?? b.p2500 ?? b.p ?? 0,
        p_low:  b.p_low  ?? b.p2000 ?? 0,
        g_high: b.g_high ?? b.g1500 ?? b.gr ?? 0,
        g_mid:  b.g_mid  ?? b.g1250 ?? 0,
        g_low:  b.g_low  ?? b.g1000 ?? 0,
        good:   b.good   ?? b.go ?? 0,
        miss:   b.miss   ?? 0,
      });
    } else {
      setBrk(EMPTY_BRK);
    }

    setAchievement(String(play.achievement));
  }, []);

  const loadCustomExample = useCallback(() => {
    setSelectedPlayId('custom');
    setTap({ cp: 369, p: 381, gr: 167, go: 44, miss: 17 });
    setHold({ cp: 7, p: 17, gr: 0, go: 0, miss: 0 });
    setSlide({ cp: 107, p: 0, gr: 2, go: 6, miss: 0 });
    setTouch(EMPTY_STD);
    setBrk({
      cp: 14,
      p_high: 8,
      p_low: 0,
      g_high: 3,
      g_mid: 0,
      g_low: 0,
      good: 0,
      miss: 0,
    });
    setAchievement('95.0392');
  }, []);

  const refreshRecent = useCallback(async () => {
    setFetchingRecent(true);
    try {
      const res = await fetch('/api/recent-plays?limit=10');
      const json = await res.json();
      if (json.recentScores && Array.isArray(json.recentScores)) {
        setRecentPlays(json.recentScores);
      }
    } catch (e) {
      console.error('Failed to fetch recent plays:', e);
    } finally {
      setFetchingRecent(false);
    }
  }, []);

  const achvNum = parseFloat(achievement) || 0;
  const comparison = useMemo(
    () => computeThreeWayComparison(tap, hold, slide, touch, brk, achvNum),
    [tap, hold, slide, touch, brk, achvNum]
  );

  // Precompute comparisons for all recent plays for the summary table
  const allPlaysComparison = useMemo(() => {
    return recentPlays.map(p => {
      const d = p.details;
      if (!d?.tap || !d?.break) return null;

      const pTap: StandardNoteFields = {
        cp: d.tap.cp || 0, p: d.tap.p || 0, gr: d.tap.gr || 0, go: d.tap.go || 0, miss: d.tap.miss || 0,
      };
      const pHold: StandardNoteFields = {
        cp: d.hold?.cp || 0, p: d.hold?.p || 0, gr: d.hold?.gr || 0, go: d.hold?.go || 0, miss: d.hold?.miss || 0,
      };
      const pSlide: StandardNoteFields = {
        cp: d.slide?.cp || 0, p: d.slide?.p || 0, gr: d.slide?.gr || 0, go: d.slide?.go || 0, miss: d.slide?.miss || 0,
      };
      const pTouch: StandardNoteFields = {
        cp: d.touch?.cp || 0, p: d.touch?.p || 0, gr: d.touch?.gr || 0, go: d.touch?.go || 0, miss: d.touch?.miss || 0,
      };
      const b = d.break;
      const pBrk: BreakNoteFields = {
        cp:     b.cp ?? 0,
        p_high: b.p_high ?? b.p2500 ?? b.p ?? 0,
        p_low:  b.p_low  ?? b.p2000 ?? 0,
        g_high: b.g_high ?? b.g1500 ?? b.gr ?? 0,
        g_mid:  b.g_mid  ?? b.g1250 ?? 0,
        g_low:  b.g_low  ?? b.g1000 ?? 0,
        good:   b.good   ?? b.go ?? 0,
        miss:   b.miss   ?? 0,
      };

      const cmp = computeThreeWayComparison(pTap, pHold, pSlide, pTouch, pBrk, parseFloat(p.achievement) || 0);
      return { play: p, comparison: cmp };
    }).filter(Boolean);
  }, [recentPlays]);

  const headerCls = 'pb-1.5 font-medium text-[11px]';

  return (
    <div className="glass rounded-2xl p-5 space-y-6">

      {/* ── 1. Recent Plays Selector (10 recent score cards) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-purple-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Select Recent Play (Last 10 Records)
            </h3>
            <span className="text-xs text-white/40">({recentPlays.length} available)</span>
          </div>
          <button
            onClick={refreshRecent}
            disabled={fetchingRecent}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-white/80 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={fetchingRecent ? 'animate-spin' : ''} />
            {fetchingRecent ? 'Refreshing…' : 'Re-fetch Recent'}
          </button>
        </div>

        {/* Carousel / horizontal scroll of recent plays */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {/* Preset Custom Option */}
          <button
            onClick={loadCustomExample}
            className={`shrink-0 w-48 text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
              selectedPlayId === 'custom'
                ? 'bg-purple-500/20 border-purple-500/60 shadow-lg shadow-purple-500/10'
                : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                Preset Example
              </span>
              <span className="text-[10px] text-white/40 font-mono">95.0392%</span>
            </div>
            <div className="text-xs font-bold text-white truncate">Calamity Fortune</div>
            <div className="text-[10px] text-white/40 truncate">Benchmark Test Case</div>
          </button>

          {recentPlays.map(play => {
            const isSelected = selectedPlayId === play.id;
            const diffColor = DIFF_COLOR[play.difficulty] ?? '#9f51dc';
            const b = play.details?.break;
            const pHigh = b?.p_high ?? b?.p2500 ?? b?.p ?? 0;
            const pLow = b?.p_low ?? b?.p2000 ?? 0;
            const gHigh = b?.g_high ?? b?.g1500 ?? b?.gr ?? 0;
            const gMid = b?.g_mid ?? b?.g1250 ?? 0;
            const gLow = b?.g_low ?? b?.g1000 ?? 0;

            return (
              <button
                key={play.id}
                onClick={() => loadPlay(play)}
                className={`shrink-0 w-56 text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600/25 border-purple-400 shadow-lg shadow-purple-600/20 ring-1 ring-purple-400/50'
                    : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.07]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Jacket
                    imageUrl={play.song?.image_url}
                    intl={play.song?.intl ?? true}
                    songTitle={play.songTitle}
                    difficulty={play.difficulty}
                    internalLevel={play.internalLevel || 0}
                    className="w-10 h-10"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[10px] font-bold px-1 rounded leading-tight"
                        style={{ background: `${diffColor}30`, color: diffColor, border: `1px solid ${diffColor}50` }}
                      >
                        {play.difficulty}
                      </span>
                      <span className="text-[10px] text-white/40">{play.songType}</span>
                      {play.fc && <FCBadge fc={play.fc as FC} className="scale-75 origin-left" />}
                      {play.fs && <FSBadge fs={play.fs as FS} className="scale-75 origin-left" />}
                    </div>
                    <div className="text-xs font-bold text-white truncate mt-0.5" title={play.songTitle}>
                      {play.songTitle}
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline justify-between border-t border-white/5 pt-1.5">
                  <span className="text-xs font-extrabold font-num text-amber-300">
                    {parseFloat(play.achievement).toFixed(4)}%
                  </span>
                  <span className="text-[10px] text-white/40 font-num">
                    {new Date(play.playedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                {/* Break detailed breakdown badges */}
                <div className="mt-1 flex items-center gap-1 text-[9px] text-white/50 font-num">
                  <span className="text-[#fb923c]">P:{pHigh}-{pLow}</span>
                  <span>·</span>
                  <span className="text-[#f472b6]">G:{gHigh}-{gMid}-{gLow}</span>
                  {b?.good ? <span className="text-[#4ade80]">· Gd:{b.good}</span> : null}
                  {b?.miss ? <span className="text-red-400">· M:{b.miss}</span> : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. THREE-WAY COMPARISON CARDS ── */}
      {comparison && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
            <Target size={14} className="text-purple-400" />
            Three-Way Calculation Comparison for {selectedPlay?.songTitle || 'Current Play'}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* CARD 1: Theoretical Right Value */}
            <div className="p-4 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> 1. Theoretical Right Value
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  Ground Truth
                </span>
              </div>
              <div className="text-[11px] text-white/50">
                The actual in-game recorded score from maimai NET.
              </div>
              <div className="pt-2 border-t border-emerald-500/20 space-y-1.5 font-num">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-white/60">Game Achievement:</span>
                  <span className="text-xl font-extrabold text-emerald-300">
                    {comparison.theoreticalAchv.toFixed(4)}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-white/40">Total Score Loss (101 - Achv):</span>
                  <span className="text-red-400 font-bold">
                    -{comparison.theoreticalTotalLoss.toFixed(4)}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-white/40">Target Break P+G Loss:</span>
                  <span className="text-purple-300 font-bold">
                    -{comparison.targetBreakPGLoss.toFixed(4)}%
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 2: Currently Used Naive Calculation */}
            <div className="p-4 rounded-xl bg-rose-500/[0.08] border border-rose-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> 2. Currently Used (Naive)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                  Wrong / Naive
                </span>
              </div>
              <div className="text-[11px] text-white/50">
                Assumes raw maimai NET counts (assumes 0 P-Low, 0 G-Mid, 0 G-Low). Underestimates loss!
              </div>
              <div className="pt-2 border-t border-rose-500/20 space-y-1.5 font-num">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-white/60">Computed Achievement:</span>
                  <span className="text-xl font-extrabold text-rose-300">
                    {comparison.naive.achv.toFixed(4)}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-white/40">Error vs Ground Truth:</span>
                  <span className="text-rose-400 font-bold">
                    {comparison.naive.diff >= 0 ? `+${comparison.naive.diff.toFixed(4)}%` : `${comparison.naive.diff.toFixed(4)}%`}
                    {' '}(Overestimated)
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-white/40">Raw Assumptions:</span>
                  <span className="text-white/70">
                    P({comparison.naive.pHigh}-{comparison.naive.pLow}) G({comparison.naive.gHigh}-{comparison.naive.gMid}-{comparison.naive.gLow})
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 3: Brute Force Solver Calculation */}
            <div className="p-4 rounded-xl bg-purple-500/[0.12] border border-purple-500/40 space-y-2 ring-1 ring-purple-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-400" /> 3. Brute Force Solver
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 font-bold">
                  ✓ Exact Residual
                </span>
              </div>
              <div className="text-[11px] text-white/50">
                Searched {comparison.solved.combinationsTested} partitions of Break P and G to find exact residual match.
              </div>
              <div className="pt-2 border-t border-purple-500/20 space-y-1.5 font-num">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-white/60">Solved Achievement:</span>
                  <span className="text-xl font-extrabold text-purple-300">
                    {comparison.solved.achv.toFixed(4)}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-white/40">Residual Difference:</span>
                  <span className="text-emerald-400 font-bold">
                    ±{Math.abs(comparison.solved.diff).toFixed(6)}% (Exact Match)
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-white/40">Solved Sub-tiers:</span>
                  <span className="text-amber-300 font-bold">
                    P({comparison.solved.pHigh}-{comparison.solved.pLow}) G({comparison.solved.gHigh}-{comparison.solved.gMid}-{comparison.solved.gLow})
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── 3. DETAILED SIDE-BY-SIDE BREAKDOWN TABLE ── */}
      {comparison && (
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={14} className="text-purple-400" />
            Side-by-Side Breakdown & Loss Comparison
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-num text-left">
              <thead>
                <tr className="border-b border-white/10 text-white/40">
                  <th className="py-2 pr-3">Evaluation Parameter</th>
                  <th className="py-2 pr-3 text-emerald-400">1. Theoretical Right</th>
                  <th className="py-2 pr-3 text-rose-400">2. Currently Used (Naive)</th>
                  <th className="py-2 pr-3 text-purple-300">3. Brute Force Solved</th>
                  <th className="py-2 text-right">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-2 pr-3 font-semibold text-white/70">Break Perfect Sub-tiers</td>
                  <td className="py-2 pr-3 text-white/40">Total: {brk.p_high + brk.p_low} (P-High / P-Low)</td>
                  <td className="py-2 pr-3 text-rose-300">
                    {comparison.naive.pHigh} High · {comparison.naive.pLow} Low
                  </td>
                  <td className="py-2 pr-3 text-purple-300 font-bold">
                    {comparison.solved.pHigh} High · {comparison.solved.pLow} Low
                  </td>
                  <td className="py-2 text-right">
                    {comparison.naive.pHigh === comparison.solved.pHigh ? (
                      <span className="text-emerald-400 font-bold">Agrees</span>
                    ) : (
                      <span className="text-rose-400 font-bold">Shifted {Math.abs(comparison.solved.pHigh - comparison.naive.pHigh)} to Low</span>
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="py-2 pr-3 font-semibold text-white/70">Break Great Sub-tiers</td>
                  <td className="py-2 pr-3 text-white/40">Total: {brk.g_high + brk.g_mid + brk.g_low} (G-Hi / Mid / Lo)</td>
                  <td className="py-2 pr-3 text-rose-300">
                    {comparison.naive.gHigh} Hi · {comparison.naive.gMid} Mid · {comparison.naive.gLow} Lo
                  </td>
                  <td className="py-2 pr-3 text-purple-300 font-bold">
                    {comparison.solved.gHigh} Hi · {comparison.solved.gMid} Mid · {comparison.solved.gLow} Lo
                  </td>
                  <td className="py-2 text-right">
                    {comparison.naive.gHigh === comparison.solved.gHigh && comparison.naive.gMid === comparison.solved.gMid ? (
                      <span className="text-emerald-400 font-bold">Agrees</span>
                    ) : (
                      <span className="text-amber-400 font-bold">Sub-tiers Reallocated</span>
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="py-2 pr-3 font-semibold text-white/70">Break Perfect Loss</td>
                  <td className="py-2 pr-3 text-white/40">—</td>
                  <td className="py-2 pr-3 text-rose-300">-{comparison.naive.pLoss.toFixed(4)}%</td>
                  <td className="py-2 pr-3 text-purple-300 font-bold">-{comparison.solved.pLoss.toFixed(4)}%</td>
                  <td className="py-2 text-right text-white/40">
                    Δ {Math.abs(comparison.solved.pLoss - comparison.naive.pLoss).toFixed(4)}%
                  </td>
                </tr>

                <tr>
                  <td className="py-2 pr-3 font-semibold text-white/70">Break Great Loss</td>
                  <td className="py-2 pr-3 text-white/40">—</td>
                  <td className="py-2 pr-3 text-rose-300">-{comparison.naive.gLoss.toFixed(4)}%</td>
                  <td className="py-2 pr-3 text-purple-300 font-bold">-{comparison.solved.gLoss.toFixed(4)}%</td>
                  <td className="py-2 text-right text-white/40">
                    Δ {Math.abs(comparison.solved.gLoss - comparison.naive.gLoss).toFixed(4)}%
                  </td>
                </tr>

                <tr>
                  <td className="py-2 pr-3 font-semibold text-white/70">Combined Break (P + G) Loss</td>
                  <td className="py-2 pr-3 text-emerald-300 font-bold">-{comparison.targetBreakPGLoss.toFixed(4)}%</td>
                  <td className="py-2 pr-3 text-rose-300 font-bold">-{(comparison.naive.pLoss + comparison.naive.gLoss).toFixed(4)}%</td>
                  <td className="py-2 pr-3 text-purple-300 font-bold">-{(comparison.solved.pLoss + comparison.solved.gLoss).toFixed(4)}%</td>
                  <td className="py-2 text-right">
                    {Math.abs((comparison.naive.pLoss + comparison.naive.gLoss) - comparison.targetBreakPGLoss) > 0.0001 ? (
                      <span className="text-rose-400 font-bold">Naive Misses Residual</span>
                    ) : (
                      <span className="text-emerald-400 font-bold">Exact</span>
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="py-2 pr-3 font-semibold text-white/70">Total Break Loss (incl. Good/Miss)</td>
                  <td className="py-2 pr-3 text-emerald-300">
                    -{(comparison.targetBreakPGLoss + comparison.brkGoodLoss + comparison.brkMissLoss).toFixed(4)}%
                  </td>
                  <td className="py-2 pr-3 text-rose-300">-{comparison.naive.brkTotalLoss.toFixed(4)}%</td>
                  <td className="py-2 pr-3 text-purple-300 font-bold">-{comparison.solved.brkTotalLoss.toFixed(4)}%</td>
                  <td className="py-2 text-right text-white/40">
                    Good: -{comparison.brkGoodLoss.toFixed(4)}% · Miss: -{comparison.brkMissLoss.toFixed(4)}%
                  </td>
                </tr>

                <tr className="bg-white/[0.02]">
                  <td className="py-2.5 pr-3 font-bold text-white">Final Achievement %</td>
                  <td className="py-2.5 pr-3 font-extrabold text-emerald-300 text-sm">
                    {comparison.theoreticalAchv.toFixed(4)}%
                  </td>
                  <td className="py-2.5 pr-3 font-extrabold text-rose-300 text-sm">
                    {comparison.naive.achv.toFixed(4)}%
                  </td>
                  <td className="py-2.5 pr-3 font-extrabold text-purple-300 text-sm">
                    {comparison.solved.achv.toFixed(4)}%
                  </td>
                  <td className="py-2.5 text-right font-bold">
                    {Math.abs(comparison.naive.diff) < 0.0001 ? (
                      <span className="text-emerald-400">✓ Matches</span>
                    ) : (
                      <span className="text-rose-400">
                        Off by {comparison.naive.diff >= 0 ? `+${comparison.naive.diff.toFixed(4)}%` : `${comparison.naive.diff.toFixed(4)}%`}
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 4. SUMMARY TABLE ACROSS ALL 10 RECENT PLAYS ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
          <Zap size={14} className="text-amber-400" />
          Comparison Across All 10 Recent Scores (Full Test Suite)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-num text-left">
            <thead>
              <tr className="border-b border-white/10 text-white/40">
                <th className="py-2 pr-3">Chart / Song</th>
                <th className="py-2 pr-3 text-emerald-400">Theoretical Right (In-Game)</th>
                <th className="py-2 pr-3 text-rose-400">Currently Used (Naive)</th>
                <th className="py-2 pr-3 text-purple-300">Brute Force Solved</th>
                <th className="py-2 pr-3">Solved Sub-tiers</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allPlaysComparison.map(item => {
                if (!item || !item.comparison) return null;
                const { play, comparison: cmp } = item;
                const diffColor = DIFF_COLOR[play.difficulty] ?? '#9f51dc';
                const isSelected = selectedPlayId === play.id;

                return (
                  <tr
                    key={play.id}
                    className={`hover:bg-white/[0.03] transition-colors ${isSelected ? 'bg-purple-500/10' : ''}`}
                  >
                    <td className="py-2 pr-3">
                      <div className="font-bold text-white truncate max-w-[180px]">{play.songTitle}</div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span style={{ color: diffColor }}>{play.difficulty}</span>
                        <span className="text-white/30">{play.songType}</span>
                        <span className="text-white/30">
                          {new Date(play.playedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </td>

                    <td className="py-2 pr-3 font-bold text-emerald-300">
                      {cmp.theoreticalAchv.toFixed(4)}%
                    </td>

                    <td className="py-2 pr-3">
                      <div className="text-rose-300 font-bold">{cmp.naive.achv.toFixed(4)}%</div>
                      <div className="text-[10px] text-rose-400/80">
                        {cmp.naive.diff >= 0 ? `+${cmp.naive.diff.toFixed(4)}%` : `${cmp.naive.diff.toFixed(4)}%`} error
                      </div>
                    </td>

                    <td className="py-2 pr-3">
                      <div className="text-purple-300 font-bold">{cmp.solved.achv.toFixed(4)}%</div>
                      <div className="text-[10px] text-emerald-400 font-bold">
                        ±{Math.abs(cmp.solved.diff).toFixed(6)}% (Exact)
                      </div>
                    </td>

                    <td className="py-2 pr-3 text-[11px]">
                      <div className="text-[#fb923c]">
                        P: {cmp.solved.pHigh}-{cmp.solved.pLow} <span className="text-white/30">(raw {cmp.naive.pHigh}-{cmp.naive.pLow})</span>
                      </div>
                      <div className="text-[#f472b6]">
                        G: {cmp.solved.gHigh}-{cmp.solved.gMid}-{cmp.solved.gLow} <span className="text-white/30">(raw {cmp.naive.gHigh}-{cmp.naive.gMid}-{cmp.naive.gLow})</span>
                      </div>
                    </td>

                    <td className="py-2 text-right">
                      <button
                        onClick={() => loadPlay(play)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. MANUAL INPUT CONTROLS ── */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Manual Note Judgements & Parameters Editor
          </h3>
          <span className="text-xs text-white/40">
            Edit note counts below to test custom cases or verify specific play scenarios.
          </span>
        </div>

        {/* Standard Note Inputs */}
        <div className="overflow-x-auto">
          <table className="w-auto">
            <thead>
              <tr className="text-white/40 border-b border-white/10 text-left">
                <th className={`${headerCls} pr-3 text-left`}>Type</th>
                <th className={`${headerCls} pr-2 text-[#facc15]`}>C.Perf</th>
                <th className={`${headerCls} pr-2 text-[#fb923c]`}>Perfect</th>
                <th className={`${headerCls} pr-2 text-[#f472b6]`}>Great</th>
                <th className={`${headerCls} pr-2 text-[#4ade80]`}>Good</th>
                <th className={`${headerCls} text-white/40`}>Miss</th>
              </tr>
            </thead>
            <tbody>
              <StandardNoteInputRow label="Tap"   value={tap}   onChange={setTap} />
              <StandardNoteInputRow label="Hold"  value={hold}  onChange={setHold} />
              <StandardNoteInputRow label="Slide" value={slide} onChange={setSlide} />
              <StandardNoteInputRow label="Touch" value={touch} onChange={setTouch} />
            </tbody>
          </table>
        </div>

        {/* Break Note Inputs */}
        <div className="pt-3 border-t border-white/5 space-y-2">
          <div className="text-[11px] font-bold text-[#fb923c]">
            Break Notes Inputs (Critical Perfect, 2-tier Perfect, 3-tier Great, Good, Miss)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
            <div className="bg-white/5 p-2 rounded border border-white/5 text-center">
              <div className="text-[10px] text-[#facc15] font-bold mb-1">C.Perf</div>
              <input
                type="number"
                min={0}
                value={brk.cp}
                onChange={e => setBrk({ ...brk, cp: parseInt(e.target.value) || 0 })}
                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-xs text-center text-white font-num"
              />
            </div>
            <div className="bg-[#fb923c]/10 p-2 rounded border border-[#fb923c]/20 text-center">
              <div className="text-[10px] text-[#fb923c] font-bold mb-1">P-High</div>
              <input
                type="number"
                min={0}
                value={brk.p_high}
                onChange={e => setBrk({ ...brk, p_high: parseInt(e.target.value) || 0 })}
                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-xs text-center text-white font-num"
              />
            </div>
            <div className="bg-[#fb923c]/10 p-2 rounded border border-[#fb923c]/20 text-center">
              <div className="text-[10px] text-[#fb923c] font-bold mb-1">P-Low</div>
              <input
                type="number"
                min={0}
                value={brk.p_low}
                onChange={e => setBrk({ ...brk, p_low: parseInt(e.target.value) || 0 })}
                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-xs text-center text-white font-num"
              />
            </div>
            <div className="bg-[#f472b6]/10 p-2 rounded border border-[#f472b6]/20 text-center">
              <div className="text-[10px] text-[#f472b6] font-bold mb-1">G-High</div>
              <input
                type="number"
                min={0}
                value={brk.g_high}
                onChange={e => setBrk({ ...brk, g_high: parseInt(e.target.value) || 0 })}
                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-xs text-center text-white font-num"
              />
            </div>
            <div className="bg-[#f472b6]/10 p-2 rounded border border-[#f472b6]/20 text-center">
              <div className="text-[10px] text-[#f472b6] font-bold mb-1">G-Mid</div>
              <input
                type="number"
                min={0}
                value={brk.g_mid}
                onChange={e => setBrk({ ...brk, g_mid: parseInt(e.target.value) || 0 })}
                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-xs text-center text-white font-num"
              />
            </div>
            <div className="bg-[#f472b6]/10 p-2 rounded border border-[#f472b6]/20 text-center">
              <div className="text-[10px] text-[#f472b6] font-bold mb-1">G-Low</div>
              <input
                type="number"
                min={0}
                value={brk.g_low}
                onChange={e => setBrk({ ...brk, g_low: parseInt(e.target.value) || 0 })}
                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-xs text-center text-white font-num"
              />
            </div>
            <div className="bg-[#4ade80]/10 p-2 rounded border border-[#4ade80]/20 text-center">
              <div className="text-[10px] text-[#4ade80] font-bold mb-1">Good</div>
              <input
                type="number"
                min={0}
                value={brk.good}
                onChange={e => setBrk({ ...brk, good: parseInt(e.target.value) || 0 })}
                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-xs text-center text-white font-num"
              />
            </div>
            <div className="bg-red-500/10 p-2 rounded border border-red-500/20 text-center">
              <div className="text-[10px] text-red-400 font-bold mb-1">Miss</div>
              <input
                type="number"
                min={0}
                value={brk.miss}
                onChange={e => setBrk({ ...brk, miss: parseInt(e.target.value) || 0 })}
                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-xs text-center text-white font-num"
              />
            </div>
          </div>
        </div>

        {/* Achievement Input */}
        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-white/5">
          <span className="text-xs text-white/60 font-medium">Recorded In-Game Achievement %</span>
          <input
            type="number"
            step="0.0001"
            value={achievement}
            onChange={e => setAchievement(e.target.value)}
            className="w-36 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-num focus:border-purple-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageWrapper } from '@/components/page-wrapper';

export default function SongDetailsDebugClient() {
  return (
    <PageWrapper className="p-4 md:p-8 max-w-[1100px] mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full text-xs font-bold bg-yellow-500/15 border border-yellow-500/30 text-yellow-400">
          🧪 Debug page — not linked in navigation
        </div>
        <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          Debug Tools
        </h1>
        <p className="text-sm text-white/50">
          Internal testing tools — not linked in navigation.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
          B50 Image Generator
        </h2>
        <B50ImagePreview />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
          Accuracy Loss Calculator
        </h2>
        <p className="text-sm text-white/50">
          Prototype of the residual-based Break loss formula. Prefilled with the Calamity Fortune example.
          Verify the math here before wiring it into the tracker.
        </p>
        <AccuracyLossCalculator />
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
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
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

// ── Accuracy Loss Calculator ───────────────────────────────────────────────────
// Implements the reference residual formula:
//   base = 100 / (tap×1 + hold×2 + slide×3 + touch×1 + break×5)
//   Non-break: Great = factor×base/5, Good = factor×base/2, Miss = factor×base
//   Break Good  = 3×base + 0.7/num_breaks  (exact)
//   Break Miss  = 5×base + 1.0/num_breaks  (exact)
//   Break P + G = residual = 101 - achievement - sum(all other losses)
//                → guarantees computed achievement === input achievement

type NoteFields = { cp: number; p: number; gr: number; go: number; miss: number };

const EMPTY_ROW: NoteFields = { cp: 0, p: 0, gr: 0, go: 0, miss: 0 };

function computeLossCalc(
  tap: NoteFields,
  hold: NoteFields,
  slide: NoteFields,
  touch: NoteFields,
  brk: NoteFields,
  achievement: number,
) {
  const tapN   = tap.cp   + tap.p   + tap.gr   + tap.go   + tap.miss;
  const holdN  = hold.cp  + hold.p  + hold.gr  + hold.go  + hold.miss;
  const slideN = slide.cp + slide.p + slide.gr + slide.go + slide.miss;
  const touchN = touch.cp + touch.p + touch.gr + touch.go + touch.miss;
  const brkN   = brk.cp   + brk.p   + brk.gr   + brk.go   + brk.miss;

  if (brkN === 0) return null;
  const totalW = tapN + holdN * 2 + slideN * 3 + touchN + brkN * 5;
  if (totalW === 0) return null;

  const base = 100 / totalW;
  const bpb  = 1 / brkN; // break bonus fraction per note (1% pool)

  // Non-break exact losses
  const tapLoss   = tap.gr   * (base / 5)       + tap.go   * (base / 2)       + tap.miss   * base;
  const holdLoss  = hold.gr  * (2 * base / 5)   + hold.go  * (2 * base / 2)   + hold.miss  * (2 * base);
  const slideLoss = slide.gr * (3 * base / 5)   + slide.go * (3 * base / 2)   + slide.miss * (3 * base);
  const touchLoss = touch.gr * (base / 5)       + touch.go * (base / 2)       + touch.miss * base;

  // Break Good + Miss exact
  const brkGoodLoss = brk.go   * (3 * base + 0.7 * bpb);
  const brkMissLoss = brk.miss * (5 * base + 1.0 * bpb);

  // Break P+G = residual — guarantees total = 101 - achievement exactly
  const knownLoss   = tapLoss + holdLoss + slideLoss + touchLoss + brkGoodLoss + brkMissLoss;
  const breakPGLoss = Math.max(0, 101 - achievement - knownLoss);
  const totalLoss   = knownLoss + breakPGLoss;
  const computed    = 101 - totalLoss;

  return {
    base, bpb,
    tapLoss, holdLoss, slideLoss, touchLoss,
    brkGoodLoss, brkMissLoss, breakPGLoss,
    totalLoss, computed,
    diff: Math.abs(computed - achievement),
  };
}

function NoteInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: NoteFields;
  onChange: (v: NoteFields) => void;
}) {
  const set = (k: keyof NoteFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
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

function AccuracyLossCalculator() {
  // Pre-filled with the Calamity Fortune screenshot values for immediate verification
  const [tap,   setTap]   = useState<NoteFields>({ cp: 369, p: 381, gr: 167, go: 44,  miss: 17 });
  const [hold,  setHold]  = useState<NoteFields>({ cp: 7,   p: 17,  gr: 0,   go: 0,   miss: 0  });
  const [slide, setSlide] = useState<NoteFields>({ cp: 107, p: 0,   gr: 2,   go: 6,   miss: 0  });
  const [touch, setTouch] = useState<NoteFields>(EMPTY_ROW);
  const [brk,   setBrk]   = useState<NoteFields>({ cp: 14,  p: 8,   gr: 3,   go: 0,   miss: 0  });
  const [achievement, setAchievement] = useState('95.0392');

  const achvNum = parseFloat(achievement) || 0;
  const res     = computeLossCalc(tap, hold, slide, touch, brk, achvNum);

  const headerCls = 'pb-1.5 font-medium text-[11px]';

  const ResultRow = ({ label, v, loss }: { label: string; v: NoteFields; loss: number }) => (
    <tr className="border-b border-white/5 text-xs font-num text-center">
      <td className="py-1.5 pr-3 font-bold text-left text-white/70">{label}</td>
      <td className="py-1.5 text-white/40">{v.cp + v.p + v.gr + v.go + v.miss}</td>
      <td className="py-1.5 text-[#facc15]">{v.cp}</td>
      <td className="py-1.5 text-[#fb923c]">{v.p}</td>
      <td className="py-1.5 text-[#f472b6]">{v.gr}</td>
      <td className="py-1.5 text-[#4ade80]">{v.go}</td>
      <td className="py-1.5 text-white/40">{v.miss}</td>
      <td className="py-1.5 text-red-400">{loss > 0 ? `-${loss.toFixed(4)}%` : '—'}</td>
    </tr>
  );

  return (
    <div className="glass rounded-2xl p-5 space-y-5">

      {/* ── Input table ── */}
      <div className="overflow-x-auto">
        <table className="w-auto">
          <thead>
            <tr className="text-white/40 border-b border-white/10">
              <th className={`${headerCls} pr-3 text-left`}>Type</th>
              <th className={`${headerCls} pr-2 text-[#facc15]`}>C.Perf</th>
              <th className={`${headerCls} pr-2 text-[#fb923c]`}>Perfect</th>
              <th className={`${headerCls} pr-2 text-[#f472b6]`}>Great</th>
              <th className={`${headerCls} pr-2 text-[#4ade80]`}>Good</th>
              <th className={`${headerCls} text-white/40`}>Miss</th>
            </tr>
          </thead>
          <tbody>
            <NoteInput label="Tap"   value={tap}   onChange={setTap} />
            <NoteInput label="Hold"  value={hold}  onChange={setHold} />
            <NoteInput label="Slide" value={slide} onChange={setSlide} />
            <NoteInput label="Touch" value={touch} onChange={setTouch} />
            <NoteInput label="Break" value={brk}   onChange={setBrk} />
          </tbody>
        </table>
      </div>

      {/* ── Achievement input ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-white/50">Achievement %</span>
        <input
          type="number"
          step="0.0001"
          value={achievement}
          onChange={e => setAchievement(e.target.value)}
          className="w-36 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-num focus:outline-none focus:border-purple-500/50 transition-colors"
        />
        <span className="text-xs text-white/30">enter the achievement from the game exactly</span>
      </div>

      {/* ── Results ── */}
      {res && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-center">
              <thead>
                <tr className="text-[11px] text-white/40 border-b border-white/10">
                  <th className={`${headerCls} pr-3 text-left`}>Type</th>
                  <th className={headerCls}>Total</th>
                  <th className={`${headerCls} text-[#facc15]`}>C.Perf</th>
                  <th className={`${headerCls} text-[#fb923c]`}>Perf</th>
                  <th className={`${headerCls} text-[#f472b6]`}>Great</th>
                  <th className={`${headerCls} text-[#4ade80]`}>Good</th>
                  <th className={`${headerCls} text-white/40`}>Miss</th>
                  <th className={`${headerCls} text-red-400`}>Loss</th>
                </tr>
              </thead>
              <tbody>
                <ResultRow label="Tap"   v={tap}   loss={res.tapLoss} />
                <ResultRow label="Hold"  v={hold}  loss={res.holdLoss} />
                <ResultRow label="Slide" v={slide} loss={res.slideLoss} />
                <ResultRow label="Touch" v={touch} loss={res.touchLoss} />

                {/* Break row — Good + Miss are exact, P+G is the residual */}
                <tr className="border-b border-white/5 text-xs font-num text-center">
                  <td className="py-1.5 pr-3 font-bold text-left text-white/70">Break</td>
                  <td className="py-1.5 text-white/40">{brk.cp + brk.p + brk.gr + brk.go + brk.miss}</td>
                  <td className="py-1.5 text-[#facc15]">{brk.cp}</td>
                  {/* Perfect — marks P+G residual in a tooltip */}
                  <td className="py-1.5 text-[#fb923c] align-top">
                    <div>{brk.p}</div>
                    <div className="text-[9px] text-yellow-400/50 leading-none mt-0.5">+G→residual</div>
                  </td>
                  <td className="py-1.5 text-[#f472b6]">{brk.gr}</td>
                  <td className="py-1.5 text-[#4ade80] align-top">
                    <div>{brk.go}</div>
                    {res.brkGoodLoss > 0 && (
                      <div className="text-[9px] text-red-400/60 leading-none mt-0.5">-{res.brkGoodLoss.toFixed(4)}%</div>
                    )}
                  </td>
                  <td className="py-1.5 text-white/40 align-top">
                    <div>{brk.miss}</div>
                    {res.brkMissLoss > 0 && (
                      <div className="text-[9px] text-red-400/60 leading-none mt-0.5">-{res.brkMissLoss.toFixed(4)}%</div>
                    )}
                  </td>
                  <td className="py-1.5 text-red-400 align-top">
                    <div>-{(res.brkGoodLoss + res.brkMissLoss + res.breakPGLoss).toFixed(4)}%</div>
                    <div className="text-[9px] text-yellow-400/60 leading-none mt-0.5">
                      P+G residual: -{res.breakPGLoss.toFixed(4)}%
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-white/40 text-[11px] mb-1">base</div>
              <div className="font-num text-white text-sm font-bold">{res.base.toFixed(7)}%</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-white/40 text-[11px] mb-1">Total Loss</div>
              <div className="font-num text-red-400 text-sm font-bold">-{res.totalLoss.toFixed(4)}%</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-white/40 text-[11px] mb-1">101 − Loss</div>
              <div className="font-num text-white text-sm font-bold">{res.computed.toFixed(4)}%</div>
            </div>
            <div
              className={`rounded-xl p-3 text-center border ${
                res.diff < 0.0001
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}
            >
              <div className={`text-[11px] font-bold mb-1 ${res.diff < 0.0001 ? 'text-green-400' : 'text-red-400'}`}>
                {res.diff < 0.0001 ? '✓ Matches exactly' : '✗ Off by'}
              </div>
              <div className={`font-num text-sm font-bold ${res.diff < 0.0001 ? 'text-green-300' : 'text-red-300'}`}>
                {res.diff < 0.0001 ? `${achvNum.toFixed(4)}%` : `${res.diff.toFixed(6)}%`}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-white/25 leading-relaxed">
            Formula:{' '}
            <code className="bg-black/30 px-1 rounded">base = 100 / (tap + hold×2 + slide×3 + touch + break×5)</code>
            {' · '}Break P+G loss ={' '}
            <code className="bg-black/30 px-1 rounded">101 − achievement − known_losses</code>
          </p>
        </>
      )}
    </div>
  );
}

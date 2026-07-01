'use client';

import { useState, useMemo } from 'react';
import { Search, Trophy, LayoutGrid, List, Medal } from 'lucide-react';
import type { ScoreWithRating, Difficulty } from '@/lib/types';

interface Props {
  scored: ScoreWithRating[];
  total: number;
}

const DIFF_ORDER: Difficulty[] = ['REMAS', 'MAS', 'EXP', 'ADV', 'BAS'];

// Difficulty accent colors (border + badge) — matched to in-game palette
const DIFF_COLOR: Record<string, string> = {
  BAS:   '#3fb950',
  ADV:   '#d4a017',
  EXP:   '#da3633',
  MAS:   '#8957e5',
  REMAS: '#d2a8ff',
  UTAGE: '#bf1b5e',
};

const DIFF_BG: Record<string, string> = {
  BAS:   'rgba(63,185,80,0.18)',
  ADV:   'rgba(212,160,23,0.18)',
  EXP:   'rgba(218,54,51,0.18)',
  MAS:   'rgba(137,87,229,0.18)',
  REMAS: 'rgba(210,168,255,0.18)',
  UTAGE: 'rgba(191,27,94,0.18)',
};

function DiffBadge({ diff }: { diff: string }) {
  return (
    <span className={`diff-${diff.toLowerCase()} text-xs font-semibold px-1.5 py-0.5 rounded border uppercase shrink-0`}>
      {diff === 'REMAS' ? 'Re:M' : diff}
    </span>
  );
}

function FCBadge({ fc }: { fc: string | null }) {
  if (!fc) return null;
  const colors: Record<string, string> = {
    'AP+': '#f9a8d4', AP: '#f472b6', 'FC+': '#c084fc', FC: '#a78bfa',
  };
  return (
    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)', color: colors[fc] || '#ccc' }}>
      {fc}
    </span>
  );
}

export default function ScoresClient({ scored, total }: Props) {
  const [query, setQuery] = useState('');
  const [diff, setDiff] = useState<'ALL' | Difficulty>('ALL');
  const [sort, setSort] = useState<'rating' | 'achievement' | 'title'>('rating');
  const [pool, setPool] = useState<'all' | 'new' | 'old'>('all');
  const [view, setView] = useState<'list' | 'grid' | 'b50'>('list');

  const filtered = useMemo(() => {
    let list = [...scored];
    if (query) list = list.filter(s => s.songTitle.toLowerCase().includes(query.toLowerCase()));
    if (diff !== 'ALL') list = list.filter(s => s.difficulty === diff);
    if (pool !== 'all') list = list.filter(s => s.pool === pool);
    list.sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'achievement') return b.achievement - a.achievement;
      return a.songTitle.localeCompare(b.songTitle);
    });
    return list;
  }, [scored, query, diff, sort, pool]);

  const b50New = useMemo(() => {
    return scored.filter(s => s.pool === 'new' && (s.difficulty as string) !== 'UTAGE').sort((a, b) => b.rating - a.rating).slice(0, 15);
  }, [scored]);
  const b50Old = useMemo(() => {
    return scored.filter(s => s.pool === 'old' && (s.difficulty as string) !== 'UTAGE').sort((a, b) => b.rating - a.rating).slice(0, 35);
  }, [scored]);

  const b50NewSum = b50New.reduce((acc, s) => acc + s.rating, 0);
  const b50OldSum = b50Old.reduce((acc, s) => acc + s.rating, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Scores</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
          {total} total scores tracked
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--foreground-subtle)' }} />
          <input
            id="score-search"
            type="text"
            placeholder="Search song title…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </div>

        <select
          id="diff-filter"
          value={diff}
          onChange={e => setDiff(e.target.value as typeof diff)}
          className="px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        >
          <option value="ALL">All Difficulties</option>
          {DIFF_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {(['all', 'new', 'old'] as const).map(v => (
            <button
              key={v}
              id={`pool-${v}`}
              onClick={() => setPool(v)}
              className="px-3 py-2.5 text-sm transition-all uppercase"
              style={{
                background: pool === v ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
                color: pool === v ? '#d8b4fe' : 'var(--foreground-muted)',
              }}
            >
              {v}
            </button>
          ))}
        </div>

        <select
          id="sort-select"
          value={sort}
          onChange={e => setSort(e.target.value as typeof sort)}
          className="px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        >
          <option value="rating">Sort: Rating</option>
          <option value="achievement">Sort: Achievement</option>
          <option value="title">Sort: Title</option>
        </select>
        
        <div className="flex ml-auto rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <button
            onClick={() => setView('list')}
            className="px-3 py-2.5 transition-all"
            style={{ background: view === 'list' ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)', color: view === 'list' ? '#d8b4fe' : 'var(--foreground-muted)' }}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setView('grid')}
            className="px-3 py-2.5 transition-all"
            style={{ background: view === 'grid' ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)', color: view === 'grid' ? '#d8b4fe' : 'var(--foreground-muted)' }}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView('b50')}
            className="px-3 py-2.5 transition-all flex items-center gap-1.5"
            style={{ background: view === 'b50' ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)', color: view === 'b50' ? '#d8b4fe' : 'var(--foreground-muted)' }}
          >
            <Medal size={16} /> <span className="text-xs font-bold">B50</span>
          </button>
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--foreground-subtle)' }}>
        {filtered.length.toLocaleString()} results
      </p>

      {/* Score list */}
      {view === 'list' && (
        <div className="glass rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--foreground-muted)' }}>
            <Trophy size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No scores found</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {filtered.map((s, i) => {
              const diffColor = DIFF_COLOR[s.difficulty] ?? '#fff';
              const diffAbbr = s.difficulty === 'REMAS' ? 'REM' : s.difficulty;
              const fcfs = [s.fc, s.fs].filter(Boolean).join(' ');
              return (
                <div
                  key={`${s.songTitle}-${s.difficulty}-${i}`}
                  className="flex items-center gap-3 pr-4 hover:bg-white/5 transition-all"
                  style={{ borderLeft: `3px solid ${diffColor}` }}
                >
                  {/* Album art */}
                  <div className="w-14 h-14 shrink-0 bg-white/5 overflow-hidden" style={{ minWidth: '3.5rem' }}>
                    {s.song?.image_url ? (
                      <img
                        src={`https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/jacket/${s.song.image_url}`}
                        alt={s.songTitle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    )}
                  </div>

                  {/* Song info */}
                  <div className="flex-1 min-w-0 py-3">
                    <div className="font-semibold text-sm truncate text-white">{s.songTitle}</div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--foreground-muted)' }}>
                      <span style={{ color: diffColor }}>DX</span>
                      {' • '}
                      <span style={{ color: diffColor }}>{diffAbbr} {s.internalLevel > 0 ? s.internalLevel.toFixed(1) : '?'}</span>
                      {s.song?.artist && <>{' • '}{s.song.artist}</>}
                    </div>
                  </div>

                  {/* Achievement + FC/FS */}
                  <div className="text-right shrink-0">
                    <div className="font-num font-bold text-sm text-white tabular-nums">{s.achievement.toFixed(4)}%</div>
                    <div className="flex gap-1 justify-end mt-0.5 flex-wrap">
                      {s.fc && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                          background: 'rgba(255,255,255,0.08)',
                          color: { 'AP+': '#f9a8d4', AP: '#f472b6', 'FC+': '#c084fc', FC: '#a78bfa' }[s.fc] ?? '#ccc'
                        }}>{s.fc}</span>
                      )}
                      {s.fs && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,211,238,0.12)', color: '#22d3ee' }}>{s.fs}</span>
                      )}
                    </div>
                  </div>

                  {/* Rating */}
                  <div
                    className="font-num font-bold text-xl w-12 text-right shrink-0 tabular-nums"
                    style={{ color: diffColor }}
                  >
                    {s.rating}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {view === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((s, i) => {
            const diffColor = DIFF_COLOR[s.difficulty] ?? '#fff';
            const diffBg    = DIFF_BG[s.difficulty]    ?? 'rgba(255,255,255,0.15)';
            return (
              <div
                key={`${s.songTitle}-${s.difficulty}-${i}`}
                className="relative overflow-hidden rounded-2xl aspect-[3/4] group flex flex-col justify-end"
                style={{ border: `2px solid ${diffColor}`, boxShadow: `0 0 12px ${diffColor}40` }}
              >
                {s.song?.image_url && (
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundImage: `url(https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/jacket/${s.song.image_url})` }}
                  />
                )}
                {/* Overlay gradient for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

                {/* Top row: FC/FS badges left, level badge right */}
                <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <FCBadge fc={s.fc} />
                    {s.fs && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,211,238,0.2)', color: '#22d3ee' }}>
                        {s.fs}
                      </span>
                    )}
                  </div>
                  {/* Chart constant badge */}
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-lg tabular-nums"
                    style={{ background: diffColor, color: '#fff', border: 'none' }}
                  >
                    {s.internalLevel > 0 ? s.internalLevel.toFixed(1) : '?'}
                  </span>
                </div>

                <div className="relative p-3 z-10">
                  <div className="text-xs font-bold truncate mb-1 text-white text-shadow">{s.songTitle}</div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-sm font-num font-bold text-white">{s.achievement.toFixed(4)}%</div>
                    </div>
                    <div className="text-right">
                      <div className={`rank-${s.rank.toLowerCase().replace('+', 'plus')} text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block mb-1`}>
                        {s.rank}
                      </div>
                      <div className="text-xs font-num font-bold" style={{ color: diffColor }}>
                        {s.rating}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'b50' && (
        <div className="space-y-8 animate-slide-up">
          {/* New B15 */}
          <section>
            <div className="flex items-end justify-between mb-3 border-b border-white/10 pb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                New Songs B15 <span className="text-xs text-white/50 font-normal">({b50New.length}/15)</span>
              </h2>
              <div className="text-xs text-white/60 font-num tabular-nums flex gap-3">
                <span>+ Sum {b50NewSum}</span>
                <span>~ Avg {(b50NewSum / 15).toFixed(2)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {b50New.map((s, i) => <B50Card key={`new-${i}`} score={s} />)}
            </div>
          </section>

          {/* Old B35 */}
          <section>
            <div className="flex items-end justify-between mb-3 border-b border-white/10 pb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Old Songs B35 <span className="text-xs text-white/50 font-normal">({b50Old.length}/35)</span>
              </h2>
              <div className="text-xs text-white/60 font-num tabular-nums flex gap-3">
                <span>+ Sum {b50OldSum}</span>
                <span>~ Avg {(b50OldSum / 35).toFixed(2)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {b50Old.map((s, i) => <B50Card key={`old-${i}`} score={s} />)}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function B50Card({ score: s }: { score: ScoreWithRating }) {
  const diffColor = DIFF_COLOR[s.difficulty] ?? '#fff';
  const isDX = s.songType === 'DX';

  return (
    <div
      className="relative overflow-hidden rounded-xl h-[88px] group"
      style={{ border: `1.5px solid ${diffColor}` }}
    >
      {/* Background Image */}
      {s.song?.image_url && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
          style={{ backgroundImage: `url(https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/jacket/${s.song.image_url})` }}
        />
      )}
      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

      <div className="relative h-full flex flex-col justify-between p-2 z-10">
        {/* Top: DX/STD Badge + Level Badge */}
        <div className="flex justify-between items-start">
          <img
            src={isDX ? '/badges/music_dx.webp' : '/badges/music_standard.webp'}
            alt={isDX ? 'DX' : 'STD'}
            className="h-[14px] mt-0.5 object-contain"
          />
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded leading-none tabular-nums"
            style={{ background: diffColor, color: '#fff' }}
          >
            {s.internalLevel > 0 ? s.internalLevel.toFixed(1) : '?'}
          </span>
        </div>

        {/* Middle: Title */}
        <div className="text-[12px] font-bold text-white truncate text-shadow leading-tight mt-auto">
          {s.songTitle}
        </div>

        {/* Bottom: Achievement + Badges left, Rating right */}
        <div className="flex justify-between items-end mt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-white font-num leading-none">{s.achievement.toFixed(4)}%</span>
            <div className="flex gap-1">
              {s.fc && (
                <span className="text-[8px] font-bold px-1 py-px rounded leading-none text-white/90" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  {s.fc}
                </span>
              )}
              {s.fs && (
                <span className="text-[8px] font-bold px-1 py-px rounded leading-none text-[#22d3ee]" style={{ background: 'rgba(34,211,238,0.15)' }}>
                  {s.fs}
                </span>
              )}
            </div>
          </div>
          <div className="text-lg font-bold font-num leading-none tracking-tight tabular-nums" style={{ color: '#fff', textShadow: `0 0 10px ${diffColor}, 0 0 5px ${diffColor}` }}>
            {s.rating}
          </div>
        </div>
      </div>
    </div>
  );
}

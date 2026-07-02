'use client';

import { useState, useMemo } from 'react';
import { Search, Trophy, LayoutGrid, List } from 'lucide-react';
import type { ScoreWithRating, Difficulty } from '@/lib/types';
import { PageWrapper } from '@/components/page-wrapper';

interface Props {
  scored: ScoreWithRating[];
  total: number;
}

const DIFF_ORDER: Difficulty[] = ['REMAS', 'MAS', 'EXP', 'ADV', 'BAS'];

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

import { FCBadge, FSBadge } from '@/components/badges';

export default function ScoresClient({ scored, total }: Props) {
  const [query, setQuery] = useState('');
  const [diff, setDiff] = useState<'ALL' | Difficulty>('ALL');
  const [sort, setSort] = useState<'rating' | 'achievement' | 'title'>('rating');
  const [view, setView] = useState<'list' | 'grid'>('grid');

  const filtered = useMemo(() => {
    let list = [...scored];
    if (query) list = list.filter(s => s.songTitle.toLowerCase().includes(query.toLowerCase()));
    if (diff !== 'ALL') list = list.filter(s => s.difficulty === diff);
    list.sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'achievement') return b.achievement - a.achievement;
      return a.songTitle.localeCompare(b.songTitle);
    });
    return list;
  }, [scored, query, diff, sort]);

  // Group into 4 sections: New B15, Old B35, New Remaining, Old Remaining
  const { newB15, oldB35, newRemaining, oldRemaining } = useMemo(() => {
    const newSongs = filtered.filter(s => s.pool === 'new' && (s.difficulty as string) !== 'UTAGE');
    const oldSongs = filtered.filter(s => s.pool === 'old' && (s.difficulty as string) !== 'UTAGE');
    
    // Sort by rating for B50 split regardless of current sort (to reliably identify B50)
    // Wait, if user sorts by Title, should the B15 still be the top 15 by rating, but ordered by Title?
    // Yes, B15 always means top 15 by rating.
    const newByRating = [...newSongs].sort((a, b) => b.rating - a.rating);
    const oldByRating = [...oldSongs].sort((a, b) => b.rating - a.rating);

    const b15Set = new Set(newByRating.slice(0, 15).map(s => s.id));
    const b35Set = new Set(oldByRating.slice(0, 35).map(s => s.id));

    // Now respect user sort for the sections
    const sortedNewB15 = newSongs.filter(s => b15Set.has(s.id));
    const sortedOldB35 = oldSongs.filter(s => b35Set.has(s.id));
    const sortedNewRem = newSongs.filter(s => !b15Set.has(s.id));
    const sortedOldRem = oldSongs.filter(s => !b35Set.has(s.id));

    return {
      newB15: sortedNewB15,
      oldB35: sortedOldB35,
      newRemaining: sortedNewRem,
      oldRemaining: sortedOldRem,
    };
  }, [filtered]);

  const newB15Sum = newB15.reduce((acc, s) => acc + s.rating, 0);
  const oldB35Sum = oldB35.reduce((acc, s) => acc + s.rating, 0);

  function renderSection(title: string, data: ScoreWithRating[], limit: number | null, sum?: number) {
    if (data.length === 0) return null;
    return (
      <section className="mb-10 animate-slide-up">
        <div className="flex items-end justify-between mb-4 border-b border-white/10 pb-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-wide">
            {title} <span className="text-sm text-white/50 font-normal">({data.length}{limit ? `/${limit}` : ''})</span>
          </h2>
          {sum !== undefined && limit !== null && (
            <div className="text-xs text-white/60 font-num tabular-nums flex gap-3">
              <span className="font-semibold text-pink-300">Sum {sum}</span>
              <span className="font-semibold text-cyan-300">Avg {(sum / limit).toFixed(2)}</span>
            </div>
          )}
        </div>
        
        {view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {data.map((s, i) => <B50Card key={s.id} score={s} index={i} animated={limit !== null} />)}
          </div>
        ) : (
          <div className="glass rounded-xl overflow-hidden divide-y divide-white/5">
            {data.map((s, i) => (
              <div 
                key={s.id} 
                className={`flex items-center gap-3 pr-4 hover:bg-white/5 transition-colors group ${limit !== null ? 'animate-slide-up' : ''}`}
                style={limit !== null ? { animationDelay: `${i * 0.03}s`, animationFillMode: 'both' } : undefined}
              >
                <div className="w-1.5 h-14 shrink-0" style={{ background: DIFF_COLOR[s.difficulty] }} />
                <div className="w-12 h-12 shrink-0 bg-white/5 overflow-hidden rounded relative">
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
                  <div className="font-num font-bold text-[13px] text-white tabular-nums">{s.achievement.toFixed(4)}%</div>
                  <div className="flex gap-1 justify-end mt-1">
                    <FCBadge fc={s.fc} />
                    <FSBadge fs={s.fs} />
                  </div>
                </div>
                <div className="font-num font-bold text-lg w-12 text-right shrink-0 tabular-nums" style={{ color: DIFF_COLOR[s.difficulty] }}>
                  {s.rating}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <PageWrapper className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Scores</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
            {total} total scores tracked
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--foreground-subtle)' }} />
          <input
            id="score-search"
            type="text"
            placeholder="Search song title…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/50"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </div>

        <select
          id="diff-filter"
          value={diff}
          onChange={e => setDiff(e.target.value as typeof diff)}
          className="px-3 py-2.5 rounded-xl text-sm outline-none transition-colors hover:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        >
          <option value="ALL">All Difficulties</option>
          {DIFF_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          id="sort-select"
          value={sort}
          onChange={e => setSort(e.target.value as typeof sort)}
          className="px-3 py-2.5 rounded-xl text-sm outline-none transition-colors hover:bg-white/10"
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
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--foreground-subtle)' }}>
        {filtered.length.toLocaleString()} results
      </p>

      {/* Sections */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center" style={{ color: 'var(--foreground-muted)' }}>
          <Trophy size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No scores found</p>
        </div>
      ) : (
        <div>
          {renderSection("New B15", newB15, 15, newB15Sum)}
          {renderSection("Old B35", oldB35, 35, oldB35Sum)}
          {renderSection("New Songs", newRemaining, null)}
          {renderSection("Old Songs", oldRemaining, null)}
        </div>
      )}
    </PageWrapper>
  );
}

function B50Card({ score: s, index = 0, animated = false }: { score: ScoreWithRating, index?: number, animated?: boolean }) {
  const diffColor = DIFF_COLOR[s.difficulty] ?? '#fff';
  const isDX = s.songType === 'DX';

  return (
    <div
      className={`relative overflow-hidden rounded-xl h-[96px] group shadow-lg hover:scale-105 hover:-translate-y-1 transition-transform duration-300 ${animated ? 'animate-slide-up' : ''}`}
      style={{ 
        border: `1.5px solid ${diffColor}`,
        animationDelay: animated ? `${index * 0.03}s` : undefined,
        animationFillMode: animated ? 'both' : undefined
      }}
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-90" />

      <div className="relative h-full flex flex-col justify-between p-2.5 z-10">
        {/* Top: DX/STD Badge + Level Badge */}
        <div className="flex justify-between items-start">
          <img
            src={isDX ? '/badges/music_dx.webp' : '/badges/music_standard.webp'}
            alt={isDX ? 'DX' : 'STD'}
            className="h-[14px] mt-0.5 object-contain"
          />
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded leading-none tabular-nums shadow-sm"
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
            <span className="text-xs font-bold text-white font-num leading-none">{s.achievement.toFixed(4)}%</span>
            <div className="flex gap-1">
              <FCBadge fc={s.fc} className="bg-black/60 backdrop-blur-sm" />
              <FSBadge fs={s.fs} className="bg-black/60 backdrop-blur-sm" />
            </div>
          </div>
          <div className="text-xl font-bold font-num leading-none tracking-tight tabular-nums" style={{ color: '#fff', textShadow: `0 0 10px ${diffColor}, 0 0 5px ${diffColor}` }}>
            {s.rating}
          </div>
        </div>
      </div>
    </div>
  );
}

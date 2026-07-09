'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Music2, LayoutGrid, List, ArrowUpDown, Calendar } from 'lucide-react';
import type { Song } from '@/lib/types';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { PageWrapper } from '@/components/page-wrapper';
import { motion, AnimatePresence } from 'framer-motion';
import { toRomaji } from '@/lib/romaji';
import { getJacketUrl } from '@/lib/song-db';
import { addTracker } from '@/app/tracker/actions';
import { useRouter } from 'next/navigation';

interface Props {
  songs: Song[];
  currentVersion: number;
  categories: string[];
}

// ── Version labels ─────────────────────────────────────────────────────────────
const VERSION_NAMES: Record<string, string> = {
  '20000': 'maimai DX',   '20500': 'DX PLUS',
  '21000': 'Splash',      '21500': 'Splash PLUS',
  '22000': 'UNiVERSE',    '22500': 'UNiVERSE PLUS',
  '23000': 'FESTiVAL',    '23500': 'FESTiVAL PLUS',
  '24000': 'BUDDiES',     '24500': 'BUDDiES PLUS',
  '25000': 'PRiSM',       '25500': 'PRiSM PLUS',
  '26000': 'CiRCLE',      '26500': 'CiRCLE PLUS',
  '10000': 'maimai DX (JP)', '11000': 'DX PLUS (JP)',
  '12000': 'Splash (JP)', '13000': 'Splash PLUS (JP)',
  '14000': 'UNiVERSE (JP)', '15000': 'UNiVERSE PLUS (JP)',
  '16000': 'FESTiVAL (JP)', '17000': 'FESTiVAL PLUS (JP)',
  '18000': 'BUDDiES (JP)', '18500': 'BUDDiES PLUS (JP)',
  '19000': 'PRiSM (JP)',  '19500': 'PRiSM PLUS (JP)',
  '19900': 'CiRCLE (JP)',
};
function versionLabel(v: string) { return VERSION_NAMES[v] ?? `v${v}`; }

const CAT_LABELS: Record<string, string> = {
  maimai: 'maimai',
  anime: 'Anime',
  'game&variety': 'Game & Variety',
  'niconico&vocaloid': 'Nico & Vocaloid',
  toho: 'Touhou',
  'original&joypolis': 'Original',
};

// ── Difficulty colours ─────────────────────────────────────────────────────────
const DIFF_COLOR: Record<string, string> = {
  bas: '#3fb950', adv: '#d4a017', exp: '#da3633',
  mas: '#8957e5', remas: '#d2a8ff', utage: '#bf1b5e',
};

// ── Date formatting ────────────────────────────────────────────────────────────
function formatDate(d?: string): string | null {
  if (!d || d.length < 8) return null;
  return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
}

// ── SongRow: one table row represents one chart type (DX or STD) ───────────────
interface DiffData { display?: string; internal?: string; }
interface SongRow {
  song: Song;
  type: 'DX' | 'STD';
  bas: DiffData; adv: DiffData; exp: DiffData; mas: DiffData; remas: DiffData; utage?: DiffData; kanji?: string;
}

/** Expand a single Song into 1 or 2 rows (DX and/or STD). */
function expandToRows(song: Song): SongRow[] {
  const hasDX = !!(song.dx_lev_mas_i || song.dx_lev_exp_i || song.dx_lev_bas_i);
  const hasSTD = !!(song.lev_mas_i || song.lev_exp_i || song.lev_bas_i);

  const rows: SongRow[] = [];

  if (hasDX) {
    rows.push({
      song, type: 'DX',
      bas:   { display: song.dx_lev_bas,   internal: song.dx_lev_bas_i   },
      adv:   { display: song.dx_lev_adv,   internal: song.dx_lev_adv_i   },
      exp:   { display: song.dx_lev_exp,   internal: song.dx_lev_exp_i   },
      mas:   { display: song.dx_lev_mas,   internal: song.dx_lev_mas_i   },
      remas: { display: song.dx_lev_remas, internal: song.dx_lev_remas_i },
      utage: { display: song.lev_utage },
      kanji: song.kanji,
    });
    if (hasSTD) {
      rows.push({
        song, type: 'STD',
        bas:   { display: song.lev_bas,   internal: song.lev_bas_i   },
        adv:   { display: song.lev_adv,   internal: song.lev_adv_i   },
        exp:   { display: song.lev_exp,   internal: song.lev_exp_i   },
        mas:   { display: song.lev_mas,   internal: song.lev_mas_i   },
        remas: { display: song.lev_remas, internal: song.lev_remas_i },
        utage: { display: song.lev_utage },
        kanji: song.kanji,
      });
    }
  } else {
    rows.push({
      song, type: 'STD',
      bas:   { display: song.lev_bas,   internal: song.lev_bas_i   },
      adv:   { display: song.lev_adv,   internal: song.lev_adv_i   },
      exp:   { display: song.lev_exp,   internal: song.lev_exp_i   },
      mas:   { display: song.lev_mas,   internal: song.lev_mas_i   },
      remas: { display: song.lev_remas, internal: song.lev_remas_i },
      utage: { display: song.lev_utage },
      kanji: song.kanji,
    });
  }
  return rows;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DiffCell({ data, diff, kanji, onClick }: { data?: DiffData; diff: string; kanji?: string; onClick?: () => void }) {
  if (!data?.display) return <div className="w-[60px] md:w-[70px]" />;
  const color = DIFF_COLOR[diff];
  const intStr = data.internal ? parseFloat(data.internal).toFixed(1) : null;
  return (
    <div className="w-[60px] md:w-[70px] flex shrink-0 justify-center">
      <div 
        onClick={onClick}
        className={`w-full rounded text-center py-0.5 px-1 min-h-[36px] flex flex-col justify-center ${onClick ? 'cursor-pointer hover:brightness-125 active:scale-95 transition-all' : ''}`} 
        style={{ background: color + '28' }}
      >
        <div className="font-bold text-sm leading-tight text-white flex items-center justify-center gap-0.5">
          {kanji && <span className="text-[10px] opacity-80" style={{ color }}>[{kanji}]</span>}
          {data.display.replace('?', '')}
        </div>
        {intStr && (
          <div className="text-[10px] leading-tight tabular-nums font-num" style={{ color }}>
            {intStr}
          </div>
        )}
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: 'DX' | 'STD' }) {
  const isDX = type === 'DX';
  return (
    <img
      src={isDX ? '/badges/music_dx.webp' : '/badges/music_standard.webp'}
      alt={isDX ? 'DX' : 'STD'}
      className="h-3.5 object-contain"
    />
  );
}

function ColHeader({
  label, colKey, sort, onSort, className = '',
}: {
  label: string; colKey: string; sort: string; onSort: (k: string) => void; className?: string;
}) {
  const active = sort.startsWith(colKey);
  return (
    <div
      className={`px-2 py-2 text-left text-[11px] font-semibold cursor-pointer select-none whitespace-nowrap flex items-center gap-1 ${className}`}
      style={{ color: active ? '#c4b5fd' : 'var(--foreground-muted)' }}
      onClick={() => onSort(colKey)}
    >
      {label}
      <ArrowUpDown size={10} className="opacity-60" />
    </div>
  );
}

// ── Filter helpers ─────────────────────────────────────────────────────────────
function levelGroup(lev?: string): string | null {
  if (!lev) return null;
  return lev.replace('?', '').trim();
}
function allLevelGroups(songs: Song[]): string[] {
  const s = new Set<string>();
  for (const song of songs) {
    const g = levelGroup(song.lev_mas) ?? levelGroup(song.lev_exp);
    if (g) s.add(g);
  }
  return Array.from(s).sort((a, b) => parseFloat(a.replace('+', '.5')) - parseFloat(b.replace('+', '.5')));
}
function allVersions(songs: Song[]): string[] {
  return Array.from(new Set(songs.map(s => s.version).filter(Boolean)))
    .sort((a, b) => parseInt(b) - parseInt(a));
}

const SELECT_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
};

type SortKey = 'newest' | 'oldest' | 'lev_desc' | 'lev_asc' | 'title';

// ── Main component ─────────────────────────────────────────────────────────────
export default function SongsClient({ songs, currentVersion, categories }: Props) {
  const [query, setQuery]     = useState('');
  const [cat, setCat]         = useState('all');
  const [levelG, setLevelG]   = useState('all');
  const [region, setRegion]   = useState('all');
  const [sort, setSort]       = useState<SortKey>('newest');
  const [view, setView]       = useState<'list' | 'grid'>('grid');

  const [windowWidth, setWindowWidth] = useState(1200);
  
  const [trackTarget, setTrackTarget] = useState<{ songTitle: string, diff: string, type: 'DX' | 'STD', level: number } | null>(null);
  const [targetVal, setTargetVal] = useState('100.5000');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const cb = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', cb);
    return () => window.removeEventListener('resize', cb);
  }, []);

  const levelGroups = useMemo(() => allLevelGroups(songs), [songs]);

  const matchesQuery = useMemo(() => {
    if (!query) return () => true;
    const q = query.toLowerCase();
    return (song: Song) => {
      if (song.title.toLowerCase().includes(q)) return true;
      if (song.artist.toLowerCase().includes(q)) return true;
      if (song.title_kana) {
        const r = toRomaji(song.title_kana).toLowerCase();
        if (r.includes(q) || song.title_kana.toLowerCase().includes(q)) return true;
      }
      return false;
    };
  }, [query]);

  const filtered = useMemo(() => {
    let list = songs.filter(matchesQuery);
    if (cat !== 'all')     list = list.filter(s => s.catcode === cat);
    if (region !== 'all')  list = list.filter(s => region === 'jp' ? s.jp : s.intl);
    if (levelG !== 'all')  list = list.filter(s => {
      const g = levelGroup(s.lev_mas) ?? levelGroup(s.lev_exp);
      return g === levelG;
    });
    switch (sort) {
      case 'newest':   list.sort((a, b) => parseInt(b.version) - parseInt(a.version) || parseInt(b.sort||'0') - parseInt(a.sort||'0')); break;
      case 'oldest':   list.sort((a, b) => parseInt(a.version) - parseInt(b.version) || parseInt(a.sort||'0') - parseInt(b.sort||'0')); break;
      case 'lev_desc': {
        const getLev = (s: Song) => parseFloat(s.dx_lev_mas_i || s.lev_mas_i || s.dx_lev_exp_i || s.lev_exp_i || '0');
        list.sort((a, b) => getLev(b) - getLev(a)); break;
      }
      case 'lev_asc': {
        const getLev = (s: Song) => parseFloat(s.dx_lev_mas_i || s.lev_mas_i || s.dx_lev_exp_i || s.lev_exp_i || '0');
        list.sort((a, b) => getLev(a) - getLev(b)); break;
      }
      case 'title':    list.sort((a, b) => a.title.localeCompare(b.title)); break;
    }
    return list;
  }, [songs, matchesQuery, cat, region, levelG, sort]);

  const tableRows = useMemo(() => filtered.flatMap(expandToRows), [filtered]);

  function handleColSort(colKey: string) {
    if (colKey === 'lev') {
      setSort(s => s === 'lev_desc' ? 'lev_asc' : 'lev_desc');
    } else if (colKey === 'version') {
      setSort(s => s === 'newest' ? 'oldest' : 'newest');
    } else if (colKey === 'title') {
      setSort('title');
    }
  }

  // ── Virtualization ──
  const isGrid = view === 'grid';
  // Columns for grid view based on screen width
  const cols = isGrid ? (windowWidth < 640 ? 3 : windowWidth < 768 ? 4 : windowWidth < 1024 ? 5 : 6) : 1;
  const rowCount = Math.ceil((isGrid ? filtered.length : tableRows.length) / cols);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => isGrid ? (windowWidth / cols) : 60, // Rough estimates
    overscan: 5,
  });

  return (
    <PageWrapper className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Songs</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
            {songs.length.toLocaleString()} Total Songs Available
          </p>
        </div>
      </div>

      {/* ── Search + view toggle ── */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--foreground-subtle)' }} />
          <input
            id="song-search"
            type="text"
            placeholder="Title, artist, or romaji…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/50"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </div>
        <div className="flex rounded-xl overflow-hidden ml-auto" style={{ border: '1px solid var(--border)' }}>
          <button onClick={() => setView('list')} className="px-3 py-2.5 transition-all"
            style={{ background: view === 'list' ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)', color: view === 'list' ? '#d8b4fe' : 'var(--foreground-muted)' }}>
            <List size={16} />
          </button>
          <button onClick={() => setView('grid')} className="px-3 py-2.5 transition-all"
            style={{ background: view === 'grid' ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)', color: view === 'grid' ? '#d8b4fe' : 'var(--foreground-muted)' }}>
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3">
        <select id="region-filter" value={region} onChange={e => setRegion(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm outline-none transition-colors hover:bg-white/10" style={SELECT_STYLE}>
          <option value="all">All regions</option>
          <option value="jp">JP (Japan)</option>
          <option value="intl">INTL (International)</option>
        </select>
        <select id="level-filter" value={levelG} onChange={e => setLevelG(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm outline-none transition-colors hover:bg-white/10" style={SELECT_STYLE}>
          <option value="all">All levels</option>
          {levelGroups.map(g => <option key={g} value={g}>Lv {g}</option>)}
        </select>
        <select id="category-filter" value={cat} onChange={e => setCat(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm outline-none transition-colors hover:bg-white/10" style={SELECT_STYLE}>
          <option value="all">All genres</option>
          {categories.map(c => <option key={c} value={c}>{CAT_LABELS[c] || c}</option>)}
        </select>
      </div>

      <p className="text-xs" style={{ color: 'var(--foreground-subtle)' }}>
        {filtered.length.toLocaleString()} results found
      </p>

      {/* ── Virtualized List Header ── */}
      {!isGrid && filtered.length > 0 && (
        <div className="glass rounded-t-2xl px-4 py-2 flex items-center text-sm font-semibold sticky top-0 z-10 backdrop-blur-md" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-[300px] flex-shrink-0 cursor-pointer text-left" onClick={() => handleColSort('title')} style={{ color: sort === 'title' ? '#c4b5fd' : 'var(--foreground-muted)' }}>
            曲名・アーティスト <ArrowUpDown size={10} className="inline ml-1 opacity-60" />
          </div>
          <div className="w-[120px] hidden md:block" onClick={() => handleColSort('version')} style={{ color: sort.startsWith('version') || sort.startsWith('newest') || sort.startsWith('oldest') ? '#c4b5fd' : 'var(--foreground-muted)', cursor: 'pointer' }}>
            バージョン <ArrowUpDown size={10} className="inline ml-1 opacity-60" />
          </div>
          <div className="w-[100px] hidden lg:block text-[var(--foreground-muted)]">ジャンル</div>
          <div className="w-[60px] text-center text-[var(--foreground-muted)] hidden sm:block">DX/Std</div>
          
          <div className="flex flex-1 justify-end items-center gap-1">
            <div className="w-[60px] md:w-[70px] text-center" style={{ color: DIFF_COLOR.bas }}>BSC</div>
            <div className="w-[60px] md:w-[70px] text-center" style={{ color: DIFF_COLOR.adv }}>ADV</div>
            <div className="w-[60px] md:w-[70px] text-center" style={{ color: DIFF_COLOR.exp }}>EXP</div>
            <div className="w-[60px] md:w-[70px] text-center cursor-pointer select-none" onClick={() => handleColSort('lev')} style={{ color: sort.startsWith('lev') ? '#c4b5fd' : DIFF_COLOR.mas }}>
              MAS <ArrowUpDown size={10} className="inline ml-0.5 opacity-60" />
            </div>
            <div className="w-[60px] md:w-[70px] text-center" style={{ color: DIFF_COLOR.remas }}>Re:M</div>
            <div className="w-[60px] md:w-[70px] text-center hidden xl:block" style={{ color: DIFF_COLOR.utage }}>UTA</div>
          </div>
        </div>
      )}

      {/* ── Virtualized Container ── */}
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center" style={{ color: 'var(--foreground-muted)' }}>
            <Music2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No songs match your search</p>
          </div>
        ) : (
          virtualizer.getVirtualItems().map((virtualRow) => {
            if (isGrid) {
              // Grid Row
              const startIndex = virtualRow.index * cols;
              const rowItems = filtered.slice(startIndex, startIndex + cols);

              return (
                <div
                  key={virtualRow.index}
                  className="absolute top-0 left-0 w-full flex gap-3 pb-3"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                >
                  {rowItems.map((song, i) => {
                    const isNew = parseInt(song.version) >= currentVersion - 500;
                    const masConst = song.lev_mas_i ? parseFloat(song.lev_mas_i).toFixed(1) : song.lev_mas;
                    
                    return (
                      <motion.div
                        key={song.title}
                        whileHover={{ scale: 1.03, y: -5 }}
                        className="relative flex-1 aspect-square rounded-xl overflow-hidden glass shadow-lg border"
                        style={{
                          borderColor: isNew ? DIFF_COLOR.mas : 'rgba(255,255,255,0.1)',
                          maxWidth: `calc(100% / ${cols} - 12px)`
                        }}
                      >
                        {song.image_url ? (
                          <img
                            src={getJacketUrl(song.image_url, song.intl)}
                            alt={song.title}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                            <Music2 size={24} className="text-white/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                        
                        {masConst && (
                          <span className="absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded shadow"
                            style={{ background: DIFF_COLOR.mas, color: '#fff' }}>
                            {masConst}
                          </span>
                        )}
                        
                        <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
                          <div className="text-xs font-bold text-white leading-tight line-clamp-2 drop-shadow-md">
                            {song.title}
                          </div>
                          <div className="text-[10px] text-white/70 truncate mt-0.5">{song.artist}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {/* Fill empty grid spots to maintain flex basis */}
                  {Array.from({ length: cols - rowItems.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex-1" style={{ maxWidth: `calc(100% / ${cols} - 12px)` }} />
                  ))}
                </div>
              );
            } else {
              // List Row
              const row = tableRows[virtualRow.index];
              const isNew = parseInt(row.song.version) >= currentVersion - 500;
              const jacketUrl = row.song.image_url
                ? getJacketUrl(row.song.image_url, row.song.intl)
                : null;

              return (
                <div
                  key={`${row.song.title}-${row.type}`}
                  className="absolute top-0 left-0 w-full"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                >
                  <motion.div
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                    className="flex items-center px-4 py-2 border-b border-white/5 bg-white/[0.02]"
                    style={{ borderLeft: `3px solid ${isNew ? '#8957e5' : 'transparent'}` }}
                  >
                    <div className="flex items-center gap-3 w-[300px] flex-shrink-0 pr-4">
                      <div className="w-12 h-12 shrink-0 overflow-hidden rounded shadow-sm bg-black/20 relative">
                        {jacketUrl ? (
                          <img src={jacketUrl} alt={row.song.title} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20"><Music2 size={16} /></div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate text-white">{row.song.title}</div>
                        <div className="text-xs truncate text-white/50">{row.song.artist}</div>
                      </div>
                    </div>
                    
                    <div className="w-[120px] hidden md:block text-xs text-white/60 truncate pr-2">
                      {versionLabel(row.song.version)}
                    </div>
                    
                    <div className="w-[100px] hidden lg:block text-[11px] text-white/50 truncate pr-2">
                      {CAT_LABELS[row.song.catcode] || row.song.catcode}
                    </div>

                    <div className="w-[60px] hidden sm:flex justify-center shrink-0 pr-2">
                      <TypeBadge type={row.type} />
                    </div>

                    <div className="flex flex-1 justify-end items-center gap-1">
                      <DiffCell data={row.bas} diff="bas" onClick={row.bas.internal ? () => setTrackTarget({ songTitle: row.song.title, diff: 'BAS', type: row.type, level: parseFloat(row.bas.internal!) }) : undefined} />
                      <DiffCell data={row.adv} diff="adv" onClick={row.adv.internal ? () => setTrackTarget({ songTitle: row.song.title, diff: 'ADV', type: row.type, level: parseFloat(row.adv.internal!) }) : undefined} />
                      <DiffCell data={row.exp} diff="exp" onClick={row.exp.internal ? () => setTrackTarget({ songTitle: row.song.title, diff: 'EXP', type: row.type, level: parseFloat(row.exp.internal!) }) : undefined} />
                      <DiffCell data={row.mas} diff="mas" onClick={row.mas.internal ? () => setTrackTarget({ songTitle: row.song.title, diff: 'MAS', type: row.type, level: parseFloat(row.mas.internal!) }) : undefined} />
                      <DiffCell data={row.remas} diff="remas" onClick={row.remas.internal ? () => setTrackTarget({ songTitle: row.song.title, diff: 'REMAS', type: row.type, level: parseFloat(row.remas.internal!) }) : undefined} />
                      <div className="hidden xl:block">
                        <DiffCell data={row.utage} diff="utage" kanji={row.kanji} />
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            }
          })
        )}
      </div>

      <AnimatePresence>
        {trackTarget && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm relative shadow-2xl"
            >
              <button onClick={() => setTrackTarget(null)} className="absolute top-4 right-4 text-white/50 hover:text-white">✕</button>
              <h2 className="text-xl font-bold text-white mb-1">Add Target</h2>
              <div className="text-sm text-white/50 mb-4 truncate">{trackTarget.songTitle}</div>
              
              <div className="flex items-center gap-3 mb-6 p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: DIFF_COLOR[trackTarget.diff.toLowerCase()] + '33', color: DIFF_COLOR[trackTarget.diff.toLowerCase()] }}>
                  {trackTarget.diff} {trackTarget.level.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-white/50">{trackTarget.type}</span>
              </div>
              
              <div className="mb-6">
                <label className="block text-xs text-white/50 font-bold uppercase tracking-wider mb-2">Target Accuracy (%)</label>
                <input 
                  autoFocus
                  type="number" 
                  step="0.0001"
                  value={targetVal}
                  onChange={e => setTargetVal(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white font-num text-lg outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setTrackTarget(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-white/70 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={saving}
                  onClick={async () => {
                    const val = parseFloat(targetVal);
                    if (isNaN(val)) return;
                    setSaving(true);
                    await addTracker(trackTarget.songTitle, trackTarget.diff, trackTarget.type, val);
                    setSaving(false);
                    setTrackTarget(null);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-500 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Track'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}

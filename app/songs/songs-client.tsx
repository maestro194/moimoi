'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, Music2, Calendar, Tag, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import type { Song, UnifiedTag } from '@/lib/types';

import { PageWrapper } from '@/components/page-wrapper';
import { AnimatePresence, motion } from 'framer-motion';
import { toRomaji } from '@/lib/romaji';
import { getJacketUrl } from '@/lib/song-db';
import { addTracker } from '@/app/tracker/actions';
import { SongDetailsModal } from './SongDetailsModal';
import { ChartActionModal } from '@/components/chart-action-modal';
import { useTags } from '@/lib/useTags';
import SongsLoading from './loading';

// ── Module-level cache — survives navigation (lives in JS module scope) ────────
interface SongsPayload {
  songs: Song[];
  currentVersion: number;
  categories: string[];
}
let _cache: (SongsPayload & { fetchedAt: number }) | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Exposed so the song-refresh flow can bust the cache immediately
export function bustSongsCache() { _cache = null; }

function useSongs() {
  // Synchronous initialiser: if the cache is warm, we never enter a loading state
  const [data, setData] = useState<SongsPayload | null>(() => {
    if (_cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
      const { fetchedAt: _, ...payload } = _cache;
      return payload;
    }
    return null;
  });
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    // Cache hit — nothing to do
    if (data) return;

    let cancelled = false;
    fetch('/api/songs')
      .then(r => r.json())
      .then((payload: SongsPayload) => {
        if (cancelled) return;
        _cache = { ...payload, fetchedAt: Date.now() };
        setData(payload);
        setLoading(false);
      })
      .catch(err => {
        console.error('[SongsClient] Failed to load songs:', err);
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — runs once on mount

  return {
    songs: data?.songs ?? [],
    currentVersion: data?.currentVersion ?? 0,
    categories: data?.categories ?? [],
    loading,
  };
}

interface ChartRow {
  song: Song;
  type: 'DX' | 'STD';
  difficulty: 'basic' | 'advanced' | 'expert' | 'master' | 'remaster';
  abbr: 'BAS' | 'ADV' | 'EXP' | 'MAS' | 'REMAS' | 'UTAGE';
  display: string;
  internal: string;
}

// ── Constants (module-level, never re-created) ──────────────────────────────

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

const DIFF_COLOR: Record<string, string> = {
  bas: '#3fb950', adv: '#d4a017', exp: '#da3633',
  mas: '#8957e5', remas: '#d2a8ff', utage: '#bf1b5e',
};

const ABBR_TO_KEY: Record<string, string> = {
  BAS: 'bas', ADV: 'adv', EXP: 'exp', MAS: 'mas', REMAS: 'remas', UTAGE: 'utage',
};

const DIFF_LABELS: Record<string, string> = {
  BAS: 'BASIC', ADV: 'ADVANCED', EXP: 'EXPERT', MAS: 'MASTER', REMAS: 'Re:MASTER', UTAGE: 'UTAGE',
};

function formatDate(d?: string): string | null {
  if (!d || d.length < 8) return null;
  return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
}

type SortKey = 'newest' | 'oldest' | 'lev_desc' | 'lev_asc' | 'title' | 'bpm_desc' | 'bpm_asc' | 'date_desc' | 'date_asc' | 'tags_desc';

// ── Pure functions (module-level) ───────────────────────────────────────────

function expandToChartRows(song: Song, includeUtage = false, showLowerDiffs = false): ChartRow[] {
  const rows: ChartRow[] = [];
  const hasDX = !!(song.dx_lev_mas_i || song.dx_lev_exp_i || song.dx_lev_bas_i);
  const hasSTD = !!(song.lev_mas_i || song.lev_exp_i || song.lev_bas_i);

  const DIFFS: Array<{
    abbr: ChartRow['abbr']; difficulty: ChartRow['difficulty'];
    dxDisplay?: string; dxInternal?: string; stdDisplay?: string; stdInternal?: string;
  }> = [
    { abbr: 'EXP',   difficulty: 'expert',   dxDisplay: song.dx_lev_exp,   dxInternal: song.dx_lev_exp_i,   stdDisplay: song.lev_exp,   stdInternal: song.lev_exp_i },
    { abbr: 'MAS',   difficulty: 'master',   dxDisplay: song.dx_lev_mas,   dxInternal: song.dx_lev_mas_i,   stdDisplay: song.lev_mas,   stdInternal: song.lev_mas_i },
    { abbr: 'REMAS', difficulty: 'remaster', dxDisplay: song.dx_lev_remas, dxInternal: song.dx_lev_remas_i, stdDisplay: song.lev_remas, stdInternal: song.lev_remas_i },
  ];

  if (showLowerDiffs) {
    DIFFS.unshift(
      { abbr: 'BAS', difficulty: 'basic',    dxDisplay: song.dx_lev_bas, dxInternal: song.dx_lev_bas_i, stdDisplay: song.lev_bas, stdInternal: song.lev_bas_i },
      { abbr: 'ADV', difficulty: 'advanced', dxDisplay: song.dx_lev_adv, dxInternal: song.dx_lev_adv_i, stdDisplay: song.lev_adv, stdInternal: song.lev_adv_i },
    );
  }

  if (includeUtage && song.lev_utage) {
    DIFFS.push({ abbr: 'UTAGE' as any, difficulty: 'utage' as any, stdDisplay: song.lev_utage, stdInternal: song.lev_utage });
  }

  for (const d of DIFFS) {
    if (hasDX && d.dxInternal) rows.push({ song, type: 'DX', difficulty: d.difficulty, abbr: d.abbr, display: d.dxDisplay ?? d.dxInternal, internal: d.dxInternal });
    if (hasSTD && d.stdInternal) rows.push({ song, type: 'STD', difficulty: d.difficulty, abbr: d.abbr, display: d.stdDisplay ?? d.stdInternal, internal: d.stdInternal });
  }
  return rows;
}

function allLevelGroups(songs: Song[]): string[] {
  const s = new Set<string>();
  for (const song of songs) {
    const lev = song.lev_mas ?? song.lev_exp;
    if (lev) s.add(lev.replace('?', '').trim());
  }
  return Array.from(s).sort((a, b) => parseFloat(a.replace('+', '.5')) - parseFloat(b.replace('+', '.5')));
}

// ── TagChips — pure display, receives pre-computed tags ─────────────────────

function TagChips({ tags }: { tags: UnifiedTag[] }) {
  if (tags.length === 0) return null;
  const shown = tags.slice(0, 3);
  const extra = tags.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1 mt-0.5" style={{ lineHeight: 1 }}>
      {shown.map(tag => (
        <span
          key={tag.key}
          className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap"
          style={{ backgroundColor: tag.color + '28', color: tag.color, border: `1px solid ${tag.color}40` }}
          title={tag.description ?? tag.name}
        >
          {tag.name}
        </span>
      ))}
      {extra > 0 && <span className="text-[10px] text-white/30 self-center">+{extra}</span>}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

// SongsContent receives pre-fetched data — always mounts with the same hook count.
function SongsContent({ songs, currentVersion, categories }: { songs: Song[]; currentVersion: number; categories: string[] }) {
  const allSongs = songs;

  // ── Filter / sort state
  const [query, setQuery]             = useState('');
  const [cat, setCat]                 = useState('all');
  const [levelG, setLevelG]           = useState('all');
  const [sort, setSort]               = useState<SortKey>('date_desc');
  const [selectedTagKeys, setSelectedTagKeys] = useState<string[]>([]);
  const [tagPanelOpen, setTagPanelOpen] = useState(false);
  const [showUtage, setShowUtage]     = useState(false);
  const [showLowerDiffs, setShowLowerDiffs] = useState(false);

  // ── Modal state
  const [trackTarget, setTrackTarget] = useState<{ songTitle: string; diff: string; type: 'DX' | 'STD'; level: number } | null>(null);
  const [detailsRow, setDetailsRow]   = useState<{ song: Song; type: 'DX' | 'STD'; difficulty: string; abbr: string } | null>(null);
  const [targetVal, setTargetVal]     = useState('100.5000');
  const [saving, setSaving]           = useState(false);

  // ── Tags
  const { getAllUnifiedTags, getTagSongCount, getTagsForChart, getChartTagCount, tagsData, isLoading: tagsLoading } = useTags();
  const allUnifiedTags = useMemo(() => getAllUnifiedTags(), [getAllUnifiedTags, tagsData]);

  const tagFilterGroups = useMemo(() => {
    const comm = new Map<string, { groupName: string; color: string; tags: typeof allUnifiedTags }>();
    const pers = new Map<string, { groupName: string; color: string; tags: typeof allUnifiedTags }>();
    for (const tag of allUnifiedTags) {
      const map = tag.source === 'community' ? comm : pers;
      const ex = map.get(tag.groupName);
      if (ex) ex.tags.push(tag);
      else map.set(tag.groupName, { groupName: tag.groupName, color: tag.color, tags: [tag] });
    }
    return { community: Array.from(comm.values()), personal: Array.from(pers.values()) };
  }, [allUnifiedTags]);

  const songTitles = useMemo(() => allSongs.map(s => s.title), [allSongs]);
  const levelGroups = useMemo(() => allLevelGroups(allSongs), [allSongs]);

  const matchesQuery = useMemo(() => {
    if (!query) return (_: Song) => true;
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
    let songsToFilter = allSongs.filter(matchesQuery);
    if (cat !== 'all') songsToFilter = songsToFilter.filter(s => s.catcode === cat);
    songsToFilter = songsToFilter.filter(s => s.intl);

    let rows = songsToFilter.flatMap(s => expandToChartRows(s, showUtage, showLowerDiffs));

    if (levelG !== 'all') rows = rows.filter(r => r.display?.replace('?', '').trim() === levelG);
    if (selectedTagKeys.length > 0) {
      // ALL mode: chart must have every selected tag
      rows = rows.filter(r => {
        const chartTags = tagsData ? getTagsForChart(r.song.title, r.type, r.abbr).map(t => t.key) : [];
        return selectedTagKeys.every(k => chartTags.includes(k));
      });
    }

    switch (sort) {
      case 'newest':    rows.sort((a, b) => parseInt(b.song.version) - parseInt(a.song.version) || parseInt(b.song.sort || '0') - parseInt(a.song.sort || '0')); break;
      case 'oldest':    rows.sort((a, b) => parseInt(a.song.version) - parseInt(b.song.version) || parseInt(a.song.sort || '0') - parseInt(b.song.sort || '0')); break;
      case 'lev_desc':  rows.sort((a, b) => parseFloat(b.internal) - parseFloat(a.internal)); break;
      case 'lev_asc':   rows.sort((a, b) => parseFloat(a.internal) - parseFloat(b.internal)); break;
      case 'title':     rows.sort((a, b) => a.song.title.localeCompare(b.song.title)); break;
      case 'bpm_desc':  rows.sort((a, b) => (parseInt(b.song.bpm || '0') || 0) - (parseInt(a.song.bpm || '0') || 0)); break;
      case 'bpm_asc':   rows.sort((a, b) => (parseInt(a.song.bpm || '0') || 0) - (parseInt(b.song.bpm || '0') || 0)); break;
      case 'date_desc': rows.sort((a, b) => (b.song.date_intl_added || '0').localeCompare(a.song.date_intl_added || '0')); break;
      case 'date_asc':  rows.sort((a, b) => (a.song.date_intl_added || '0').localeCompare(b.song.date_intl_added || '0')); break;
      case 'tags_desc': rows.sort((a, b) => getChartTagCount(b.song.title, b.type, b.abbr) - getChartTagCount(a.song.title, a.type, a.abbr)); break;
    }
    return rows;
  }, [allSongs, matchesQuery, cat, levelG, sort, showUtage, showLowerDiffs, selectedTagKeys, getChartTagCount, getTagsForChart, tagsData]);

  // Build rows with date headers; attach pre-computed tags to each row so
  // we don't call useTags() inside every virtualizer cell.
  const tableRows = useMemo(() => {
    const isByDate = sort === 'date_desc' || sort === 'date_asc';
    type Row =
      | { kind: 'header'; date: string }
      | { kind: 'song'; row: ChartRow; tags: UnifiedTag[] };

    const result: Row[] = [];
    let lastDate = '';

    for (const r of filtered) {
      const tags = tagsData ? getTagsForChart(r.song.title, r.type, r.abbr) : [];
      const hasTags = tags.length > 0;

      if (isByDate) {
        const d = r.song.date_intl_added || '';
        if (d !== lastDate) { result.push({ kind: 'header', date: d }); lastDate = d; }
      }

      result.push({ kind: 'song', row: r, tags });
    }
    return result;
  }, [filtered, sort, tagsData, getTagsForChart]);

  function handleColSort(colKey: string) {
    if (colKey === 'lev') setSort(s => s === 'lev_desc' ? 'lev_asc' : 'lev_desc');
    else if (colKey === 'version') setSort(s => s === 'newest' ? 'oldest' : 'newest');
    else if (colKey === 'title') setSort('title');
    else if (colKey === 'date') setSort(s => s === 'date_desc' ? 'date_asc' : 'date_desc');
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(tableRows.length / PAGE_SIZE);

  // Reset to page 1 whenever any filter or sort changes
  useEffect(() => { setPage(1); }, [query, cat, levelG, sort, showUtage, showLowerDiffs, selectedTagKeys]);

  const pageRows = useMemo(
    () => tableRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [tableRows, page]
  );

  const goToPage = useCallback((p: number) => {
    setPage(p);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Build pagination page numbers with ellipsis
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const delta = 2;
    const range: (number | '...')[] = [];
    const left  = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    range.push(1);
    if (left > 2) range.push('...');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push('...');
    range.push(totalPages);
    return range;
  }, [totalPages, page]);

  const parentRef = useRef<HTMLDivElement>(null); // kept for layout ref

  const toggleTag = useCallback((key: string, exclusive = false) => {
    setSelectedTagKeys(prev =>
      exclusive
        ? [key]
        : prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }, []);

  return (
    <PageWrapper className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-3">

      {/* ── Page title + count ─────────────────────────────────────────────── */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Songs</h1>
        <span className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
          {allSongs.length.toLocaleString()} songs · <span className="text-purple-400">{filtered.length.toLocaleString()} charts</span>
        </span>
      </div>

      {/* ── Filters (all in one sticky bar) ────────────────────────────────── */}
      <div
        className="glass rounded-2xl p-3 space-y-2.5 sticky top-0 z-20 backdrop-blur-xl"
        style={{ border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Row 1: search + sort + toggles */}
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-44">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              id="song-search"
              type="text"
              placeholder="Title, artist, romaji…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-sm outline-none bg-white/5 transition-all focus:ring-1 focus:ring-purple-500/50"
              style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }}
            />
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="px-3 py-2 rounded-xl text-sm outline-none bg-white/5 transition-colors hover:bg-white/8"
            style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="lev_desc">Level ↓</option>
            <option value="lev_asc">Level ↑</option>
            <option value="bpm_desc">BPM ↓</option>
            <option value="bpm_asc">BPM ↑</option>
            <option value="title">A–Z</option>
            <option value="tags_desc">Most Tagged</option>
          </select>

          {/* Level filter */}
          <select
            id="level-filter"
            value={levelG}
            onChange={e => setLevelG(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none bg-white/5 transition-colors hover:bg-white/8"
            style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }}
          >
            <option value="all">All Lv</option>
            {levelGroups.map(g => <option key={g} value={g}>Lv {g}</option>)}
          </select>

          {/* Genre filter */}
          <select
            id="category-filter"
            value={cat}
            onChange={e => setCat(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none bg-white/5 transition-colors hover:bg-white/8"
            style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }}
          >
            <option value="all">All genres</option>
            {categories.map(c => <option key={c} value={c}>{CAT_LABELS[c] || c}</option>)}
          </select>

          {/* BAS/ADV toggle */}
          <button
            onClick={() => setShowLowerDiffs(v => !v)}
            className="px-3 py-2 rounded-xl text-sm transition-all border"
            style={{
              backgroundColor: showLowerDiffs ? 'rgba(63,185,80,0.18)' : 'rgba(255,255,255,0.04)',
              borderColor: showLowerDiffs ? '#3fb95070' : 'rgba(255,255,255,0.08)',
              color: showLowerDiffs ? '#3fb950' : 'var(--foreground-muted)',
            }}
          >
            {showLowerDiffs ? '● BAS/ADV' : '○ BAS/ADV'}
          </button>

          {/* UTAGE toggle */}
          <button
            onClick={() => setShowUtage(v => !v)}
            className="px-3 py-2 rounded-xl text-sm transition-all border"
            style={{
              backgroundColor: showUtage ? 'rgba(191,27,94,0.18)' : 'rgba(255,255,255,0.04)',
              borderColor: showUtage ? '#bf1b5e70' : 'rgba(255,255,255,0.08)',
              color: showUtage ? '#f472b6' : 'var(--foreground-muted)',
            }}
          >
            {showUtage ? '● UTAGE' : '○ UTAGE'}
          </button>
        </div>

        {/* Row 2: Tags accordion */}
        <div>
          <button
            className="w-full flex items-center gap-2 text-sm text-left transition-colors rounded-xl px-1"
            onClick={() => setTagPanelOpen(v => !v)}
          >
            <Tag size={13} style={{ color: selectedTagKeys.length > 0 ? '#c4b5fd' : 'var(--foreground-muted)' }} />
            <span style={{ color: selectedTagKeys.length > 0 ? '#c4b5fd' : 'var(--foreground-muted)' }} className="font-semibold">
              Tags
            </span>
            {selectedTagKeys.length > 0 && (
              <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                {selectedTagKeys.length} active
              </span>
            )}
            {tagsLoading && <span className="text-[11px] text-white/30 ml-1">Loading…</span>}
            <span className="ml-auto opacity-40">
              {tagPanelOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </span>
          </button>

          {/* CSS grid expand — no layout reflow */}
          <div
            className="overflow-hidden transition-[grid-template-rows] duration-200"
            style={{ display: 'grid', gridTemplateRows: tagPanelOpen ? '1fr' : '0fr' }}
          >
            <div className="overflow-hidden">
              <div className="pt-2.5 pb-1 px-1 flex flex-col gap-3">
                {allUnifiedTags.length === 0 && !tagsLoading && (
                  <p className="text-xs text-white/30">Community tags load from dxrating. Personal tags appear after you add them.</p>
                )}

                {tagFilterGroups.community.map(group => (
                  <div key={`com-${group.groupName}`} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Globe size={10} className="text-blue-400/60" />
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">{group.groupName}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.tags.map(tag => {
                        const isActive = selectedTagKeys.includes(tag.key);
                        const count = getTagSongCount(tag.key, songTitles);
                        return (
                          <button
                            key={tag.key}
                            onClick={e => toggleTag(tag.key, e.ctrlKey || e.metaKey)}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-all active:scale-95"
                            style={{
                              backgroundColor: isActive ? tag.color + '35' : tag.color + '15',
                              border: `1px solid ${isActive ? tag.color + '80' : tag.color + '30'}`,
                              color: isActive ? tag.color : tag.color + 'aa',
                              opacity: selectedTagKeys.length > 0 && !isActive ? 0.5 : 1,
                            }}
                          >
                            {tag.name}<span className="opacity-50 text-[10px]">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {tagFilterGroups.personal.map(group => (
                  <div key={`per-${group.groupName}`} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">{group.groupName}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.tags.map(tag => {
                        const isActive = selectedTagKeys.includes(tag.key);
                        const count = getTagSongCount(tag.key, songTitles);
                        return (
                          <button
                            key={tag.key}
                            onClick={e => toggleTag(tag.key, e.ctrlKey || e.metaKey)}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-all active:scale-95"
                            style={{
                              backgroundColor: isActive ? tag.color + '35' : tag.color + '15',
                              border: `1px solid ${isActive ? tag.color + '80' : tag.color + '30'}`,
                              color: isActive ? tag.color : tag.color + 'aa',
                              opacity: selectedTagKeys.length > 0 && !isActive ? 0.5 : 1,
                            }}
                          >
                            {tag.name}<span className="opacity-50 text-[10px]">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {selectedTagKeys.length > 0 && (
                  <button
                    onClick={() => setSelectedTagKeys([])}
                    className="text-[11px] text-white/30 hover:text-white/60 transition-colors w-fit"
                  >
                    × Clear tag filter
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Column header ─────────────────────────────────────────────────────── */}
      {filtered.length > 0 && (() => {
        const isLevSort   = sort === 'lev_desc' || sort === 'lev_asc';
        const isVerSort   = sort === 'newest'   || sort === 'oldest';
        const isTitleSort = sort === 'title';
        const levArrow    = sort === 'lev_asc'  ? '↑' : sort === 'lev_desc' ? '↓' : '↕';
        const verArrow    = sort === 'oldest'   ? '↑' : sort === 'newest'   ? '↓' : '';
        const col = (active: boolean) =>
          `cursor-pointer select-none transition-colors ${active ? 'text-purple-300' : 'text-white/30 hover:text-white/55'}`;
        return (
          <div className="flex items-center px-4 py-2 text-[11px] font-semibold tracking-widest uppercase sticky top-0 z-10 backdrop-blur-xl rounded-xl"
            style={{ background: 'linear-gradient(135deg, rgba(12,9,24,0.92) 0%, rgba(20,14,42,0.88) 100%)', border: '1px solid rgba(139,92,246,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
            <div className={`flex-1 min-w-0 ${col(isTitleSort)}`} onClick={() => handleColSort('title')}>Title / Artist</div>
            <div className={`w-[120px] hidden md:flex items-center gap-1 ${col(isVerSort)}`} onClick={() => handleColSort('version')}>
              Version {verArrow && <span className="opacity-60 text-base leading-none">{verArrow}</span>}
            </div>
            <div className="w-[60px] hidden sm:block text-center text-white/20">Type</div>
            <div className="w-[100px] hidden sm:block text-center text-white/20">Difficulty</div>
            <div className={`w-[80px] text-right flex items-center justify-end gap-0.5 ${col(isLevSort)}`} onClick={() => handleColSort('lev')}>
              Level <span className="opacity-60 text-base leading-none">{levArrow}</span>
            </div>
          </div>
        );
      })()}

      {/* ── Chart list (current page) ─────────────────────────────────────────── */}
      <div ref={parentRef} className="overflow-hidden rounded-b-xl">
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center" style={{ color: 'var(--foreground-muted)' }}>
            <Music2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No charts match your search</p>
          </div>
        ) : (
          pageRows.map(item => {
            if (item.kind === 'header') {
              const label = formatDate(item.date) ?? item.date ?? 'Unknown';
              return (
                <div key={`header-${item.date}`} className="flex items-center gap-2 px-4 py-1.5 border-b border-white/10" style={{ background: 'rgba(139,92,246,0.08)' }}>
                  <Calendar size={12} style={{ color: '#c4b5fd' }} />
                  <span className="text-xs font-semibold tracking-wide" style={{ color: '#c4b5fd' }}>{label}</span>
                </div>
              );
            }
            const { row, tags } = item;
            const isNew = parseInt(row.song.version) >= currentVersion - 500;
            const jacketUrl = row.song.image_url ? getJacketUrl(row.song.image_url, row.song.intl) : null;
            const abbrKey = ABBR_TO_KEY[row.abbr] ?? row.abbr.toLowerCase();
            const diffColor = DIFF_COLOR[abbrKey] ?? '#9ca3af';
            return (
              <div key={`${row.song.title}-${row.type}-${row.abbr}`}
                className="flex items-center px-4 py-2 border-b border-white/5 bg-white/[0.02] cursor-pointer transition-colors hover:bg-white/[0.05]"
                style={{ borderLeft: `3px solid ${isNew ? '#8957e5' : 'transparent'}` }}
                onClick={() => setDetailsRow({ song: row.song, type: row.type, difficulty: row.difficulty, abbr: row.abbr })}>
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                  <div className="w-10 h-10 shrink-0 overflow-hidden rounded shadow-sm bg-black/20">
                    {jacketUrl ? <img src={jacketUrl} alt={row.song.title} className="w-full h-full object-cover" loading="lazy" /> : <Music2 size={16} className="m-auto mt-2 text-white/20" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate text-white">{row.song.title}</div>
                    <div className="text-xs truncate text-white/50">{row.song.artist}</div>
                    <TagChips tags={tags} />
                  </div>
                </div>
                <div className="w-[120px] hidden md:block text-xs text-white/50 truncate pr-2 shrink-0">{versionLabel(row.song.version)}</div>
                <div className="w-[60px] hidden sm:flex justify-center shrink-0">
                  <img src={row.type === 'DX' ? '/badges/music_dx.webp' : '/badges/music_standard.webp'} alt={row.type} className="h-3.5 object-contain" />
                </div>
                <div className="w-[100px] hidden sm:flex justify-center shrink-0">
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-sm tracking-wider leading-none"
                    style={{ backgroundColor: diffColor + '30', color: diffColor, border: `1px solid ${diffColor}60` }}>
                    {DIFF_LABELS[row.abbr] ?? row.abbr}
                  </span>
                </div>
                <div className="w-[80px] text-right font-bold font-num text-lg pr-1 shrink-0 hover:opacity-70 transition-opacity"
                  style={{ color: diffColor }}
                  onClick={e => { e.stopPropagation(); setTrackTarget({ songTitle: row.song.title, diff: row.abbr, type: row.type, level: parseFloat(row.internal) }); }}>
                  {parseFloat(row.internal).toFixed(1)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Pagination bar ────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 py-4 flex-wrap">
          <button onClick={() => goToPage(Math.max(1, page - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-25"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground-muted)' }}>
            ← PREV
          </button>
          {pageNumbers.map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-white/25 text-xs select-none">…</span>
            ) : (
              <button key={p} onClick={() => goToPage(p as number)}
                className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                style={{ background: page === p ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.04)', border: `1px solid ${page === p ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.07)'}`, color: page === p ? '#c4b5fd' : 'rgba(255,255,255,0.4)' }}>
                {p}
              </button>
            )
          )}
          <button onClick={() => goToPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-25"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground-muted)' }}>
            NEXT →
          </button>
        </div>
      )}

      <ChartActionModal chart={trackTarget} onClose={() => setTrackTarget(null)} />
      <SongDetailsModal row={detailsRow} onClose={() => setDetailsRow(null)} />
    </PageWrapper>
  );
}

// Thin wrapper — always calls exactly the same hooks (just useSongs).
// SongsContent is only mounted when data is ready, so it can't violate
// the Rules of Hooks by having fewer hooks than expected.
export default function SongsClient() {
  const { songs, currentVersion, categories, loading } = useSongs();
  if (loading) return <SongsLoading />;
  return <SongsContent songs={songs} currentVersion={currentVersion} categories={categories} />;
}

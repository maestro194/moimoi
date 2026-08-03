'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, Music2, Calendar, Tag, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import type { Song, UnifiedTag } from '@/lib/types';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { PageWrapper } from '@/components/page-wrapper';
import { AnimatePresence, motion } from 'framer-motion';
import { toRomaji } from '@/lib/romaji';
import { getJacketUrl } from '@/lib/song-db';
import { addTracker } from '@/app/tracker/actions';
import { SongDetailsModal } from './SongDetailsModal';
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
  const { getAllUnifiedTags, getTagSongCount, getTagsForChart, chartHasAnyTag, getChartTagCount, tagsData, isLoading: tagsLoading } = useTags();
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
      rows = rows.filter(r => chartHasAnyTag(r.song.title, r.type, r.abbr, selectedTagKeys));
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
  }, [allSongs, matchesQuery, cat, levelG, sort, showUtage, showLowerDiffs, selectedTagKeys, chartHasAnyTag, getChartTagCount]);

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
      // Rows with tags are taller — flag it so estimateSize can differentiate.
      // (The virtualizer will measure actual height after render anyway.)
      void hasTags;
    }
    return result;
  }, [filtered, sort, tagsData, getTagsForChart]);

  function handleColSort(colKey: string) {
    if (colKey === 'lev') setSort(s => s === 'lev_desc' ? 'lev_asc' : 'lev_desc');
    else if (colKey === 'version') setSort(s => s === 'newest' ? 'oldest' : 'newest');
    else if (colKey === 'title') setSort('title');
    else if (colKey === 'date') setSort(s => s === 'date_desc' ? 'date_asc' : 'date_desc');
  }

  // ── Virtualizer with dynamic measurement ────────────────────────────────
  // measureElement allows the virtualizer to read the actual rendered height,
  // so tag chips (which make rows taller) don't clip into the next row.
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useWindowVirtualizer({
    count: tableRows.length,
    // Base estimate: 58 plain, 72 with tags (will be corrected by measureElement)
    estimateSize: (i) => {
      const item = tableRows[i];
      if (!item || item.kind === 'header') return 36;
      return item.tags.length > 0 ? 72 : 58;
    },
    overscan: 8,
    // measureElement lets the virtualizer read real heights after paint
    measureElement:
      typeof window !== 'undefined'
        ? (el) => el?.getBoundingClientRect().height ?? 58
        : undefined,
  });

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

      {/* ── Column header (sticky below filter bar) ─────────────────────────── */}
      {filtered.length > 0 && (
        <div className="glass rounded-xl px-4 py-2 flex items-center text-xs font-semibold sticky top-[var(--filter-bar-h,140px)] z-10 backdrop-blur-md"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex-1 min-w-0 cursor-pointer select-none" onClick={() => handleColSort('title')}>Title / Artist</div>
          <div className="w-[120px] hidden md:block cursor-pointer select-none" onClick={() => handleColSort('version')}>Version</div>
          <div className="w-[60px] hidden sm:block text-center">Type</div>
          <div className="w-[100px] hidden sm:block text-center">Difficulty</div>
          <div className="w-[80px] text-right cursor-pointer select-none" onClick={() => handleColSort('lev')}>Level ↕</div>
        </div>
      )}

      {/* ── Virtual list ──────────────────────────────────────────────────────── */}
      <div
        ref={parentRef}
        style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
      >
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center" style={{ color: 'var(--foreground-muted)' }}>
            <Music2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No charts match your search</p>
          </div>
        ) : (
          virtualizer.getVirtualItems().map(virtualRow => {
            const item = tableRows[virtualRow.index];

            // ── Date header row ──
            if (item.kind === 'header') {
              const label = formatDate(item.date) ?? item.date ?? 'Unknown';
              return (
                <div
                  key={`header-${item.date}`}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="absolute top-0 left-0 w-full"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div className="flex items-center gap-2 px-4 py-1.5 border-b border-white/10" style={{ background: 'rgba(139,92,246,0.08)' }}>
                    <Calendar size={12} style={{ color: '#c4b5fd' }} />
                    <span className="text-xs font-semibold tracking-wide" style={{ color: '#c4b5fd' }}>{label}</span>
                  </div>
                </div>
              );
            }

            // ── Chart row ──
            const { row, tags } = item;
            const isNew = parseInt(row.song.version) >= currentVersion - 500;
            const jacketUrl = row.song.image_url ? getJacketUrl(row.song.image_url, row.song.intl) : null;
            const abbrKey = ABBR_TO_KEY[row.abbr] ?? row.abbr.toLowerCase();
            const diffColor = DIFF_COLOR[abbrKey] ?? '#9ca3af';

            return (
              <div
                key={`${row.song.title}-${row.type}-${row.abbr}`}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="absolute top-0 left-0 w-full"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                {/* Pure-CSS hover — no framer-motion per row */}
                <div
                  className="song-list-row flex items-center px-4 py-2 border-b border-white/5 bg-white/[0.02] cursor-pointer transition-colors hover:bg-white/[0.05]"
                  style={{ borderLeft: `3px solid ${isNew ? '#8957e5' : 'transparent'}` }}
                  onClick={() => setDetailsRow({ song: row.song, type: row.type, difficulty: row.difficulty, abbr: row.abbr })}
                >
                  {/* Jacket + title */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                    <div className="w-10 h-10 shrink-0 overflow-hidden rounded shadow-sm bg-black/20">
                      {jacketUrl
                        ? <img src={jacketUrl} alt={row.song.title} className="w-full h-full object-cover" loading="lazy" />
                        : <Music2 size={16} className="m-auto mt-2 text-white/20" />
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate text-white">{row.song.title}</div>
                      <div className="text-xs truncate text-white/50">{row.song.artist}</div>
                      {/* Tags pre-computed — no extra hook call per row */}
                      <TagChips tags={tags} />
                    </div>
                  </div>

                  {/* Version */}
                  <div className="w-[120px] hidden md:block text-xs text-white/50 truncate pr-2 shrink-0">
                    {versionLabel(row.song.version)}
                  </div>

                  {/* Type badge */}
                  <div className="w-[60px] hidden sm:flex justify-center shrink-0">
                    <img
                      src={row.type === 'DX' ? '/badges/music_dx.webp' : '/badges/music_standard.webp'}
                      alt={row.type}
                      className="h-3.5 object-contain"
                    />
                  </div>

                  {/* Difficulty pill */}
                  <div className="w-[100px] hidden sm:flex justify-center shrink-0">
                    <span
                      className="text-[11px] font-extrabold px-2 py-0.5 rounded-sm tracking-wider leading-none"
                      style={{ backgroundColor: diffColor + '30', color: diffColor, border: `1px solid ${diffColor}60` }}
                    >
                      {DIFF_LABELS[row.abbr] ?? row.abbr}
                    </span>
                  </div>

                  {/* Level — click opens tracker target */}
                  <div
                    className="w-[80px] text-right font-bold font-num text-lg pr-1 shrink-0 hover:opacity-70 transition-opacity"
                    style={{ color: diffColor }}
                    onClick={e => {
                      e.stopPropagation();
                      setTrackTarget({ songTitle: row.song.title, diff: row.abbr, type: row.type, level: parseFloat(row.internal) });
                    }}
                  >
                    {parseFloat(row.internal).toFixed(1)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Track target modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {trackTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm relative shadow-2xl"
            >
              <button onClick={() => setTrackTarget(null)} className="absolute top-4 right-4 text-white/50 hover:text-white">✕</button>
              <h2 className="text-xl font-bold text-white mb-1">Add Target</h2>
              <div className="text-sm text-white/50 mb-4 truncate">{trackTarget.songTitle}</div>

              <div className="flex items-center gap-3 mb-6 p-3 bg-white/5 rounded-xl border border-white/10">
                <span
                  className="text-xs font-bold px-2 py-1 rounded"
                  style={{
                    backgroundColor: (DIFF_COLOR[trackTarget.diff.toLowerCase()] ?? '#9ca3af') + '33',
                    color: DIFF_COLOR[trackTarget.diff.toLowerCase()] ?? '#9ca3af',
                  }}
                >
                  {trackTarget.diff} {trackTarget.level.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-white/50">{trackTarget.type}</span>
              </div>

              <div className="mb-4">
                <label className="block text-xs text-white/50 font-bold uppercase tracking-wider mb-2">Quick Pick Rank</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { rank: 'S',    val: '97.0000',  color: '#60a5fa' },
                    { rank: 'S+',   val: '98.0000',  color: '#818cf8' },
                    { rank: 'SS',   val: '99.0000',  color: '#a78bfa' },
                    { rank: 'SS+',  val: '99.5000',  color: '#c084fc' },
                    { rank: 'SSS',  val: '100.0000', color: '#f472b6' },
                    { rank: 'SSS+', val: '100.5000', color: '#fb923c' },
                  ] as const).map(({ rank, val, color }) => (
                    <button
                      key={rank}
                      onClick={() => setTargetVal(val)}
                      className="py-2 rounded-lg text-xs font-bold transition-all hover:brightness-125 active:scale-95"
                      style={{
                        background: targetVal === val ? color + '33' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${targetVal === val ? color + '99' : 'rgba(255,255,255,0.08)'}`,
                        color: targetVal === val ? color : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {rank}
                      <span className="block text-[10px] opacity-70 font-normal">{parseFloat(val).toFixed(1)}%</span>
                    </button>
                  ))}
                </div>
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

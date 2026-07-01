'use client';

import { useState, useMemo } from 'react';
import { Search, Music2, LayoutGrid, List, ArrowUpDown, Calendar } from 'lucide-react';
import type { Song } from '@/lib/types';

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

// ── Romaji conversion ──────────────────────────────────────────────────────────
const KANA_ROMAJI: Record<string, string> = {
  'きゃ':'kya','きゅ':'kyu','きょ':'kyo','しゃ':'sha','しゅ':'shu','しょ':'sho',
  'ちゃ':'cha','ちゅ':'chu','ちょ':'cho','にゃ':'nya','にゅ':'nyu','にょ':'nyo',
  'ひゃ':'hya','ひゅ':'hyu','ひょ':'hyo','みゃ':'mya','みゅ':'myu','みょ':'myo',
  'りゃ':'rya','りゅ':'ryu','りょ':'ryo','ぎゃ':'gya','ぎゅ':'gyu','ぎょ':'gyo',
  'じゃ':'ja', 'じゅ':'ju', 'じょ':'jo','びゃ':'bya','びゅ':'byu','びょ':'byo',
  'ぴゃ':'pya','ぴゅ':'pyu','ぴょ':'pyo',
  'あ':'a','い':'i','う':'u','え':'e','お':'o',
  'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
  'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so',
  'た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to',
  'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no',
  'は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho',
  'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo',
  'や':'ya','ゆ':'yu','よ':'yo',
  'ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro',
  'わ':'wa','を':'wo','ん':'n',
  'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go',
  'ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo',
  'だ':'da','ぢ':'di','づ':'du','で':'de','ど':'do',
  'ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo',
  'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po',
  'ぁ':'a','ぃ':'i','ぅ':'u','ぇ':'e','ぉ':'o','っ':'','ー':'-',
};
function toRomaji(kana: string): string {
  const hira = kana.replace(/[\u30A1-\u30F6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  let out = ''; let i = 0;
  while (i < hira.length) {
    if (hira[i] === 'っ') { const n = KANA_ROMAJI[hira[i+1]]; if (n) out += n[0]; i++; continue; }
    const two = hira.slice(i, i+2);
    if (KANA_ROMAJI[two]) { out += KANA_ROMAJI[two]; i += 2; continue; }
    const one = KANA_ROMAJI[hira[i]];
    out += one !== undefined ? one : hira[i]; i++;
  }
  return out;
}

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
  // Has explicit DX internal data (only after song cache refresh with new schema)
  const hasDX = !!(song.dx_lev_mas_i || song.dx_lev_exp_i || song.dx_lev_bas_i);
  // Has distinct STD chart (JP songs with both chart types)
  const hasSTD = hasDX && !!song.lev_mas_i && song.lev_mas_i !== song.dx_lev_mas_i;

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
    // Fallback: normalised data — show as a single row
    rows.push({
      song, type: 'DX',
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

/** A single difficulty cell: display level + internal level stacked. */
function DiffCell({ data, diff, kanji }: { data?: DiffData; diff: string; kanji?: string }) {
  if (!data?.display) return <td className="px-1 py-1 w-[70px]" />;
  const color = DIFF_COLOR[diff];
  const intStr = data.internal ? parseFloat(data.internal).toFixed(1) : null;
  return (
    <td className="px-1 py-1 w-[70px]">
      <div className="rounded text-center py-0.5 px-1 min-h-[36px] flex flex-col justify-center" style={{ background: color + '28' }}>
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
    </td>
  );
}

function TypeBadge({ type }: { type: 'DX' | 'STD' }) {
  const isDX = type === 'DX';
  return (
    <img
      src={isDX ? '/badges/music_dx.webp' : '/badges/music_standard.webp'}
      alt={isDX ? 'DX' : 'STD'}
      className="h-3.5 mx-auto object-contain"
    />
  );
}

/** Sortable column header button. */
function ColHeader({
  label, colKey, sort, onSort, className = '',
}: {
  label: string; colKey: string; sort: string; onSort: (k: string) => void; className?: string;
}) {
  const active = sort.startsWith(colKey);
  return (
    <th
      className={`px-2 py-2 text-left text-[11px] font-semibold cursor-pointer select-none whitespace-nowrap ${className}`}
      style={{ color: active ? '#c4b5fd' : 'var(--foreground-muted)' }}
      onClick={() => onSort(colKey)}
    >
      {label}
      <ArrowUpDown size={10} className="inline ml-1 opacity-60" />
    </th>
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

// ── Sort key type ──────────────────────────────────────────────────────────────
type SortKey = 'newest' | 'oldest' | 'lev_desc' | 'lev_asc' | 'title';

// ── Main component ─────────────────────────────────────────────────────────────
export default function SongsClient({ songs, currentVersion, categories }: Props) {
  const [query, setQuery]     = useState('');
  const [cat, setCat]         = useState('all');
  const [levelG, setLevelG]   = useState('all');
  const [version, setVersion] = useState('all');
  const [sort, setSort]       = useState<SortKey>('newest');
  const [view, setView]       = useState<'list' | 'grid'>('list');
  const [page, setPage]       = useState(0);
  const PAGE_SIZE = view === 'grid' ? 60 : 50;

  const levelGroups = useMemo(() => allLevelGroups(songs), [songs]);
  const versions    = useMemo(() => allVersions(songs), [songs]);

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
    if (version !== 'all') list = list.filter(s => s.version === version);
    if (levelG !== 'all')  list = list.filter(s => {
      const g = levelGroup(s.lev_mas) ?? levelGroup(s.lev_exp);
      return g === levelG;
    });
    switch (sort) {
      case 'newest':   list.sort((a, b) => parseInt(b.version) - parseInt(a.version) || parseInt(b.sort||'0') - parseInt(a.sort||'0')); break;
      case 'oldest':   list.sort((a, b) => parseInt(a.version) - parseInt(b.version) || parseInt(a.sort||'0') - parseInt(b.sort||'0')); break;
      case 'lev_desc': list.sort((a, b) => parseFloat(b.lev_mas_i||b.lev_exp_i||'0') - parseFloat(a.lev_mas_i||a.lev_exp_i||'0')); break;
      case 'lev_asc':  list.sort((a, b) => parseFloat(a.lev_mas_i||a.lev_exp_i||'0') - parseFloat(b.lev_mas_i||b.lev_exp_i||'0')); break;
      case 'title':    list.sort((a, b) => a.title.localeCompare(b.title)); break;
    }
    return list;
  }, [songs, matchesQuery, cat, version, levelG, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  function resetPage() { setPage(0); }

  // Expand songs to rows (handles DX + STD variants)
  const tableRows = useMemo(() => paged.flatMap(expandToRows), [paged]);

  // Column sort click handler
  function handleColSort(colKey: string) {
    if (colKey === 'lev') {
      setSort(s => s === 'lev_desc' ? 'lev_asc' : 'lev_desc');
    } else if (colKey === 'version') {
      setSort(s => s === 'newest' ? 'oldest' : 'newest');
    } else if (colKey === 'title') {
      setSort('title');
    }
    resetPage();
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Songs</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
          {songs.length.toLocaleString()} songs in database
        </p>
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
            onChange={e => { setQuery(e.target.value); resetPage(); }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
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
        <select id="version-filter" value={version} onChange={e => { setVersion(e.target.value); resetPage(); }}
          className="px-3 py-2 rounded-xl text-sm outline-none" style={SELECT_STYLE}>
          <option value="all">All versions</option>
          {versions.map(v => <option key={v} value={v}>{versionLabel(v)}</option>)}
        </select>
        <select id="level-filter" value={levelG} onChange={e => { setLevelG(e.target.value); resetPage(); }}
          className="px-3 py-2 rounded-xl text-sm outline-none" style={SELECT_STYLE}>
          <option value="all">All levels</option>
          {levelGroups.map(g => <option key={g} value={g}>Lv {g}</option>)}
        </select>
        <select id="category-filter" value={cat} onChange={e => { setCat(e.target.value); resetPage(); }}
          className="px-3 py-2 rounded-xl text-sm outline-none" style={SELECT_STYLE}>
          <option value="all">All genres</option>
          {categories.map(c => <option key={c} value={c}>{CAT_LABELS[c] || c}</option>)}
        </select>
      </div>

      <p className="text-xs" style={{ color: 'var(--foreground-subtle)' }}>
        {filtered.length.toLocaleString()} results · page {page + 1}/{totalPages || 1}
      </p>

      {/* ── List (table) view ── */}
      {view === 'list' && (
        <div className="glass rounded-2xl overflow-hidden">
          {paged.length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'var(--foreground-muted)' }}>
              <Music2 size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No songs match your search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {/* Song title + artist */}
                    <th
                      className="px-3 py-2.5 text-left text-[11px] font-semibold cursor-pointer select-none min-w-[200px]"
                      style={{ color: sort === 'title' ? '#c4b5fd' : 'var(--foreground-muted)' }}
                      onClick={() => { handleColSort('title'); }}
                    >
                      曲名・アーティスト <ArrowUpDown size={10} className="inline ml-1 opacity-60" />
                    </th>
                    <ColHeader label="バージョン" colKey="version" sort={sort} onSort={handleColSort} className="min-w-[110px]" />
                    <th className="px-2 py-2.5 text-left text-[11px] font-semibold whitespace-nowrap min-w-[90px]"
                      style={{ color: 'var(--foreground-muted)' }}>ジャンル</th>
                    <th className="px-2 py-2.5 text-center text-[11px] font-semibold whitespace-nowrap w-[88px]"
                      style={{ color: 'var(--foreground-muted)' }}>DX/Std</th>
                    {/* Difficulty columns */}
                    <th className="px-1 py-2.5 text-center text-[11px] font-semibold w-[70px]"
                      style={{ color: DIFF_COLOR.bas }}>BSC</th>
                    <th className="px-1 py-2.5 text-center text-[11px] font-semibold w-[70px]"
                      style={{ color: DIFF_COLOR.adv }}>ADV</th>
                    <th className="px-1 py-2.5 text-center text-[11px] font-semibold w-[70px]"
                      style={{ color: DIFF_COLOR.exp }}>EXP</th>
                    <th
                      className="px-1 py-2.5 text-center text-[11px] font-semibold w-[70px] cursor-pointer select-none"
                      style={{ color: sort.startsWith('lev') ? '#c4b5fd' : DIFF_COLOR.mas }}
                      onClick={() => handleColSort('lev')}
                    >
                      MAS <ArrowUpDown size={10} className="inline ml-0.5 opacity-60" />
                    </th>
                    <th className="px-1 py-2.5 text-center text-[11px] font-semibold w-[70px]"
                      style={{ color: DIFF_COLOR.remas }}>Re:M</th>
                    <th className="px-1 py-2.5 text-center text-[11px] font-semibold w-[70px]"
                      style={{ color: DIFF_COLOR.utage }}>UTA</th>
                    {/* Date */}
                    <th className="px-2 py-2.5 text-center text-[11px] font-semibold whitespace-nowrap min-w-[90px]"
                      style={{ color: 'var(--foreground-muted)' }}>
                      <Calendar size={11} className="inline mr-1 opacity-70" />更新日
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, i) => {
                    const isNew = parseInt(row.song.version) >= currentVersion - 500;
                    const jacketUrl = row.song.image_url
                      ? `https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/jacket/${row.song.image_url}`
                      : null;
                    const date = formatDate(row.song.date_added);

                    return (
                      <tr
                        key={`${row.song.title}-${row.type}-${i}`}
                        className="group hover:bg-white/[0.04] transition-colors"
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          borderLeft: `3px solid ${isNew ? '#8957e5' : 'transparent'}`,
                        }}
                      >
                        {/* Song info: jacket + title + artist */}
                        <td className="px-0 py-0">
                          <div className="flex items-center gap-2.5 pr-3">
                            {/* Jacket */}
                            <div className="w-12 h-12 shrink-0 overflow-hidden" style={{ minWidth: '3rem' }}>
                              {jacketUrl ? (
                                <img src={jacketUrl} alt={row.song.title}
                                  className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"
                                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--foreground-subtle)' }}>
                                  <Music2 size={18} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 py-2">
                              <div className="font-semibold text-sm truncate text-white leading-tight max-w-[220px]">
                                {row.song.title}
                              </div>
                              <div className="text-[11px] truncate leading-tight mt-0.5 max-w-[220px]"
                                style={{ color: 'var(--foreground-muted)' }}>
                                {row.song.artist}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Version */}
                        <td className="px-2 py-1 whitespace-nowrap">
                          <span className="text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
                            {versionLabel(row.song.version)}
                          </span>
                        </td>

                        {/* Genre */}
                        <td className="px-2 py-1 whitespace-nowrap">
                          <span className="text-[11px]" style={{ color: 'var(--foreground-subtle)' }}>
                            {CAT_LABELS[row.song.catcode] || row.song.catcode}
                          </span>
                        </td>

                        {/* DX / STD badge */}
                        <td className="px-2 py-1 text-center">
                          <TypeBadge type={row.type} />
                        </td>

                        {/* Difficulty columns */}
                        <DiffCell data={row.bas}   diff="bas"   />
                        <DiffCell data={row.adv}   diff="adv"   />
                        <DiffCell data={row.exp}   diff="exp"   />
                        <DiffCell data={row.mas}   diff="mas"   />
                        <DiffCell data={row.remas} diff="remas" />
                        <DiffCell data={row.utage} diff="utage" kanji={row.kanji} />

                        {/* Date */}
                        <td className="px-2 py-1 text-center">
                          {date && (
                            <span className="text-[11px] tabular-nums" style={{ color: 'var(--foreground-subtle)' }}>
                              {date}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Grid view (unchanged) ── */}
      {view === 'grid' && (
        paged.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center" style={{ color: 'var(--foreground-muted)' }}>
            <Music2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No songs match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {paged.map((song, i) => {
              const isNew = parseInt(song.version) >= currentVersion - 500;
              const masConst = song.lev_mas_i ? parseFloat(song.lev_mas_i).toFixed(1) : song.lev_mas;
              return (
                <div key={`${song.title}-${i}`}
                  className="relative aspect-square rounded-xl overflow-hidden group"
                  style={{ border: `2px solid ${isNew ? DIFF_COLOR.mas : 'rgba(255,255,255,0.1)'}` }}>
                  {song.image_url ? (
                    <img
                      src={`https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/jacket/${song.image_url}`}
                      alt={song.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <Music2 size={24} style={{ color: 'var(--foreground-subtle)' }} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  {masConst && (
                    <span className="absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-px rounded"
                      style={{ background: DIFF_COLOR.mas, color: '#fff' }}>
                      {masConst}
                    </span>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <div className="text-[10px] font-bold text-white leading-tight line-clamp-2">{song.title}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button id="prev-page" disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--foreground-muted)' }}>
            ← Previous
          </button>
          <span className="text-sm" style={{ color: 'var(--foreground-subtle)' }}>{page + 1} / {totalPages}</span>
          <button id="next-page" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--foreground-muted)' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

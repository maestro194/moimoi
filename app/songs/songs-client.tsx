'use client';

import { useState, useMemo } from 'react';
import { Search, Music2, LayoutGrid, List } from 'lucide-react';
import type { Song } from '@/lib/types';

interface Props {
  songs: Song[];
  currentVersion: number;
  categories: string[];
}

// ── Version labels (derived from song_cache version numbers in DB) ────────────
const VERSION_NAMES: Record<string, string> = {
  // ── International server (20000+) ─────────────────────────────────────────
  '20000': 'maimai DX',
  '20500': 'DX PLUS',
  '21000': 'Splash',
  '21500': 'Splash PLUS',
  '22000': 'UNiVERSE',
  '22500': 'UNiVERSE PLUS',
  '23000': 'FESTiVAL',
  '23500': 'FESTiVAL PLUS',
  '24000': 'BUDDiES',
  '24500': 'BUDDiES PLUS',
  '25000': 'PRiSM',
  '25500': 'PRiSM PLUS',
  '26000': 'CiRCLE',
  '26500': 'CiRCLE PLUS',
  // ── JP-era songs in the intl DB (10000–19999) ─────────────────────────────
  '10000': 'maimai DX (JP)',
  '11000': 'DX PLUS (JP)',
  '12000': 'Splash (JP)',
  '13000': 'Splash PLUS (JP)',
  '14000': 'UNiVERSE (JP)',
  '15000': 'UNiVERSE PLUS (JP)',
  '16000': 'FESTiVAL (JP)',
  '17000': 'FESTiVAL PLUS (JP)',
  '18000': 'BUDDiES (JP)',
  '18500': 'BUDDiES PLUS (JP)',
  '19000': 'PRiSM (JP)',
  '19500': 'PRiSM PLUS (JP)',
  '19900': 'CiRCLE (JP)',
};

function versionLabel(v: string) {
  return VERSION_NAMES[v] ?? `v${v}`;
}

const CAT_LABELS: Record<string, string> = {
  maimai: 'maimai',
  anime: 'Anime',
  'game&variety': 'Game & Variety',
  'niconico&vocaloid': 'Nico & Vocaloid',
  toho: 'Touhou',
  'original&joypolis': 'Original',
};

// ── Romaji conversion ─────────────────────────────────────────────────────────
const KANA_ROMAJI: Record<string, string> = {
  'きゃ':'kya','きゅ':'kyu','きょ':'kyo',
  'しゃ':'sha','しゅ':'shu','しょ':'sho',
  'ちゃ':'cha','ちゅ':'chu','ちょ':'cho',
  'にゃ':'nya','にゅ':'nyu','にょ':'nyo',
  'ひゃ':'hya','ひゅ':'hyu','ひょ':'hyo',
  'みゃ':'mya','みゅ':'myu','みょ':'myo',
  'りゃ':'rya','りゅ':'ryu','りょ':'ryo',
  'ぎゃ':'gya','ぎゅ':'gyu','ぎょ':'gyo',
  'じゃ':'ja', 'じゅ':'ju', 'じょ':'jo',
  'びゃ':'bya','びゅ':'byu','びょ':'byo',
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
  'ぁ':'a','ぃ':'i','ぅ':'u','ぇ':'e','ぉ':'o',
  'っ':'','ー':'-',
};

function toRomaji(kana: string): string {
  // Convert katakana → hiragana
  const hira = kana.replace(/[\u30A1-\u30F6]/g, c =>
    String.fromCharCode(c.charCodeAt(0) - 0x60)
  );
  let out = '';
  let i = 0;
  while (i < hira.length) {
    if (hira[i] === 'っ') {
      const next = KANA_ROMAJI[hira[i + 1]];
      if (next) out += next[0];
      i++; continue;
    }
    const two = hira.slice(i, i + 2);
    if (KANA_ROMAJI[two]) { out += KANA_ROMAJI[two]; i += 2; continue; }
    const one = KANA_ROMAJI[hira[i]];
    out += one !== undefined ? one : hira[i];
    i++;
  }
  return out;
}

// ── Difficulty colors ─────────────────────────────────────────────────────────
const DIFF_COLOR: Record<string, string> = {
  bas: '#3fb950', adv: '#d4a017', exp: '#da3633',
  mas: '#8957e5', remas: '#d2a8ff', utage: '#bf1b5e',
};

// ── Level group helpers ───────────────────────────────────────────────────────
function levelGroup(lev?: string): string | null {
  if (!lev) return null;
  return lev.replace('?', '').trim(); // e.g. "14", "14+"
}

function allLevelGroups(songs: Song[]): string[] {
  const s = new Set<string>();
  for (const song of songs) {
    const g = levelGroup(song.lev_mas) ?? levelGroup(song.lev_exp);
    if (g) s.add(g);
  }
  return Array.from(s).sort((a, b) => {
    const na = parseFloat(a.replace('+', '.5'));
    const nb = parseFloat(b.replace('+', '.5'));
    return na - nb;
  });
}

function allVersions(songs: Song[]): string[] {
  return Array.from(new Set(songs.map(s => s.version).filter(Boolean)))
    .sort((a, b) => parseInt(b) - parseInt(a)); // newest first
}

// ── Sub-components ────────────────────────────────────────────────────────────
function LevelPip({ lev, diff }: { lev?: string; diff: string }) {
  if (!lev) return null;
  return (
    <span
      className="text-[10px] font-bold px-1 py-px rounded"
      style={{ background: DIFF_COLOR[diff] + '28', color: DIFF_COLOR[diff], border: `1px solid ${DIFF_COLOR[diff]}60` }}
    >
      {lev.replace('?', '')}
    </span>
  );
}

const SELECT_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
};

// ── Main component ────────────────────────────────────────────────────────────
export default function SongsClient({ songs, currentVersion, categories }: Props) {
  const [query, setQuery]       = useState('');
  const [cat, setCat]           = useState('all');
  const [levelG, setLevelG]     = useState('all');
  const [version, setVersion]   = useState('all');
  const [sort, setSort]         = useState<'newest' | 'oldest' | 'lev_desc' | 'lev_asc' | 'title'>('newest');
  const [view, setView]         = useState<'list' | 'grid'>('list');
  const [page, setPage]         = useState(0);
  const PAGE_SIZE = view === 'grid' ? 60 : 50;

  // Precompute filter options once
  const levelGroups = useMemo(() => allLevelGroups(songs), [songs]);
  const versions    = useMemo(() => allVersions(songs), [songs]);

  // Romaji-aware search
  const matchesQuery = useMemo(() => {
    if (!query) return () => true;
    const q = query.toLowerCase();
    return (song: Song) => {
      if (song.title.toLowerCase().includes(q)) return true;
      if (song.artist.toLowerCase().includes(q)) return true;
      if (song.title_kana) {
        const romaji = toRomaji(song.title_kana).toLowerCase();
        if (romaji.includes(q)) return true;
        if (song.title_kana.toLowerCase().includes(q)) return true;
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
      case 'newest':   list.sort((a, b) => parseInt(b.version) - parseInt(a.version) || parseInt(b.sort || '0') - parseInt(a.sort || '0')); break;
      case 'oldest':   list.sort((a, b) => parseInt(a.version) - parseInt(b.version) || parseInt(a.sort || '0') - parseInt(b.sort || '0')); break;
      case 'lev_desc': list.sort((a, b) => parseFloat(b.lev_mas_i || b.lev_exp_i || '0') - parseFloat(a.lev_mas_i || a.lev_exp_i || '0')); break;
      case 'lev_asc':  list.sort((a, b) => parseFloat(a.lev_mas_i || a.lev_exp_i || '0') - parseFloat(b.lev_mas_i || b.lev_exp_i || '0')); break;
      case 'title':    list.sort((a, b) => a.title.localeCompare(b.title)); break;
    }
    return list;
  }, [songs, matchesQuery, cat, version, levelG, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function resetPage() { setPage(0); }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Songs</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
          {songs.length.toLocaleString()} songs in database
        </p>
      </div>

      {/* ── Search row ── */}
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

        {/* View toggle */}
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

      {/* ── Filter row ── */}
      <div className="flex flex-wrap gap-3">
        <select id="sort-select" value={sort} onChange={e => { setSort(e.target.value as typeof sort); resetPage(); }}
          className="px-3 py-2 rounded-xl text-sm outline-none" style={SELECT_STYLE}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="lev_desc">Level ↓</option>
          <option value="lev_asc">Level ↑</option>
          <option value="title">Title A–Z</option>
        </select>

        <select id="version-filter" value={version} onChange={e => { setVersion(e.target.value); resetPage(); }}
          className="px-3 py-2 rounded-xl text-sm outline-none" style={SELECT_STYLE}>
          <option value="all">All versions</option>
          {versions.map(v => (
            <option key={v} value={v}>{versionLabel(v)} ({v})</option>
          ))}
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

      {/* ── List view ── */}
      {view === 'list' && (
        <div className="glass rounded-2xl overflow-hidden">
          {paged.length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'var(--foreground-muted)' }}>
              <Music2 size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No songs match your search</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {paged.map((song, i) => {
                const isNew = parseInt(song.version) >= currentVersion - 500;
                const masLv = song.lev_mas_i ? parseFloat(song.lev_mas_i).toFixed(1) : song.lev_mas;
                return (
                  <div key={`${song.title}-${i}`}
                    className="flex items-center gap-3 pr-4 hover:bg-white/5 transition-all"
                    style={{ borderLeft: `3px solid ${isNew ? '#8957e5' : 'rgba(255,255,255,0.1)'}` }}>
                    {/* Jacket */}
                    <div className="w-14 h-14 shrink-0 overflow-hidden bg-white/5" style={{ minWidth: '3.5rem' }}>
                      {song.image_url ? (
                        <img src={`https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/jacket/${song.image_url}`}
                          alt={song.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--foreground-subtle)' }}>
                          <Music2 size={20} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 py-3">
                      <div className="font-semibold text-sm truncate text-white">{song.title}</div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--foreground-muted)' }}>
                        {song.artist}
                        <span className="ml-2 opacity-60">· {versionLabel(song.version)}</span>
                      </div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {song.lev_bas  && <LevelPip lev={song.lev_bas}   diff="bas" />}
                        {song.lev_adv  && <LevelPip lev={song.lev_adv}   diff="adv" />}
                        {song.lev_exp  && <LevelPip lev={song.lev_exp}   diff="exp" />}
                        {song.lev_mas  && <LevelPip lev={song.lev_mas}   diff="mas" />}
                        {song.lev_remas && <LevelPip lev={song.lev_remas} diff="remas" />}
                      </div>
                    </div>

                    {/* MAS constant */}
                    {masLv && (
                      <div className="text-right shrink-0">
                        <div className="font-num font-bold text-sm tabular-nums" style={{ color: DIFF_COLOR.mas }}>{masLv}</div>
                        <div className="text-[10px]" style={{ color: 'var(--foreground-subtle)' }}>MAS</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Grid view ── */}
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
                  {/* Jacket */}
                  {song.image_url ? (
                    <img
                      src={`https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/jacket/${song.image_url}`}
                      alt={song.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <Music2 size={24} style={{ color: 'var(--foreground-subtle)' }} />
                    </div>
                  )}
                  {/* Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                  {/* MAS constant badge top-right */}
                  {masConst && (
                    <span className="absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-px rounded"
                      style={{ background: DIFF_COLOR.mas, color: '#fff' }}>
                      {masConst}
                    </span>
                  )}

                  {/* Title bottom */}
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

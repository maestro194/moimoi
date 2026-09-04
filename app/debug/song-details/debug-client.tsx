'use client';

import React, { useState, useMemo } from 'react';
import { Check, X, Play, Info, Music2 } from 'lucide-react';
import { SongDetailsModal } from '@/app/songs/SongDetailsModal';
import { Jacket } from '@/components/jacket';
import { normalizeTitle } from '@/lib/normalize';
import type { Song, Difficulty } from '@/lib/types';
import { getSongInternalLevel } from '@/lib/rating';
import { PageWrapper } from '@/components/page-wrapper';

// ── Types ──────────────────────────────────────────────────────────────────────

interface RowBase {
  songTitle: string;
  internalLevel: number;
  songInfo: Song | null;
}

interface TrackerRow extends RowBase {
  songType: string;
  difficulty: string;
}

interface SessionRow extends RowBase {
  sheetType: string;
  sheetDifficulty: string;
}

interface ListRow extends RowBase {
  sheetType: string;
  sheetDifficulty: string;
  listName: string;
}

interface Props {
  songMapRecord: Record<string, Song>;
  trackerRows: TrackerRow[];
  sessionRows: SessionRow[];
  listRows: ListRow[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DIFF_COLOR: Record<string, string> = {
  BAS: '#3fb950', ADV: '#d4a017', EXP: '#da3633',
  MAS: '#8957e5', REMAS: '#d2a8ff', UTAGE: '#bf1b5e',
};

const DIFF_LABEL: Record<string, string> = {
  BAS: 'BASIC', ADV: 'ADVANCED', EXP: 'EXPERT',
  MAS: 'MASTER', REMAS: 'Re:MASTER',
};

const DIFF_TO_FULL: Record<string, string> = {
  BAS: 'basic', ADV: 'advanced', EXP: 'expert', MAS: 'master', REMAS: 'remaster',
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function SongDetailsDebugClient({ songMapRecord, trackerRows, sessionRows, listRows }: Props) {
  const songMap = useMemo(() => new Map(Object.entries(songMapRecord)), [songMapRecord]);

  const [detailsRow, setDetailsRow] = useState<{
    song: Song; type: 'DX' | 'STD'; difficulty: string; abbr: string;
  } | null>(null);

  /** Open the SongDetailsModal for a given chart */
  function openDetails(songTitle: string, sheetType: string, sheetDifficulty: string) {
    const song = songMap.get(normalizeTitle(songTitle));
    if (!song) return;
    const type = (sheetType === 'DX' ? 'DX' : 'STD') as 'DX' | 'STD';
    setDetailsRow({
      song,
      type,
      difficulty: DIFF_TO_FULL[sheetDifficulty] ?? sheetDifficulty.toLowerCase(),
      abbr: sheetDifficulty,
    });
  }

  // Group list rows by listName
  const listGroups = useMemo(() => {
    const map = new Map<string, ListRow[]>();
    for (const r of listRows) {
      const arr = map.get(r.listName) ?? [];
      arr.push(r);
      map.set(r.listName, arr);
    }
    return Array.from(map.entries());
  }, [listRows]);

  return (
    <PageWrapper className="p-4 md:p-8 max-w-[1100px] mx-auto space-y-10">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full text-xs font-bold bg-yellow-500/15 border border-yellow-500/30 text-yellow-400">
          🧪 Debug / Preview page — not linked in navigation
        </div>
        <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Song Details Pop-up Preview
        </h1>
        <p className="text-sm text-white/50 max-w-prose">
          This page previews the proposed song-details pop-up feature for the Tracker page.
          Click any <strong className="text-white/80">album art / jacket</strong> on any card below to open the detail modal.
          In the Goals section, the ⓘ button also opens it. Nothing here changes your real data.
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          Tab 1 — SESSION cards
      ════════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading icon="▶" label="Session Tab" color="#8957e5" />
        <p className="text-xs text-white/40 mb-4">
          Click the jacket → song details. The ✓ and ✕ buttons would still work independently.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sessionRows.map((item, idx) => {
            const color = DIFF_COLOR[item.sheetDifficulty] ?? '#9ca3af';
            return (
              <div key={idx} className="glass p-3 rounded-xl border border-white/5 flex items-center gap-3">
                {/* Fake checkbox */}
                <button className="w-6 h-6 rounded-full border-2 border-white/30 hover:border-white/60 flex items-center justify-center shrink-0 text-transparent transition-colors">
                  <Check size={14} />
                </button>

                {/* Clickable jacket */}
                <button
                  onClick={() => openDetails(item.songTitle, item.sheetType, item.sheetDifficulty)}
                  className="shrink-0 rounded-lg overflow-hidden transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  title="View song details"
                >
                  <Jacket
                    imageUrl={item.songInfo?.image_url}
                    intl={item.songInfo?.intl}
                    songTitle={item.songTitle}
                    difficulty={item.sheetDifficulty}
                    internalLevel={item.internalLevel}
                    className="w-12 h-12"
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white truncate">{item.songTitle}</div>
                  <div className="text-[10px] text-white/50 truncate mb-1">{item.songInfo?.artist}</div>
                  <div className="text-xs font-bold flex gap-2" style={{ color }}>
                    <span>{item.sheetDifficulty} {item.internalLevel.toFixed(1)}</span>
                    <span className="text-white/30 border border-white/10 px-1 rounded-sm leading-none flex items-center text-[10px]">{item.sheetType}</span>
                  </div>
                </div>

                {/* Fake remove */}
                <button className="p-2 text-white/30 hover:text-red-400 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          Tab 2 — GOALS cards
      ════════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading icon="🎯" label="Goals Tab" color="#8957e5" />
        <p className="text-xs text-white/40 mb-4">
          Click the jacket <em>or</em> the ⓘ button → song details. Clicking the card body would still open the goal-detail popup (shown as a toast here).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {trackerRows.map((d, idx) => {
            const color = DIFF_COLOR[d.difficulty] ?? '#9ca3af';
            const prog = Math.round(Math.random() * 80 + 10); // fake progress for preview
            return (
              <div
                key={idx}
                className="glass p-4 rounded-xl border border-white/5 relative overflow-hidden cursor-pointer hover:bg-white/[0.02] transition-colors flex flex-col group"
                onClick={() => {/* would open goal-detail popup */}}
                title="Click card body → goal detail popup"
              >
                <div className="flex gap-3 mb-3">
                  {/* Clickable jacket — stops propagation so card click still works */}
                  <button
                    onClick={e => { e.stopPropagation(); openDetails(d.songTitle, d.songType, d.difficulty); }}
                    className="shrink-0 rounded-lg overflow-hidden transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    title="View song details"
                  >
                    <Jacket
                      imageUrl={d.songInfo?.image_url}
                      intl={d.songInfo?.intl}
                      songTitle={d.songTitle}
                      difficulty={d.difficulty}
                      internalLevel={d.internalLevel}
                      className="w-14 h-14"
                    />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white truncate">{d.songTitle}</div>
                    <div className="text-xs font-bold mt-1" style={{ color }}>
                      <span className="bg-white/10 px-1.5 py-0.5 rounded mr-1.5">{d.songType}</span>
                      {d.difficulty} {d.internalLevel.toFixed(1)}
                    </div>
                  </div>

                  {/* ⓘ Info button — alternative trigger */}
                  <button
                    onClick={e => { e.stopPropagation(); openDetails(d.songTitle, d.songType, d.difficulty); }}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-white/20 hover:text-purple-400 hover:bg-purple-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="View song details"
                  >
                    <Info size={14} />
                  </button>
                </div>

                {/* Fake progress bar */}
                <div className="flex justify-between items-end mb-1 text-xs">
                  <span className="text-white/50">Current: <span className="font-num font-bold text-white/80">98.5420%</span></span>
                  <span className="text-white/50">Target: <span className="font-num font-bold text-white">100.5000%</span></span>
                </div>
                <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${prog}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          Tab 3 — LISTS items
      ════════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading icon="📋" label="Lists Tab" color="#60a5fa" />
        <p className="text-xs text-white/40 mb-4">
          Click the jacket → song details. Play and remove buttons work independently.
        </p>
        <div className="space-y-4">
          {listGroups.map(([listName, items]) => (
            <div key={listName} className="glass rounded-xl border border-white/5 overflow-hidden">
              <div className="p-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎵</span>
                  <h3 className="font-bold text-white">{listName}</h3>
                </div>
                <span className="text-xs font-bold text-white/50 bg-white/5 px-2 py-1 rounded-md">{items.length} items</span>
              </div>
              <div className="p-2 space-y-1">
                {items.map((item, idx) => {
                  const color = DIFF_COLOR[item.sheetDifficulty] ?? '#9ca3af';
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 group transition-colors">
                      <div className="flex items-center gap-3">
                        {/* Clickable jacket */}
                        <button
                          onClick={() => openDetails(item.songTitle, item.sheetType, item.sheetDifficulty)}
                          className="shrink-0 rounded-lg overflow-hidden transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          title="View song details"
                        >
                          <Jacket
                            imageUrl={item.songInfo?.image_url}
                            intl={item.songInfo?.intl}
                            songTitle={item.songTitle}
                            difficulty={item.sheetDifficulty}
                            internalLevel={item.internalLevel}
                            className="w-8 h-8"
                          />
                        </button>

                        <div>
                          <div className="text-sm font-bold text-white truncate max-w-[200px] md:max-w-[400px]">{item.songTitle}</div>
                          <div className="text-[10px] font-bold flex gap-1.5" style={{ color }}>
                            <span>{item.sheetDifficulty} {item.internalLevel.toFixed(1)}</span>
                            <span className="text-white/30 bg-white/5 px-1 rounded-sm">{item.sheetType}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button className="p-1.5 text-white/30 hover:text-white rounded-lg transition-colors" title="Add to session (fake)">
                          <Play size={14} />
                        </button>
                        <button className="p-1.5 text-white/30 hover:text-red-400 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Remove (fake)">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Verdict callout ────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 border border-purple-500/20 bg-purple-500/5">
        <div className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2">📝 Your feedback</div>
        <p className="text-sm text-white/60">
          Happy with how it feels? Head back and tell the assistant to go ahead —
          or let it know what you'd like changed (e.g. no jacket click on Goals cards, different position for the ⓘ button, etc.)
        </p>
      </div>

      {/* The actual modal */}
      <SongDetailsModal row={detailsRow} onClose={() => setDetailsRow(null)} />
    </PageWrapper>
  );
}

// ── Small helper ───────────────────────────────────────────────────────────────
function SectionHeading({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-lg">{icon}</span>
      <h2 className="text-lg font-bold text-white">{label}</h2>
      <div className="flex-1 h-px ml-2" style={{ backgroundColor: color + '30' }} />
    </div>
  );
}

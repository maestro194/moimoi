'use client';

import React, { useState, useMemo } from 'react';
import { Target, Plus, Search, Trash2, Music2 } from 'lucide-react';
import { PageWrapper } from '@/components/page-wrapper';
import type { ScoreWithRating, Score, Difficulty } from '@/lib/types';
import { computeRating, calcSingleRating, getSongInternalLevel } from '@/lib/rating';
import { addTracker, deleteTracker } from './actions';
import type { MinimalChart } from '@/app/scores/actions';

interface Tracker {
  id: number;
  songTitle: string;
  difficulty: string;
  songType: string;
  targetAchievement: string;
}

interface Props {
  trackers: Tracker[];
  scores: ScoreWithRating[];
  typedScores: Score[];
  currentTotalRating: number;
  songMapRecord: Record<string, any>;
  currentVersion: number;
  allCharts: MinimalChart[];
}

const DIFF_COLOR: Record<string, string> = {
  BAS:   '#3fb950',
  ADV:   '#d4a017',
  EXP:   '#da3633',
  MAS:   '#8957e5',
  REMAS: '#d2a8ff',
  UTAGE: '#bf1b5e',
};

const CAT_LABELS: Record<string, string> = {
  maimai: 'maimai',
  anime: 'Anime',
  'game&variety': 'Game & Variety',
  'niconico&vocaloid': 'Nico & Vocaloid',
  toho: 'Touhou',
  'original&joypolis': 'Original',
};

export default function TrackerClient({ trackers, scores, typedScores, currentTotalRating, songMapRecord, currentVersion, allCharts }: Props) {
  const songMap = useMemo(() => new Map(Object.entries(songMapRecord)), [songMapRecord]);

  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [targetVal, setTargetVal] = useState('100.5000');
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<Tracker | null>(null);

  // Computed data for existing trackers
  const trackerData = useMemo(() => {
    return trackers.map(t => {
      const targetAchv = parseFloat(t.targetAchievement);
      
      // Find current score
      const existing = scores.find(s => s.songTitle === t.songTitle && s.difficulty === t.difficulty && s.songType === t.songType);
      
      // Calculate delta
      const hypoScores = [...typedScores];
      const existIdx = hypoScores.findIndex(s => s.songTitle === t.songTitle && s.difficulty === t.difficulty && s.songType === t.songType);
      
      let hypotheticalInternalLevel = 0;
      if (existing) {
        hypotheticalInternalLevel = existing.internalLevel;
        hypoScores[existIdx] = { ...hypoScores[existIdx], achievement: Math.max(hypoScores[existIdx].achievement, targetAchv) };
      } else {
        const songInfo = songMap.get(t.songTitle);
        hypotheticalInternalLevel = songInfo ? getSongInternalLevel(songInfo, t.difficulty as Difficulty, t.songType as 'DX'|'STD') : 0;
        
        hypoScores.push({
          id: -1,
          songTitle: t.songTitle,
          difficulty: t.difficulty as Difficulty,
          songType: t.songType as any,
          achievement: targetAchv,
          playedAt: new Date(),
          fc: null,
          fs: null,
          dxScore: 0,
        });
      }

      const hypoData = computeRating(hypoScores, songMap, currentVersion);
      const delta = hypoData.totalRating - currentTotalRating;
      
      const targetSingleRating = calcSingleRating(hypotheticalInternalLevel, targetAchv).floored;

      return {
        tracker: t,
        existing,
        delta,
        internalLevel: hypotheticalInternalLevel,
        targetSingleRating
      };
    }).sort((a, b) => b.delta - a.delta);
  }, [trackers, scores, typedScores, currentTotalRating, songMap, currentVersion]);

  // Add search filtering
  const filteredCharts = useMemo(() => {
    if (!search) return [];
    const lower = search.toLowerCase();
    return allCharts.filter(c => c.searchKey.includes(lower)).slice(0, 30);
  }, [search, allCharts]);

  async function handleAdd(chart: MinimalChart) {
    setSaving(true);
    await addTracker(chart.title, chart.diff, chart.type, parseFloat(targetVal));
    setSaving(false);
    setShowAdd(false);
    setSearch('');
  }

  async function handleDelete(id: number) {
    await deleteTracker(id);
  }

  return (
    <PageWrapper className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Target className="text-purple-400" /> Score Tracker
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
            Set goals and track your potential rating gain.
          </p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg transition-colors"
        >
          <Plus size={16} /> Add Goal
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {trackerData.map(d => {
          const song = songMap.get(d.tracker.songTitle);
          const jacketUrl = song?.image_url ? `https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/jacket/${song.image_url}` : null;
          
          return (
            <div 
              key={d.tracker.id} 
              role="button"
              tabIndex={0}
              onClick={() => {
                setTargetVal(d.tracker.targetAchievement);
                setEditTarget(d.tracker);
              }}
              className="glass p-3 rounded-xl border border-white/5 relative overflow-hidden group flex flex-col md:flex-row md:items-center gap-4 transition-colors hover:bg-white/[0.02] cursor-pointer"
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(d.tracker.id);
                }}
                className="absolute right-3 top-3 md:top-1/2 md:-translate-y-1/2 p-2 bg-black/40 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-lg md:opacity-0 group-hover:opacity-100 transition-all z-10"
              >
                <Trash2 size={16} />
              </button>
              
              {/* Jacket & Info */}
              <div className="flex items-center gap-3 w-full md:w-[280px] shrink-0">
                <div className="w-12 h-12 shrink-0 overflow-hidden rounded shadow-sm bg-black/20 relative">
                  {jacketUrl ? (
                    <img src={jacketUrl} alt={d.tracker.songTitle} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20"><Music2 size={16} /></div>
                  )}
                </div>
                <div className="min-w-0 pr-8 md:pr-2">
                  <div className="text-sm font-bold text-white truncate">{d.tracker.songTitle}</div>
                  <div className="text-[10px] text-white/50 truncate mb-1">{song?.artist}</div>
                  <div className="text-xs font-bold flex items-center gap-2 mt-0.5" style={{ color: DIFF_COLOR[d.tracker.difficulty] }}>
                    <span>{d.tracker.difficulty} {d.internalLevel.toFixed(1)}</span>
                    <span className="text-white/30 border border-white/10 px-1 rounded-sm leading-none flex items-center text-[10px] py-0.5">{d.tracker.songType}</span>
                  </div>
                </div>
              </div>

              {/* Genre (Desktop only) */}
              <div className="hidden md:flex w-[120px] shrink-0 pr-4 items-center">
                <span className="text-[11px] font-semibold text-white/50 truncate border border-white/10 bg-white/5 px-2 py-1 rounded-md">
                  {song ? (CAT_LABELS[song.catcode] || song.catcode) : 'Unknown'}
                </span>
              </div>

              {/* Current vs Target */}
              <div className="flex-1 flex justify-between items-center md:pr-12">
                <div>
                  <div className="text-[10px] text-white/50 uppercase tracking-widest mb-0.5">Current</div>
                  <div className="font-num text-sm text-white/80">
                    {d.existing ? `${d.existing.achievement.toFixed(4)}%` : 'No Record'} 
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-white/50 uppercase tracking-widest mb-0.5">Target</div>
                  <div className="font-num text-sm font-bold text-white">
                    {parseFloat(d.tracker.targetAchievement).toFixed(4)}%
                  </div>
                </div>
              </div>

              {/* Delta */}
              <div className="md:w-[90px] shrink-0 text-right md:pr-4 pt-3 mt-3 md:pt-0 md:mt-0 border-t md:border-t-0 md:border-l border-white/10 flex md:block justify-between items-center">
                <div className="text-[10px] text-white/50 uppercase tracking-widest md:mb-0.5">Rating Δ</div>
                <span className={`font-num font-extrabold text-base ${d.delta > 0 ? 'text-green-400' : 'text-white/30'}`}>
                  {d.delta > 0 ? `+${d.delta}` : '0'}
                </span>
              </div>
            </div>
          );
        })}
        {trackerData.length === 0 && (
          <div className="col-span-full p-12 text-center text-white/30 glass rounded-xl border border-white/5">
            You haven't tracked any goals yet. Click "Add Goal" to start!
          </div>
        )}
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setEditTarget(null)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Edit Goal</h2>
            <div className="mb-4 text-sm font-bold text-white/80">
              {editTarget.songTitle}
              <span className="ml-2 text-xs opacity-70" style={{ color: DIFF_COLOR[editTarget.difficulty] }}>
                {editTarget.difficulty} {editTarget.songType}
              </span>
            </div>
            <div className="mb-4 shrink-0">
              <label className="text-xs text-white/50 font-bold uppercase tracking-wider block mb-1.5">Target Accuracy (%)</label>
              <input 
                type="number" 
                step="0.0001"
                value={targetVal}
                onChange={e => setTargetVal(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white font-num outline-none focus:border-purple-500/50"
                autoFocus
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setEditTarget(null)} className="flex-1 py-2.5 rounded-xl font-bold text-white/50 hover:bg-white/5 transition-colors">Cancel</button>
              <button 
                disabled={saving}
                onClick={async () => {
                  const val = parseFloat(targetVal);
                  if (isNaN(val)) return;
                  setSaving(true);
                  await addTracker(editTarget.songTitle, editTarget.difficulty, editTarget.songType, val);
                  setSaving(false);
                  setEditTarget(null);
                }}
                className="flex-1 py-2.5 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-500 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative flex flex-col max-h-[80vh]">
            <button onClick={() => setShowAdd(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">✕</button>
            <h2 className="text-xl font-bold text-white mb-4">Add Goal</h2>
            
            <div className="relative mb-4 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
              <input 
                autoFocus
                type="text" 
                placeholder="Search song..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white outline-none focus:border-purple-500/50"
              />
            </div>
            
            <div className="mb-4 shrink-0">
              <label className="text-xs text-white/50 font-bold uppercase tracking-wider block mb-1.5">Target Accuracy (%)</label>
              <input 
                type="number" 
                step="0.0001"
                value={targetVal}
                onChange={e => setTargetVal(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white font-num outline-none focus:border-purple-500/50"
              />
            </div>

            <div className="overflow-y-auto flex-1 min-h-[200px] border border-white/5 rounded-xl bg-black/20 p-2 space-y-1">
              {filteredCharts.length === 0 ? (
                <div className="text-center text-white/30 py-8 text-sm">{search ? 'No charts found.' : 'Type to search...'}</div>
              ) : (
                filteredCharts.map((c, i) => {
                  const song = songMap.get(c.title);
                  const jacketUrl = song?.image_url ? `https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/jacket/${song.image_url}` : null;
                  
                  return (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 group transition-colors">
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        <div className="w-10 h-10 shrink-0 overflow-hidden rounded shadow-sm bg-black/20 relative">
                          {jacketUrl ? (
                            <img src={jacketUrl} alt={c.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/20"><Music2 size={14} /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate leading-tight mb-0.5">{c.title}</div>
                          <div className="text-[10px] text-white/50 truncate mb-1">{song?.artist}</div>
                          <div className="text-xs font-bold flex gap-2" style={{ color: DIFF_COLOR[c.diff] }}>
                            <span>{c.diff} {c.level.toFixed(1)}</span>
                            <span className="text-white/30 border border-white/10 px-1 rounded-sm leading-none flex items-center text-[9px]">{c.type}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        disabled={saving}
                        onClick={() => handleAdd(c)}
                        className="shrink-0 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Track
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import { Target, Plus, Search, Trash2 } from 'lucide-react';
import { PageWrapper } from '@/components/page-wrapper';
import type { ScoreWithRating, Score, Difficulty } from '@/lib/types';
import { computeRating, calcSingleRating } from '@/lib/rating';
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
  songMap: any;
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

export default function TrackerClient({ trackers, scores, typedScores, currentTotalRating, songMap, currentVersion, allCharts }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [targetVal, setTargetVal] = useState('100.5000');
  const [saving, setSaving] = useState(false);

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
        const prefix = t.songType === 'DX' ? 'dx_lev_' : 'lev_';
        const diffKey = t.difficulty.toLowerCase();
        hypotheticalInternalLevel = songInfo ? parseFloat(songInfo[`${prefix}${diffKey}_i`]) || 0 : 0;
        
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trackerData.map(d => (
          <div key={d.tracker.id} className="glass p-4 rounded-xl border border-white/5 relative overflow-hidden group">
            <button 
              onClick={() => handleDelete(d.tracker.id)}
              className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 size={14} />
            </button>
            <div className="text-sm font-bold text-white truncate pr-8 mb-1">{d.tracker.songTitle}</div>
            <div className="text-xs font-bold flex gap-2" style={{ color: DIFF_COLOR[d.tracker.difficulty] }}>
              <span>{d.tracker.difficulty} {d.internalLevel.toFixed(1)}</span>
              <span className="text-white/30 border border-white/10 px-1 rounded-sm">{d.tracker.songType}</span>
            </div>
            
            <div className="mt-4 flex justify-between items-end">
              <div>
                <div className="text-[10px] text-white/50 uppercase tracking-widest mb-1">Current</div>
                <div className="font-num text-sm text-white/80">
                  {d.existing ? `${d.existing.achievement.toFixed(4)}%` : 'No Record'} 
                  {d.existing && <span className="ml-2 text-white/30">({d.existing.rating})</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-white/50 uppercase tracking-widest mb-1">Target</div>
                <div className="font-num text-sm font-bold text-white">
                  {parseFloat(d.tracker.targetAchievement).toFixed(4)}%
                  <span className="ml-2 text-purple-300">({d.targetSingleRating})</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
              <span className="text-xs font-bold text-white/50">Total Rating Δ</span>
              <span className={`font-num font-extrabold text-lg ${d.delta > 0 ? 'text-green-400' : 'text-white/30'}`}>
                {d.delta > 0 ? `+${d.delta}` : '0'}
              </span>
            </div>
          </div>
        ))}
        {trackerData.length === 0 && (
          <div className="col-span-full p-12 text-center text-white/30 glass rounded-xl border border-white/5">
            You haven't tracked any goals yet. Click "Add Goal" to start!
          </div>
        )}
      </div>

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
                filteredCharts.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 group transition-colors">
                    <div className="min-w-0 pr-4">
                      <div className="text-sm font-bold text-white truncate">{c.title}</div>
                      <div className="text-xs font-bold flex gap-2 mt-0.5" style={{ color: DIFF_COLOR[c.diff] }}>
                        <span>{c.diff} {c.level.toFixed(1)}</span>
                        <span className="text-white/30 border border-white/10 px-1 rounded-sm leading-none flex items-center">{c.type}</span>
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
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

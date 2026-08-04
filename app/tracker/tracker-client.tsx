'use client';

import React, { useState, useMemo } from 'react';
import { Target, Plus, Search, Trash2, Check, X, Play, List, Edit2 } from 'lucide-react';
import { PageWrapper } from '@/components/page-wrapper';
import type { ScoreWithRating, Score, Difficulty } from '@/lib/types';
import { computeRating, calcSingleRating, getSongInternalLevel } from '@/lib/rating';
import { normalizeTitle } from '@/lib/normalize';
import { addTracker, deleteTracker } from './actions';
import type { MinimalChart } from '@/app/scores/actions';
import { Jacket } from '@/components/jacket';
import { useBoard } from '@/lib/useBoard';
import { motion, AnimatePresence } from 'framer-motion';

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
  initialLists: { id: number; name: string; emoji: string; color: string; sortOrder: number }[];
  initialItems: { id: number; listId: number; songTitle: string; sheetType: string; sheetDifficulty: string; targetScore: string|null; notes: string|null; achievedAt: string|null; sortOrder: number }[];
  initialSession: { id: number; songTitle: string; sheetType: string; sheetDifficulty: string; played: boolean; sortOrder: number; addedAt: string }[];
}

const DIFF_COLOR: Record<string, string> = {
  BAS: '#3fb950',
  ADV: '#d4a017',
  EXP: '#da3633',
  MAS: '#8957e5',
  REMAS: '#d2a8ff',
  UTAGE: '#bf1b5e',
};

type Tab = 'session' | 'goals' | 'lists';

export default function TrackerClient({ trackers, scores, typedScores, currentTotalRating, songMapRecord, currentVersion, allCharts, initialLists, initialItems, initialSession }: Props) {
  const songMap = useMemo(() => new Map(Object.entries(songMapRecord)), [songMapRecord]);
  const [activeTab, setActiveTab] = useState<Tab>('session');
  
  const { data, act } = useBoard();
  
  // Use initial props until hook hydrates
  const lists = data?.lists ?? initialLists;
  const items = data?.items ?? initialItems;
  const session = data?.session ?? initialSession;

  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [targetVal, setTargetVal] = useState('100.5000');
  const [saving, setSaving] = useState(false);
  
  // Goals detail state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedGoal, setSelectedGoal] = useState<any>(null);

  // Computed data for existing trackers
  const trackerData = useMemo(() => {
    return trackers.map(t => {
      const targetAchv = parseFloat(t.targetAchievement);
      
      const existing = scores.find(s => s.songTitle === t.songTitle && s.difficulty === t.difficulty && s.songType === t.songType);
      
      const hypoScores = [...typedScores];
      const existIdx = hypoScores.findIndex(s => s.songTitle === t.songTitle && s.difficulty === t.difficulty && s.songType === t.songType);
      
      let hypotheticalInternalLevel = 0;
      if (existing) {
        hypotheticalInternalLevel = existing.internalLevel;
        hypoScores[existIdx] = { ...hypoScores[existIdx], achievement: Math.max(hypoScores[existIdx].achievement, targetAchv) };
      } else {
        const songInfo = songMap.get(normalizeTitle(t.songTitle));
        hypotheticalInternalLevel = songInfo ? getSongInternalLevel(songInfo, t.difficulty as Difficulty, t.songType as 'DX'|'STD') : 0;
        
        hypoScores.push({
          id: -1,
          songTitle: t.songTitle,
          difficulty: t.difficulty as Difficulty,
          songType: t.songType as Score['songType'],
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

  const allGoals = useMemo(() => {
    return trackerData;
  }, [trackerData]);

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
    setSelectedGoal(null);
  }
  
  async function handleTogglePlayed(id: number, current: boolean) {
    await act('session_update', { id, played: !current });
  }

  async function handleRemoveSession(id: number) {
    await act('session_remove', { id });
  }
  
  async function handleClearSession() {
    await act('session_clear');
  }
  
  async function handleAddToSession(songTitle: string, diff: string, type: string) {
    await act('session_add', { songTitle, sheetType: type, sheetDifficulty: diff });
  }

  // --- Render functions for each tab ---

  const renderSession = () => (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Play className="w-5 h-5" /> Today's Session</h2>
        {session.length > 0 && (
          <button onClick={handleClearSession} className="text-xs bg-white/10 hover:bg-white/20 text-white/70 px-3 py-1.5 rounded-lg transition-colors">
            Clear All
          </button>
        )}
      </div>
      
      {session.length === 0 ? (
        <div className="p-12 text-center text-white/30 glass rounded-xl border border-white/5">
          Your session is empty — add songs from the Songs page or from your Lists
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {session.map(item => {
            const songInfo = songMap.get(normalizeTitle(item.songTitle));
            const level = songInfo ? getSongInternalLevel(songInfo, item.sheetDifficulty as Difficulty, item.sheetType as 'DX'|'STD') : 0;
            return (
              <div key={item.id} className={`glass p-3 rounded-xl border border-white/5 flex items-center gap-3 transition-colors ${item.played ? 'opacity-40' : ''}`}>
                <button onClick={() => handleTogglePlayed(item.id, item.played)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${item.played ? 'bg-purple-500 border-purple-500 text-white' : 'border-white/30 hover:border-white/60 text-transparent'}`}>
                  <Check size={14} />
                </button>
                <Jacket imageUrl={songInfo?.image_url} intl={songInfo?.intl} songTitle={item.songTitle} difficulty={item.sheetDifficulty} internalLevel={level} className="w-12 h-12" />
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-bold text-white truncate ${item.played ? 'line-through' : ''}`}>{item.songTitle}</div>
                  <div className="text-[10px] text-white/50 truncate mb-1">{songInfo?.artist}</div>
                  <div className="text-xs font-bold flex gap-2" style={{ color: DIFF_COLOR[item.sheetDifficulty] }}>
                    <span>{item.sheetDifficulty} {level.toFixed(1)}</span>
                    <span className="text-white/30 border border-white/10 px-1 rounded-sm leading-none flex items-center text-[10px]">{item.sheetType}</span>
                  </div>
                </div>
                <button onClick={() => handleRemoveSession(item.id)} className="p-2 text-white/30 hover:text-red-400 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderGoals = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Target className="w-5 h-5 text-purple-400" /> Goals</h2>
        <button onClick={() => { setShowAdd(true); setSelectedGoal(null); setSearch(''); }} className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
          <Plus size={14} /> New Goal
        </button>
      </div>

      {allGoals.length === 0 ? (
        <div className="p-12 text-center text-white/30 glass rounded-xl border border-white/5">
          No goals yet — click a chart level in the Songs page to add one
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {allGoals.map(d => {
            const songInfo = songMap.get(normalizeTitle(d.tracker.songTitle));
            const currentAchv = d.existing?.achievement ?? 0;
            const targetAchv = parseFloat(d.tracker.targetAchievement);
            const prog = Math.min(100, Math.max(0, (currentAchv / targetAchv) * 100));

            return (
              <div 
                key={d.tracker.id} 
                onClick={() => setSelectedGoal(d)}
                className="glass p-4 rounded-xl border border-white/5 relative overflow-hidden group cursor-pointer hover:bg-white/[0.02] transition-colors flex flex-col"
              >
                <div className="flex gap-3 mb-3">
                  <Jacket imageUrl={songInfo?.image_url} intl={songInfo?.intl} songTitle={d.tracker.songTitle} difficulty={d.tracker.difficulty} internalLevel={d.internalLevel} className="w-14 h-14" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white truncate">{d.tracker.songTitle}</div>
                    <div className="text-xs font-bold mt-1" style={{ color: DIFF_COLOR[d.tracker.difficulty] }}>
                      <span className="bg-white/10 px-1.5 py-0.5 rounded mr-1.5">{d.tracker.songType}</span>
                      {d.tracker.difficulty} {d.internalLevel.toFixed(1)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] text-white/50 uppercase tracking-widest">Rating Δ</div>
                    <div className={`font-num font-bold ${d.delta > 0 ? 'text-green-400' : 'text-white/30'}`}>
                      {d.delta > 0 ? `+${d.delta}` : '0'}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-end mb-1">
                  <div>
                    <span className="text-[10px] text-white/50">Current: </span>
                    <span className="font-num text-xs font-bold text-white/80">{currentAchv > 0 ? `${currentAchv.toFixed(4)}%` : 'No Record'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/50">Target: </span>
                    <span className="font-num text-xs font-bold text-white">{targetAchv.toFixed(4)}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${prog}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const [newListForm, setNewListForm] = useState(false);
  const [listName, setListName] = useState('');
  const [listEmoji, setListEmoji] = useState('🎵');

  async function handleCreateList() {
    if (!listName.trim()) return;
    await act('list_create', { name: listName, emoji: listEmoji, color: '#8957e5' });
    setListName('');
    setListEmoji('🎵');
    setNewListForm(false);
  }

  const renderLists = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><List className="w-5 h-5 text-blue-400" /> Lists</h2>
        <button onClick={() => setNewListForm(true)} className="text-xs bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
          <Plus size={14} /> New List
        </button>
      </div>

      {newListForm && (
        <div className="glass p-4 rounded-xl border border-white/5 mb-4 flex gap-2 items-center">
          <input type="text" value={listEmoji} onChange={e => setListEmoji(e.target.value)} className="w-12 bg-white/5 border border-white/10 rounded-lg p-2 text-center text-xl outline-none" maxLength={2} />
          <input type="text" value={listName} onChange={e => setListName(e.target.value)} placeholder="List Name..." className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none" autoFocus />
          <button onClick={handleCreateList} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold">Save</button>
          <button onClick={() => setNewListForm(false)} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg">Cancel</button>
        </div>
      )}

      {lists.length === 0 ? (
        <div className="p-12 text-center text-white/30 glass rounded-xl border border-white/5">
          No lists yet.
        </div>
      ) : (
        <div className="space-y-4">
          {lists.map(list => {
            const listItems = items.filter(i => i.listId === list.id);
            return (
              <div key={list.id} className="glass rounded-xl border border-white/5 overflow-hidden">
                <div className="p-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{list.emoji}</span>
                    <h3 className="font-bold text-white">{list.name}</h3>
                  </div>
                  <span className="text-xs font-bold text-white/50 bg-white/5 px-2 py-1 rounded-md">{listItems.length} items</span>
                </div>
                <div className="p-2 space-y-1">
                  {listItems.length === 0 ? (
                    <div className="p-4 text-center text-xs text-white/30">No charts in this list.</div>
                  ) : (
                    listItems.map(item => {
                      const songInfo = songMap.get(normalizeTitle(item.songTitle));
                      const level = songInfo ? getSongInternalLevel(songInfo, item.sheetDifficulty as Difficulty, item.sheetType as 'DX'|'STD') : 0;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 group transition-colors">
                          <div className="flex items-center gap-3">
                            <Jacket imageUrl={songInfo?.image_url} intl={songInfo?.intl} songTitle={item.songTitle} difficulty={item.sheetDifficulty} internalLevel={level} className="w-8 h-8" />
                            <div>
                              <div className="text-sm font-bold text-white truncate max-w-[200px] md:max-w-[400px]">{item.songTitle}</div>
                              <div className="text-[10px] font-bold flex gap-1.5" style={{ color: DIFF_COLOR[item.sheetDifficulty] }}>
                                <span>{item.sheetDifficulty} {level.toFixed(1)}</span>
                                <span className="text-white/30 bg-white/5 px-1 rounded-sm">{item.sheetType}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.targetScore && <span className="text-xs font-num text-white/50">Target: {item.targetScore}%</span>}
                            <button onClick={() => handleAddToSession(item.songTitle, item.sheetDifficulty, item.sheetType)} className="p-1.5 text-white/30 hover:text-white rounded-lg transition-colors" title="Add to session">
                              <Play size={14} />
                            </button>
                            <button onClick={() => act('item_remove', { id: item.id })} className="p-1.5 text-white/30 hover:text-red-400 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <PageWrapper className="p-4 md:p-6 max-w-[1200px] mx-auto min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          The Board
        </h1>
        <p className="text-sm text-white/60 mb-2">
          Plan, track, and achieve.
        </p>
        <div className="flex items-center gap-4 text-xs font-bold text-white/40">
          <span className="bg-white/5 px-2 py-1 rounded border border-white/5">{allGoals.length} goals</span>
          <span className="bg-white/5 px-2 py-1 rounded border border-white/5">{session.length} in session</span>
          <span className="bg-white/5 px-2 py-1 rounded border border-white/5">{lists.length} lists</span>
          <span className="ml-auto text-purple-300/80">Current Rating: {currentTotalRating}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-white/10 mb-6">
        {(['session', 'goals', 'lists'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-bold capitalize relative transition-colors ${activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'session' && renderSession()}
            {activeTab === 'goals' && renderGoals()}
            {activeTab === 'lists' && renderLists()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Goal Detail Modal */}
      <AnimatePresence>
        {selectedGoal && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedGoal(null)}>
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[#111] w-full md:max-w-lg md:rounded-2xl rounded-t-2xl border border-white/10 p-6 shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setSelectedGoal(null)} className="absolute top-4 right-4 p-2 text-white/50 hover:text-white bg-white/5 rounded-full">
                <X size={16} />
              </button>
              
              <div className="flex gap-4 mb-6">
                <Jacket 
                  imageUrl={songMap.get(normalizeTitle(selectedGoal.tracker.songTitle))?.image_url} 
                  intl={songMap.get(normalizeTitle(selectedGoal.tracker.songTitle))?.intl} 
                  songTitle={selectedGoal.tracker.songTitle} 
                  difficulty={selectedGoal.tracker.difficulty} 
                  internalLevel={selectedGoal.internalLevel} 
                  className="w-24 h-24 shadow-xl" 
                />
                <div className="flex flex-col justify-center">
                  <h2 className="text-xl font-bold text-white leading-tight mb-1">{selectedGoal.tracker.songTitle}</h2>
                  <div className="text-sm font-bold flex gap-2 items-center" style={{ color: DIFF_COLOR[selectedGoal.tracker.difficulty] }}>
                    <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{selectedGoal.tracker.songType}</span>
                    {selectedGoal.tracker.difficulty} {selectedGoal.internalLevel.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="glass p-4 rounded-xl border border-white/5 mb-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-white/50 uppercase tracking-wider font-bold">Progress</div>
                  <div className={`font-num font-bold flex items-center gap-1 ${selectedGoal.delta > 0 ? 'text-green-400' : 'text-white/40'}`}>
                    Rating Delta: {selectedGoal.delta > 0 ? `+${selectedGoal.delta}` : '0'}
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <div className="font-num text-lg text-white/80">{selectedGoal.existing?.achievement.toFixed(4) ?? '0.0000'}%</div>
                    <div className="font-num text-lg font-bold text-purple-400">{parseFloat(selectedGoal.tracker.targetAchievement).toFixed(4)}%</div>
                  </div>
                  <div className="h-2.5 bg-black/50 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, ((selectedGoal.existing?.achievement ?? 0) / parseFloat(selectedGoal.tracker.targetAchievement)) * 100))}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    handleAddToSession(selectedGoal.tracker.songTitle, selectedGoal.tracker.difficulty, selectedGoal.tracker.songType);
                    setSelectedGoal(null);
                  }} 
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Play size={18} /> Add to Session
                </button>
                <button 
                  onClick={() => {
                    setTargetVal(selectedGoal.tracker.targetAchievement);
                    setShowAdd(true);
                  }} 
                  className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-3 rounded-xl transition-colors"
                  title="Edit Target"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(selectedGoal.tracker.id)} 
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold px-4 py-3 rounded-xl transition-colors"
                  title="Delete Goal"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Goal Modal (reused) */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative flex flex-col max-h-[80vh]"
            >
              <button onClick={() => setShowAdd(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X size={20} /></button>
              <h2 className="text-xl font-bold text-white mb-4">{selectedGoal ? 'Edit Goal Target' : 'Add New Goal'}</h2>
              
              {!selectedGoal && (
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
              )}

              <div className="mb-4 shrink-0">
                <label className="text-xs text-white/50 font-bold uppercase tracking-wider block mb-1.5">Quick Pick Rank</label>
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
                      className="py-1.5 rounded-lg text-xs font-bold transition-all hover:brightness-125 active:scale-95"
                      style={{
                        background: targetVal === val ? color + '33' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${targetVal === val ? color + '99' : 'rgba(255,255,255,0.08)'}`,
                        color: targetVal === val ? color : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {rank}
                      <span className="block text-[9px] opacity-70 font-normal">{parseFloat(val).toFixed(1)}%</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedGoal ? (
                <button 
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    await addTracker(selectedGoal.tracker.songTitle, selectedGoal.tracker.difficulty, selectedGoal.tracker.songType, parseFloat(targetVal));
                    setSaving(false);
                    setShowAdd(false);
                    setSelectedGoal(null);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Target'}
                </button>
              ) : (
                <div className="overflow-y-auto flex-1 min-h-[200px] border border-white/5 rounded-xl bg-black/20 p-2 space-y-1">
                  {filteredCharts.length === 0 ? (
                    <div className="text-center text-white/30 py-8 text-sm">{search ? 'No charts found.' : 'Type to search...'}</div>
                  ) : (
                    filteredCharts.map((c, i) => {
                      const songInfo = songMap.get(normalizeTitle(c.title));
                      return (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 group transition-colors">
                          <div className="flex items-center gap-3 min-w-0 pr-4">
                            <Jacket imageUrl={songInfo?.image_url} intl={songInfo?.intl} songTitle={c.title} difficulty={c.diff} internalLevel={c.level} className="w-10 h-10" />
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-white truncate leading-tight mb-0.5">{c.title}</div>
                              <div className="text-[10px] text-white/50 truncate mb-1">{songInfo?.artist}</div>
                              <div className="text-xs font-bold flex gap-2" style={{ color: DIFF_COLOR[c.diff] }}>
                                <span>{c.diff} {c.level.toFixed(1)}</span>
                                <span className="text-white/30 border border-white/10 px-1 rounded-sm leading-none flex items-center text-[9px]">{c.type}</span>
                              </div>
                            </div>
                          </div>
                          <button disabled={saving} onClick={() => handleAdd(c)} className="shrink-0 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors">
                            Track
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}

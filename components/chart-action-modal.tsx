'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Play, List, ChevronLeft, Check, X } from 'lucide-react';
import { addTracker } from '@/app/tracker/actions';
import { useBoard } from '@/lib/useBoard';

const DIFF_COLOR: Record<string, string> = {
  bas: '#3fb950', adv: '#d4a017', exp: '#da3633',
  mas: '#8957e5', remas: '#d2a8ff', utage: '#bf1b5e',
};

interface Props {
  chart: { songTitle: string; diff: string; type: 'DX' | 'STD'; level: number } | null;
  onClose: () => void;
}

export function ChartActionModal({ chart, onClose }: Props) {
  const [view, setView] = useState<'menu' | 'goal' | 'list'>('menu');
  const [targetVal, setTargetVal] = useState('100.5000');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // We use useBoard here so that the modal can access and modify lists/session
  const { data, act } = useBoard();

  if (!chart) return null;

  const diffColor = DIFF_COLOR[chart.diff.toLowerCase()] ?? '#9ca3af';

  async function handleAddGoal() {
    setSaving(true);
    await addTracker(chart!.songTitle, chart!.diff, chart!.type, parseFloat(targetVal));
    setSaving(false);
    showSuccessAndClose('Added Goal!');
  }

  async function handleAddSession() {
    setSaving(true);
    await act('session_add', { songTitle: chart!.songTitle, sheetType: chart!.type, sheetDifficulty: chart!.diff });
    setSaving(false);
    showSuccessAndClose('Added to Session!');
  }

  async function handleAddToList(listId: number) {
    setSaving(true);
    await act('add_item', { listId, songTitle: chart!.songTitle, sheetType: chart!.type, sheetDifficulty: chart!.diff });
    setSaving(false);
    showSuccessAndClose('Added to List!');
  }

  function showSuccessAndClose(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg('');
      // Reset view shortly after closing
      setTimeout(() => setView('menu'), 300);
      onClose();
    }, 1200);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
          className="bg-[#111] border border-white/10 sm:rounded-2xl rounded-t-2xl sm:rounded-b-2xl p-6 w-full max-w-sm relative shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"><X size={20} /></button>
          
          <div className="flex items-center gap-3 mb-6 p-3 bg-white/5 rounded-xl border border-white/10 pr-10">
            <span
              className="text-xs font-bold px-2 py-1 rounded shrink-0"
              style={{ backgroundColor: diffColor + '33', color: diffColor }}
            >
              {chart.diff} {chart.level.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-white/50 shrink-0">{chart.type}</span>
            <div className="text-sm font-bold text-white truncate flex-1 min-w-0">{chart.songTitle}</div>
          </div>

          {/* Content Container */}
          <div className="relative h-[220px]">
            <AnimatePresence mode="wait">
              {successMsg ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 flex flex-col items-center justify-center text-green-400 gap-3"
                >
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center"><Check size={24} /></div>
                  <span className="font-bold text-sm">{successMsg}</span>
                </motion.div>
              ) : view === 'menu' ? (
                <motion.div
                  key="menu"
                  initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
                  className="flex flex-col gap-2 absolute inset-0"
                >
                  <button onClick={() => setView('goal')} className="flex items-center gap-3 p-4 glass rounded-xl border border-white/5 hover:bg-white/10 transition-colors text-left group">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:bg-purple-500/40 transition-colors"><Target size={18} /></div>
                    <div className="flex-1">
                      <div className="font-bold text-white text-sm">Add to Goal</div>
                      <div className="text-xs text-white/50">Track target score</div>
                    </div>
                  </button>
                  <button onClick={handleAddSession} disabled={saving} className="flex items-center gap-3 p-4 glass rounded-xl border border-white/5 hover:bg-white/10 transition-colors text-left group disabled:opacity-50">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-500/40 transition-colors"><Play size={18} /></div>
                    <div className="flex-1">
                      <div className="font-bold text-white text-sm">Add to Session</div>
                      <div className="text-xs text-white/50">Play it today</div>
                    </div>
                  </button>
                  <button onClick={() => setView('list')} className="flex items-center gap-3 p-4 glass rounded-xl border border-white/5 hover:bg-white/10 transition-colors text-left group">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:bg-amber-500/40 transition-colors"><List size={18} /></div>
                    <div className="flex-1">
                      <div className="font-bold text-white text-sm">Add to List...</div>
                      <div className="text-xs text-white/50">Save to a custom list</div>
                    </div>
                  </button>
                </motion.div>
              ) : view === 'goal' ? (
                <motion.div
                  key="goal"
                  initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
                  className="flex flex-col absolute inset-0"
                >
                  <button onClick={() => setView('menu')} className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors mb-4 -mt-2 w-fit"><ChevronLeft size={14} /> Back</button>
                  
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

                  <div className="mb-4">
                    <label className="block text-xs text-white/50 font-bold uppercase tracking-wider mb-1">Target Accuracy (%)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={targetVal}
                      onChange={e => setTargetVal(e.target.value)}
                      className="w-full bg-[#222] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-purple-500 transition-colors font-num text-lg"
                    />
                  </div>

                  <button
                    onClick={handleAddGoal}
                    disabled={saving}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50 mt-auto"
                  >
                    {saving ? 'Saving...' : 'Save Target'}
                  </button>
                </motion.div>
              ) : view === 'list' ? (
                <motion.div
                  key="list"
                  initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
                  className="flex flex-col absolute inset-0"
                >
                  <button onClick={() => setView('menu')} className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors mb-4 -mt-2 w-fit"><ChevronLeft size={14} /> Back</button>
                  <h3 className="font-bold text-white mb-2">Select List</h3>
                  <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar h-full pb-8">
                    {!data ? (
                      <div className="text-center text-white/30 text-xs py-4">Loading lists...</div>
                    ) : data.lists.length === 0 ? (
                      <div className="text-center text-white/30 text-xs py-4">No custom lists found. Create one in the Board tab.</div>
                    ) : (
                      data.lists.map(list => (
                        <button
                          key={list.id}
                          onClick={() => handleAddToList(list.id)}
                          disabled={saving}
                          className="w-full flex items-center gap-3 p-3 glass rounded-xl border border-white/5 hover:bg-white/10 transition-colors text-left disabled:opacity-50"
                        >
                          <span className="text-xl">{list.emoji}</span>
                          <span className="font-bold text-white text-sm">{list.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

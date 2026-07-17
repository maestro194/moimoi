'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music2, ChevronRight, PenLine } from 'lucide-react';
import { Song } from '@/lib/types';
import { getJacketUrl } from '@/lib/song-db';

interface SongDetailsModalProps {
  row: { song: Song; type: 'DX' | 'STD' } | null;
  onClose: () => void;
}

const DIFF_COLORS: Record<string, string> = {
  basic: '#3fb950',
  advanced: '#d4a017',
  expert: '#da3633',
  master: '#8957e5',
  remaster: '#d2a8ff',
};

const DIFF_LABELS: Record<string, string> = {
  basic: 'Basic',
  advanced: 'Advanced',
  expert: 'Expert',
  master: 'Master',
  remaster: 'Re:MASTER',
};

export function SongDetailsModal({ row, onClose }: SongDetailsModalProps) {
  if (!row) return null;

  const { song, type } = row;
  const jacketUrl = getJacketUrl(song.image_url ?? null, song.intl);

  // Filter sheets to only the selected type (dx or std)
  const sheets = Array.isArray(song.sheets) ? song.sheets : [];
  const typeSheets = sheets.filter(s => s.type === type.toLowerCase());

  // Render a single row in the table
  const renderRow = (diffKey: string) => {
    const sheet = typeSheets.find(s => s.difficulty === diffKey);
    if (!sheet) return null;

    const nc = sheet.noteCounts || {};
    const color = DIFF_COLORS[diffKey];
    const label = DIFF_LABELS[diffKey];
    
    const displayLevel = sheet.level;
    const internalParts = sheet.internalLevelValue ? sheet.internalLevelValue.toFixed(1).split('.') : ['0', '0'];
    const decimal = internalParts[1];

    return (
      <div key={diffKey} className="flex flex-col border-b border-white/5 last:border-0 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors px-4 -mx-4">
        <div className="flex items-center text-sm">
          {/* Difficulty */}
          <div className="w-[100px] shrink-0 font-bold" style={{ color }}>
            {label}
          </div>
          
          {/* Level */}
          <div className="w-[70px] shrink-0 font-bold text-white flex items-baseline">
            <span className="text-lg">{displayLevel}</span>
            <span className="text-white/60 text-xs">.{decimal}</span>
          </div>

          {/* Counts */}
          <div className="flex-1 grid grid-cols-6 gap-2 text-center text-white/90">
            <div className="font-semibold">{nc.total || 0}</div>
            <div>{nc.tap || 0}</div>
            <div>{nc.hold || 0}</div>
            <div>{nc.slide || 0}</div>
            <div>{nc.touch || 0}</div>
            <div>{nc.break || 0}</div>
          </div>

          {/* Arrow */}
          <div className="w-[24px] flex justify-end shrink-0 text-white/30">
            <ChevronRight size={16} />
          </div>
        </div>

        {/* Designer Sub-row */}
        {sheet.noteDesigner && sheet.noteDesigner !== '-' && (
          <div className="mt-1.5 flex items-center text-white/40 text-xs pl-[100px]">
            <PenLine size={12} className="mr-1.5 opacity-70" />
            <span>Chart Designer {sheet.noteDesigner}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-3xl relative shadow-2xl my-auto flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Charts Header */}
          <div className="p-5 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Music2 size={20} className="text-white/70" />
              Charts {type === 'DX' ? '(DX)' : '(Standard)'}
            </h2>
          </div>

          {/* Table */}
          <div className="px-5 pb-5">
            <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.01]">
              
              {/* Table Header */}
              <div className="flex items-center text-xs font-semibold text-white/50 border-b border-white/10 px-4 py-3">
                <div className="w-[100px] shrink-0">Difficulty</div>
                <div className="w-[70px] shrink-0">Level</div>
                <div className="flex-1 grid grid-cols-6 gap-2 text-center">
                  <div>Notes</div>
                  <div>Tap</div>
                  <div>Hold</div>
                  <div>Slide</div>
                  <div>Touch</div>
                  <div>Break</div>
                </div>
                <div className="w-[24px] shrink-0"></div>
              </div>

              {/* Table Body */}
              <div className="px-4">
                {typeSheets.length === 0 ? (
                  <div className="py-8 text-center text-white/40 text-sm">
                    No chart data available.
                  </div>
                ) : (
                  <>
                    {renderRow('basic')}
                    {renderRow('advanced')}
                    {renderRow('expert')}
                    {renderRow('master')}
                    {renderRow('remaster')}
                  </>
                )}
              </div>
            </div>
          </div>
          
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

import React from 'react';
import type { Difficulty } from '@/lib/types';
import { getJacketUrl } from '@/lib/song-db';

interface JacketProps {
  imageUrl?: string | null;
  intl?: boolean;
  songTitle?: string;
  difficulty: Difficulty | string;
  internalLevel: number;
  className?: string; // Additional classes for the container (e.g. w-16 h-16)
}

function getDifficultyColor(diff: string): string {
  switch (diff.toUpperCase()) {
    case 'BAS': return '#3fb950';
    case 'ADV': return '#d4a017';
    case 'EXP': return '#da3633';
    case 'MAS': return '#8957e5';
    case 'REMAS': return '#d2a8ff';
    default: return '#9ca3af';
  }
}

export function Jacket({ imageUrl, intl, songTitle, difficulty, internalLevel, className = "w-16 h-16" }: JacketProps) {
  const accent = getDifficultyColor(difficulty);
  const jacketUrl = imageUrl ? getJacketUrl(imageUrl, intl ?? true) : null;

  return (
    <div className="relative shrink-0">
      <div className={`${className} rounded-lg overflow-hidden bg-black/40 border-[3px] shadow-sm`} style={{ borderColor: accent }}>
        {jacketUrl ? (
          <img src={jacketUrl} alt={songTitle || 'Jacket'} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-white/5" />
        )}
      </div>
      <div 
        className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-md z-10 leading-none flex items-center justify-center" 
        style={{ backgroundColor: accent }}
      >
        {internalLevel > 0 ? internalLevel.toFixed(1) : (difficulty === 'REMAS' ? 'Re:M' : difficulty)}
      </div>
    </div>
  );
}

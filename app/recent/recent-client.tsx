'use client';

import React from 'react';
import type { FC, FS, Difficulty } from '@/lib/types';

import { ArrowUp, Clock } from 'lucide-react';

interface HydratedLog {
  id: number;
  songTitle: string;
  difficulty: string;
  achievement: string;
  dxScore: number | null;
  fc: string | null;
  fs: string | null;
  track: number | null;
  playedAt: Date | string;
  song: any;
  internalLevel: number;
  rating: number;
}

interface RecentClientProps {
  logs: HydratedLog[];
}

interface CreditGroup {
  id: string;
  timestamp: Date;
  plays: HydratedLog[];
}

function getDifficultyColor(diff: Difficulty | string): string {
  switch (diff) {
    case 'BAS': return '#34d399';
    case 'ADV': return '#fbbf24';
    case 'EXP': return '#f87171';
    case 'MAS': return '#c084fc';
    case 'REMAS': return '#f472b6';
    default: return '#9ca3af';
  }
}

function getDifficultyGradient(diff: Difficulty | string): string {
  switch (diff) {
    case 'BAS': return 'linear-gradient(135deg, #10b981 0%, #34d399 100%)';
    case 'ADV': return 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)';
    case 'EXP': return 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)';
    case 'MAS': return 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)';
    case 'REMAS': return 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)';
    default: return 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)';
  }
}

function groupLogsIntoCredits(logs: HydratedLog[]): CreditGroup[] {
  const groups: CreditGroup[] = [];
  let currentGroup: CreditGroup | null = null;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const logDate = new Date(log.playedAt);
    
    if (!currentGroup) {
      currentGroup = { id: log.id.toString(), timestamp: logDate, plays: [] };
      groups.push(currentGroup);
    }
    
    currentGroup.plays.push(log);
    
    const nextLog = logs[i + 1];
    if (nextLog) {
      const nextDate = new Date(nextLog.playedAt);
      const isTrack1 = log.track === 1;
      
      const timeDiffMs = logDate.getTime() - nextDate.getTime();
      const isBigGap = timeDiffMs > 30 * 60 * 1000;
      
      const isTrackAnomaly = log.track !== null && nextLog.track !== null && nextLog.track >= log.track;
      
      if (isTrack1 || isBigGap || isTrackAnomaly) {
        currentGroup = null;
      }
    }
  }
  
  return groups;
}

export default function RecentClient({ logs }: RecentClientProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-black/20 rounded-xl border border-white/5">
        <p className="text-white/50 text-sm">No recent plays found. Sync with maimai NET to see your history!</p>
      </div>
    );
  }

  const credits = groupLogsIntoCredits(logs);

  return (
    <div className="space-y-8">
      {credits.map((credit, i) => (
        <div key={credit.id} className="space-y-3">
          {/* Credit Header */}
          <div className="flex items-center gap-2 pl-1">
            <div className="w-1.5 h-4 bg-white/20 rounded-full" />
            <h2 className="text-sm font-bold text-white/80">
              Credit #{credits.length - i}
            </h2>
            <div className="flex items-center gap-1 text-xs text-white/40 ml-2">
              <Clock size={12} />
              {credit.timestamp.toLocaleDateString()} {credit.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          
          {/* Credit Plays */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* The plays array is descending by time (Track 4 -> 3 -> 2 -> 1). We should reverse it to show Track 1 -> 2 -> 3 -> 4 visually. */}
            {[...credit.plays].reverse().map(play => {
              const accent = getDifficultyColor(play.difficulty as Difficulty);
              const bg = getDifficultyGradient(play.difficulty as Difficulty);
              const achvNum = parseFloat(play.achievement);
              
              return (
                <div key={play.id} className="relative rounded-xl overflow-hidden border border-white/10 group flex flex-col h-[180px]">
                  {/* Background Image */}
                  <div className="absolute inset-0 z-0">
                    {play.song?.image_url && (
                      <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url(https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/jacket/${play.song.image_url})` }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30" />
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10 flex flex-col h-full p-3">
                    {/* Top Row: Track & Diff */}
                    <div className="flex justify-between items-start mb-auto">
                      <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-white/70 text-[10px] font-bold uppercase tracking-wider border border-white/10">
                        {play.track ? `Track ${play.track}` : 'Unknown Track'}
                      </span>
                      <div 
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-black shadow-lg"
                        style={{ background: bg }}
                      >
                        {play.difficulty} {play.internalLevel > 0 && play.internalLevel.toFixed(1)}
                      </div>
                    </div>
                    
                    {/* Middle: Title */}
                    <div className="mb-2">
                      <h3 className="font-bold text-white text-sm line-clamp-2 leading-tight drop-shadow-md">
                        {play.songTitle}
                      </h3>
                    </div>
                    
                    {/* Bottom: Score & Rating */}
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-extrabold font-num drop-shadow-lg" style={{ color: accent }}>
                            {achvNum.toFixed(4)}<span className="text-xs text-white/50 ml-0.5">%</span>
                          </span>
                        </div>
                        <div className="flex gap-1 mt-1">
                          {play.fc && (
                            <span className="px-1.5 py-0.5 rounded-sm bg-black/60 border border-white/20 text-[9px] font-bold text-white">
                              {play.fc}
                            </span>
                          )}
                          {play.fs && (
                            <span className="px-1.5 py-0.5 rounded-sm bg-black/60 border border-white/20 text-[9px] font-bold text-white">
                              {play.fs}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-0.5">Rating</div>
                        <div className="text-lg font-bold font-num text-white drop-shadow-md">
                          {play.rating.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

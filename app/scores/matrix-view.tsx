'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { ScoreWithRating } from '@/lib/types';
import { getAllCharts, type MinimalChart } from './actions';
import { FCBadge } from '@/components/badges';

interface Props {
  scores: ScoreWithRating[];
  minLevel: number;
  maxLevel: number;
  hideUnplayed?: boolean;
}

const TIERS = [
  { name: 'SSS+', min: 100.5 },
  { name: 'SSS', min: 100.0 },
  { name: 'SS+', min: 99.5 },
  { name: 'SS', min: 99.0 },
  { name: 'S+', min: 98.0 },
  { name: 'S', min: 97.0 },
  { name: 'Other', min: 0 },
];

export default function MatrixView({ scores, minLevel, maxLevel, hideUnplayed }: Props) {
  const [charts, setCharts] = useState<MinimalChart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllCharts().then(res => {
      setCharts(res);
      setLoading(false);
    });
  }, []);

  const matrix = useMemo(() => {
    if (loading) return [];

    // Filter charts by constant range
    const rangeCharts = charts.filter(c => c.level >= minLevel && c.level <= maxLevel);
    
    // Group by constant
    const byLevel = new Map<number, MinimalChart[]>();
    for (const c of rangeCharts) {
      if (!byLevel.has(c.level)) byLevel.set(c.level, []);
      byLevel.get(c.level)!.push(c);
    }

    // Prepare scores lookup
    const scoreMap = new Map<string, ScoreWithRating>();
    for (const s of scores) {
      scoreMap.set(`${s.songTitle}::${s.difficulty}::${s.songType}`, s);
    }

    // Sort levels descending
    const sortedLevels = Array.from(byLevel.keys()).sort((a, b) => b - a);

    return sortedLevels.map(level => {
      const levelCharts = byLevel.get(level)!;
      
      // Group charts in this level into tiers
      const tiers = new Map<string, Array<{ chart: MinimalChart, score?: ScoreWithRating }>>();
      for (const t of TIERS) tiers.set(t.name, []);
      if (!hideUnplayed) tiers.set('No record', []);

      for (const chart of levelCharts) {
        const key = `${chart.title}::${chart.diff}::${chart.type}`;
        const score = scoreMap.get(key);
        
        if (score) {
          const achv = score.achievement;
          const tier = TIERS.find(t => achv >= t.min) || TIERS[TIERS.length - 1];
          tiers.get(tier.name)!.push({ chart, score });
        } else if (!hideUnplayed) {
          tiers.get('No record')!.push({ chart });
        }
      }

      // Sort items within tiers (e.g. by achievement descending)
      for (const t of TIERS) {
        const arr = tiers.get(t.name)!;
        arr.sort((a, b) => b.score!.achievement - a.score!.achievement);
      }
      
      return { level, tiers };
    });
  }, [charts, scores, minLevel, maxLevel, hideUnplayed, loading]);

  if (loading) {
    return <div className="p-12 text-center text-white/50 animate-pulse">Loading charts...</div>;
  }

  if (matrix.length === 0) {
    return <div className="p-12 text-center text-white/50">No charts found in this range.</div>;
  }

  return (
    <div className="space-y-12">
      {matrix.map(({ level, tiers }) => {
        // Only render the level if there are charts in it
        let hasAny = false;
        tiers.forEach(arr => { if (arr.length > 0) hasAny = true; });
        if (!hasAny) return null;

        return (
          <div key={level} className="flex gap-4">
            <div className="w-16 shrink-0 text-right">
              <div className="text-3xl font-extrabold font-num text-white sticky top-20">{level.toFixed(1)}</div>
            </div>
            
            <div className="flex-1 space-y-4">
              {Array.from(tiers.entries()).map(([tierName, items]) => {
                if (items.length === 0) return null;
                
                return (
                  <div key={tierName} className="flex gap-3">
                    <div className="w-20 shrink-0 text-right pt-2">
                      <span className="text-sm font-bold text-white/70 uppercase tracking-widest">{tierName}</span>
                    </div>
                    
                    <div className="flex-1 flex flex-wrap gap-2">
                      {items.map(({ chart, score }, idx) => (
                        <MatrixCard key={idx} chart={chart} score={score} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MatrixCard({ chart, score }: { chart: MinimalChart, score?: ScoreWithRating }) {
  return (
    <div className="w-[72px] h-[72px] relative rounded-md overflow-hidden bg-black/40 group border border-white/10 shadow-sm hover:scale-110 hover:z-10 transition-transform duration-200">
      {chart.image ? (
        <img 
          loading="lazy" 
          src={`https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/jacket/${chart.image}`} 
          alt={chart.title} 
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
        />
      ) : (
        <div className="w-full h-full bg-white/5" />
      )}

      {/* Badges */}
      <div className="absolute top-0 left-0 right-0 flex justify-between p-0.5">
        <div>
          {score?.fc && <FCBadge fc={score.fc} className="!text-[8px] !px-1 py-0 !border-0 bg-black/60 backdrop-blur-md" />}
        </div>
        <div className="flex gap-0.5">
          <span className={`text-[8px] font-bold px-1 py-0 rounded-sm leading-tight text-white shadow-sm`} style={{ backgroundColor: chart.type === 'DX' ? '#9333ea' : '#0284c7' }}>
            {chart.type}
          </span>
        </div>
      </div>

      {/* Accuracy overlay */}
      {score ? (
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm px-1 py-0.5 text-center">
          <span className="text-[10px] font-bold font-num text-white leading-none shadow-sm">
            {score.achievement.toFixed(4)}<span className="text-[7px] text-white/50">%</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

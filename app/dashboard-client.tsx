'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, Music2, Clock, Star, Zap } from 'lucide-react';
import type { RatingData, Score } from '@/lib/types';
import { getRankTitle } from '@/lib/rating';

import { PageWrapper } from '@/components/page-wrapper';

interface Props {
  data: {
    ratingData: RatingData;
    lastSync: string | null;
    recentCredit: any[];
    totalSongs: number;
    currentVersion: number;
    profile: {
      name: string | null;
      avatar: string | null;
      courseRank: string | null;
      classRank: string | null;
      ratingBase: string | null;
    };
  } | null;
}

function DiffBadge({ diff }: { diff: string }) {
  const cls = `diff-${diff.toLowerCase()}`;
  return (
    <span className={`${cls} text-xs font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide`}>
      {diff}
    </span>
  );
}

function RankBadge({ achievement }: { achievement: number }) {
  const rank = getRankTitle(achievement);
  const cls = `rank-${rank.toLowerCase().replace('+', 'plus')}`;
  return (
    <span className={`${cls} text-xs font-bold px-2 py-0.5 rounded-full`}>
      {rank}
    </span>
  );
}

function RatingCircle({ rating }: { rating: number }) {
  const circumference = 2 * Math.PI * 54;
  const progress = Math.min(rating / 15000, 1);

  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      {/* Background circle */}
      <svg className="absolute inset-0 -rotate-90" width="160" height="160" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(139,92,246,0.1)" strokeWidth="8" />
        <circle
          cx="60" cy="60" r="54" fill="none"
          stroke="url(#ratingGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <defs>
          <linearGradient id="ratingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="text-center z-10">
        <div className="text-3xl font-bold font-num gradient-text">{rating.toLocaleString()}</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--foreground-subtle)' }}>DX Rating</div>
      </div>
    </div>
  );
}

export default function DashboardClient({ data }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg('⏳ Starting sync...');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      if (!res.body) throw new Error('No response body');
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'progress') {
              setSyncMsg(`⏳ ${data.message}`);
            } else if (data.type === 'done') {
              setSyncMsg(`✓ Synced! ${data.result.inserted} new, ${data.result.updated} updated.`);
              setTimeout(() => window.location.reload(), 1500);
            } else if (data.type === 'error') {
              setSyncMsg(`✗ ${data.message}`);
            }
          } catch (e) {
            console.error('Failed to parse NDJSON line', line);
          }
        }
      }
    } catch {
      setSyncMsg('✗ Network error');
    } finally {
      setSyncing(false);
    }
  }

  if (!data) {
    return (
      <div className="p-8 max-w-xl mx-auto mt-16 text-center">
        <div className="glass rounded-2xl p-8">
          <Zap size={40} className="mx-auto mb-4" style={{ color: 'var(--accent-purple)' }} />
          <h2 className="text-xl font-bold mb-2">Database not connected</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--foreground-muted)' }}>
            Set your <code className="bg-black/30 px-1 rounded text-purple-300">DATABASE_URL</code> in{' '}
            <code className="bg-black/30 px-1 rounded text-purple-300">.env.local</code> to get started.
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-subtle)' }}>
            See the README for setup instructions.
          </p>
        </div>
      </div>
    );
  }

  const { ratingData, lastSync, recentCredit, profile } = data;
  const lastSyncDate = lastSync ? new Date(lastSync) : null;

  return (
    <PageWrapper className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
            {!mounted 
              ? 'Loading...' 
              : lastSyncDate
                ? `Last synced ${lastSyncDate.toLocaleString()}`
                : 'Never synced — run your first sync to get started!'}
          </p>
        </div>

        <button
          id="sync-button"
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#f472b6)', color: '#fff' }}
        >
          <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
      </div>

      {syncMsg && (
        <div
          className="px-4 py-3 rounded-xl text-sm font-medium border"
          style={{
            background: syncMsg.startsWith('✓')
              ? 'rgba(74,222,128,0.1)' 
              : syncMsg.startsWith('⏳') ? 'rgba(56,189,248,0.1)' : 'rgba(248,113,113,0.1)',
            borderColor: syncMsg.startsWith('✓')
              ? 'rgba(74,222,128,0.3)' 
              : syncMsg.startsWith('⏳') ? 'rgba(56,189,248,0.3)' : 'rgba(248,113,113,0.3)',
            color: syncMsg.startsWith('✓') 
              ? '#4ade80' 
              : syncMsg.startsWith('⏳') ? '#38bdf8' : '#f87171',
          }}
        >
          {syncMsg}
        </div>
      )}

      {/* User Profile & Rating Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Profile Card */}
        {profile.name ? (
          <div className="glass rounded-2xl relative overflow-hidden flex items-center p-6 gap-6">
            {profile.ratingBase && (
              <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay" style={{
                backgroundImage: `url(${profile.ratingBase})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }} />
            )}
            <div className="relative z-10 flex-shrink-0">
              {profile.avatar && (
                <img src={profile.avatar} alt="Avatar" className="w-24 h-24 rounded-lg shadow-xl" />
              )}
            </div>
            <div className="relative z-10 flex flex-col justify-center">
              <h2 className="text-2xl font-bold mb-2 tracking-wide" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {profile.name}
              </h2>
              <div className="flex gap-2 h-10 items-center">
                {profile.courseRank && <img src={profile.courseRank} alt="Course Rank" className="h-full object-contain drop-shadow-md" />}
                {profile.classRank && <img src={profile.classRank} alt="Class Rank" className="h-full object-contain drop-shadow-md" />}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl p-6 flex flex-col justify-center items-center text-center">
            <div className="text-[var(--foreground-muted)] mb-2">No Profile Data</div>
            <div className="text-xs text-[var(--foreground-subtle)]">Sync to fetch your maimai profile</div>
          </div>
        )}

        {/* DX Rating circle */}
        <div className="glass rounded-2xl p-6 flex items-center justify-between glow-purple">
          <RatingCircle rating={ratingData.totalRating} />
          <div className="flex flex-col gap-4 text-right">
            <div>
              <div className="text-2xl font-bold font-num" style={{ color: 'var(--accent-pink)' }}>
                {ratingData.newRating.toLocaleString()}
              </div>
              <div className="text-sm font-medium tracking-wide uppercase" style={{ color: 'var(--foreground-subtle)' }}>NEW (Top 15)</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-num" style={{ color: 'var(--accent-purple)' }}>
                {ratingData.oldRating.toLocaleString()}
              </div>
              <div className="text-sm font-medium tracking-wide uppercase" style={{ color: 'var(--foreground-subtle)' }}>OLD (Top 35)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top rating charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RatingList title="🆕 NEW Pool (Top 15)" charts={ratingData.newCharts} accent="var(--accent-pink)" />
      </div>

      {/* Recent Credit */}
      {data.recentCredit.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} style={{ color: 'var(--accent-cyan)' }} />
            <h2 className="font-semibold">Recent Credit</h2>
          </div>
          <div className="space-y-2">
            {data.recentCredit.map((score: any, i: number) => (
              <div
                key={score.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg card-hover"
                style={{ background: 'rgba(255,255,255,0.03)', animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-[10px] font-bold text-white/50 bg-black/50 px-1.5 py-0.5 rounded">
                    {score.track ? `TRK ${score.track}` : '-'}
                  </div>
                  <DiffBadge diff={score.difficulty} />
                  <span className="text-sm font-medium truncate">{score.songTitle}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-num font-semibold" style={{ color: 'var(--foreground-muted)' }}>
                    {parseFloat(score.achievement).toFixed(4)}%
                  </span>
                  <RankBadge achievement={parseFloat(score.achievement)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

function StatCard({ icon, label, value, color, sub }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <div className="glass rounded-xl p-4 card-hover">
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <span className="text-xs font-medium" style={{ color: 'var(--foreground-muted)' }}>{label}</span>
      </div>
      <div className="text-2xl font-bold font-num" style={{ color }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--foreground-subtle)' }}>{sub}</div>}
    </div>
  );
}

function RatingList({ title, charts, accent, showMore = false }: {
  title: string; charts: import('@/lib/types').ScoreWithRating[]; accent: string; showMore?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="font-semibold mb-3 text-sm" style={{ color: accent }}>{title}</h2>
      <div className="space-y-1">
        {charts.map((chart, i) => (
          <div
            key={`${chart.songTitle}-${chart.difficulty}`}
            className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
            style={{ background: i === 0 ? 'rgba(255,255,255,0.05)' : 'transparent' }}
          >
            <span className="text-xs font-num w-5 shrink-0" style={{ color: 'var(--foreground-subtle)' }}>
              #{i + 1}
            </span>
            <DiffBadge diff={chart.difficulty} />
            <span className="text-xs font-medium truncate flex-1">{chart.songTitle}</span>
            <span className="text-xs font-num font-bold shrink-0" style={{ color: accent }}>
              {chart.rating.toFixed(0)}
            </span>
          </div>
        ))}
        {showMore && (
          <p className="text-xs text-center pt-1" style={{ color: 'var(--foreground-subtle)' }}>
            + more in Scores page
          </p>
        )}
        {charts.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: 'var(--foreground-subtle)' }}>
            No scores yet — sync to get started!
          </p>
        )}
      </div>
    </div>
  );
}

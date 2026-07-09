'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Zap } from 'lucide-react';
import type { RatingData, Score } from '@/lib/types';
import { getRankTitle } from '@/lib/rating';

import { PageWrapper } from '@/components/page-wrapper';

interface Props {
  data: {
    ratingData: RatingData;
    lastSync: string | null;

    totalSongs: number;
    currentVersion: number;
    profile: {
      name: string | null;
      avatar: string | null;
      courseRank: string | null;
      classRank: string | null;
      ratingBase: string | null;
      rating?: string | null;
      title?: string | null;
      stars?: string | null;
      versionPlays?: string | null;
      totalPlays?: string | null;
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

  const { ratingData, lastSync, profile } = data;
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

      {/* User Profile Overview */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Profile Card */}
        {profile.name ? (
          <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-wrap items-center gap-6">
              {profile.avatar && (
                <div className="flex-shrink-0 w-28 h-28 p-1 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-lg">
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full rounded-lg object-cover" />
                </div>
              )}
              <div className="flex flex-col justify-center gap-1">
                {profile.title && (
                  <div className="bg-[#423f40] px-4 py-1.5 rounded-full inline-block self-start shadow-inner mb-2" style={{ border: '2px solid #555' }}>
                    <span className="text-sm font-bold text-white tracking-widest uppercase">{profile.title}</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-4">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-[0.2em] text-white">
                    {profile.name}
                  </h2>
                  <div className="relative h-[44px] flex items-center">
                    {profile.ratingBase && (
                      <img src={profile.ratingBase} alt="Rating Base" className="h-full object-contain drop-shadow-md" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-end pr-4 pb-[1px] font-num font-bold text-[17px] md:text-[19px] text-white" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                      {profile.rating || ratingData.totalRating}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 bg-[#363233]/80 border border-white/5 shadow-xl mt-2 w-full max-w-2xl">
              <h3 className="text-lg font-bold text-white/90 mb-4">Player Info</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div>
                  <span className="text-white/60 mr-2">Rating:</span>
                  <span className="text-white font-semibold">{profile.rating || ratingData.totalRating}</span>
                </div>
                <div>
                  <span className="text-white/60 mr-2">Stars:</span>
                  <span className="text-white font-semibold">{profile.stars || '0'}</span>
                </div>
                <div>
                  <span className="text-white/60 mr-2">Version Plays:</span>
                  <span className="text-white font-semibold">{profile.versionPlays || '0'}</span>
                </div>
                <div>
                  <span className="text-white/60 mr-2">Total Plays:</span>
                  <span className="text-white font-semibold">{profile.totalPlays || '0'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl p-6 flex flex-col justify-center items-center text-center w-full max-w-2xl h-48">
            <div className="text-[var(--foreground-muted)] mb-2">No Profile Data</div>
            <div className="text-xs text-[var(--foreground-subtle)]">Sync to fetch your maimai profile</div>
          </div>
        )}
      </div>
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

'use client';

import { useState } from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';
import type { PlayerProfile } from '@/lib/types';

interface SyncBarProps {
  profile: PlayerProfile;
  lastSync: string | null;
}

export function SyncBar({ profile, lastSync }: SyncBarProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  async function handleSync(full = false) {
    setShowMenu(false);
    setSyncing(true);
    setSyncMsg(full ? 'Starting full sync...' : 'Starting sync...');
    try {
      const url = full ? '/api/sync?full=true' : '/api/sync';
      const res = await fetch(url, { method: 'POST' });
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'progress') {
              setSyncMsg(data.message);
            } else if (data.type === 'done') {
              setSyncMsg(`Synced! ${data.result.inserted} new, ${data.result.updated} updated.`);
              setTimeout(() => window.location.reload(), 1500);
            } else if (data.type === 'error') {
              setSyncMsg(`Error: ${data.message}`);
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch {
      setSyncMsg('Network error');
    } finally {
      setSyncing(false);
    }
  }

  const syncMsgType = syncMsg?.startsWith('Synced')
    ? 'success'
    : syncMsg?.startsWith('Error')
      ? 'error'
      : 'progress';

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#111] border border-white/10 rounded-2xl px-5 py-3.5 shadow-xl relative">
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </div>

        {/* Left: Profile snapshot */}
        <div className="flex items-center gap-3 relative z-10 min-w-0">
          <span className="text-xs font-bold text-white/40 uppercase tracking-wider shrink-0">Data Snapshot:</span>
          <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-1.5 border border-white/5 min-w-0">
            <span className="font-bold text-sm text-white tracking-wider truncate">{profile.name}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-num border shrink-0"
              style={{ background: 'rgba(218,54,51,0.15)', color: '#da3633', borderColor: 'rgba(218,54,51,0.3)' }}>
              {profile.rating}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 text-[10px] font-bold uppercase border border-white/5 shrink-0">
              {profile.region}
            </span>
          </div>
        </div>

        {/* Right: Last sync + Sync button */}
        <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto">
          <div className="text-[10px] text-white/30 text-right hidden sm:block whitespace-nowrap" suppressHydrationWarning>
            {lastSync ? new Date(lastSync).toLocaleString() : 'Never synced'}
          </div>

          {/* Split button: main + dropdown */}
          <div className="relative flex ml-auto sm:ml-0">
            <button
              onClick={() => handleSync(false)}
              disabled={syncing}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-l-xl text-sm font-bold transition-all disabled:opacity-60 shrink-0"
              style={{ background: 'linear-gradient(135deg, #ec4899, #f9a8d4)', color: '#1a1a1a' }}
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Fetch New Data'}
            </button>
            <button
              onClick={() => setShowMenu(v => !v)}
              disabled={syncing}
              className="flex items-center px-2 py-2 rounded-r-xl text-sm font-bold transition-all disabled:opacity-60 border-l border-black/20"
              style={{ background: 'linear-gradient(135deg, #db2777, #ec4899)', color: '#1a1a1a' }}
            >
              <ChevronDown size={14} />
            </button>
            {showMenu && !syncing && (
              <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[180px] animate-slide-up">
                <button
                  onClick={() => handleSync(false)}
                  className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 transition-colors"
                >
                  <div className="font-semibold">Fast Sync</div>
                  <div className="text-[10px] text-white/40">Recent plays only</div>
                </button>
                <div className="border-t border-white/5" />
                <button
                  onClick={() => handleSync(true)}
                  className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 transition-colors"
                >
                  <div className="font-semibold">Full Sync</div>
                  <div className="text-[10px] text-white/40">Re-scrape all scores (slower)</div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync progress message */}
      {syncMsg && (
        <div
          className="px-4 py-2.5 rounded-xl text-xs font-medium border animate-slide-up"
          style={{
            background: syncMsgType === 'success'
              ? 'rgba(74,222,128,0.1)'
              : syncMsgType === 'progress' ? 'rgba(56,189,248,0.1)' : 'rgba(248,113,113,0.1)',
            borderColor: syncMsgType === 'success'
              ? 'rgba(74,222,128,0.3)'
              : syncMsgType === 'progress' ? 'rgba(56,189,248,0.3)' : 'rgba(248,113,113,0.3)',
            color: syncMsgType === 'success'
              ? '#4ade80'
              : syncMsgType === 'progress' ? '#38bdf8' : '#f87171',
          }}
        >
          {syncMsg}
        </div>
      )}
    </div>
  );
}

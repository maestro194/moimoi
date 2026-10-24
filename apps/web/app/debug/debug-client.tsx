'use client';

import React, { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageWrapper } from '@/components/page-wrapper';
import { ManualCreditModalWeb } from '@/components/manual-credit-modal';

export default function SongDetailsDebugClient() {
  return (
    <PageWrapper className="p-4 md:p-8 max-w-[1100px] mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full text-xs font-bold bg-yellow-500/15 border border-yellow-500/30 text-yellow-400">
          🧪 Debug page — not linked in navigation
        </div>
        <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          B50 Image Generator
        </h1>
        <p className="text-sm text-white/50">
          Preview the generated B50 image. Uses real DB data and your stored session cookie.
        </p>
      </div>

      <B50ImagePreview />
      <ManualCreditSandbox />
    </PageWrapper>
  );
}

// ── Manual Credit Entry Sandbox ───────────────────────────────────────────────
function ManualCreditSandbox() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlay, setEditingPlay] = useState<any | null>(null);
  const [recentManualPlays, setRecentManualPlays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recent-plays?limit=20');
      if (res.ok) {
        const data = await res.json();
        const plays = data.recentScores || [];
        setRecentManualPlays(plays.filter((p: any) => p.isManual));
      }
    } catch (err) {
      console.error('Failed to fetch recent plays:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPlays();
  }, [fetchPlays]);

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>✍️</span> Manual Score & Credit Entry Sandbox
          </h2>
          <p className="text-sm text-white/50 mt-0.5">
            Prototype and verify manual score entry, note breakdown solver, and edit/delete permissions against Neon DB.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchPlays()}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Refresh plays"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => {
              setEditingPlay(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-900/30"
          >
            <span>+ Log Manual Credit</span>
          </button>
        </div>
      </div>

      {/* Manual plays list in DB */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-white/40">
          Manual Plays Currently in DB ({recentManualPlays.length})
        </h3>
        {recentManualPlays.length === 0 ? (
          <p className="text-xs text-white/40 italic py-2">
            No manual plays found in recent history. Click &quot;+ Log Manual Credit&quot; to test.
          </p>
        ) : (
          <div className="space-y-2">
            {recentManualPlays.map(play => (
              <div
                key={play.id}
                className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white truncate">{play.songTitle}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {play.difficulty}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase bg-purple-600/30 text-white">
                      MANUAL
                    </span>
                  </div>
                  <div className="text-xs text-white/50 flex items-center gap-3 mt-1">
                    <span className="text-amber-400 font-extrabold font-mono">{play.achievement}%</span>
                    <span>DX: {play.dxScore ?? 'None'}</span>
                    {play.fc && <span className="text-yellow-300 font-bold">{play.fc}</span>}
                    {play.fs && <span className="text-blue-300 font-bold">{play.fs}</span>}
                    <span className="text-white/30">Track {play.track ?? 1}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingPlay(play);
                      setModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-purple-300 font-bold transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete manual play for "${play.songTitle}"?`)) return;
                      await fetch(`/api/manual-credit?id=${play.id}`, { method: 'DELETE' });
                      fetchPlays();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs text-red-400 font-bold transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ManualCreditModalWeb
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPlay(null);
        }}
        onSuccess={() => fetchPlays()}
        initialPlay={editingPlay}
      />
    </div>
  );
}

// ── B50 Image Preview ──────────────────────────────────────────────────────────
function B50ImagePreview() {
  const [ts, setTs] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const src = ts > 0 ? `/api/b50-image?t=${ts}` : null;

  const generate = useCallback(() => {
    setError(null);
    setLoading(true);
    setTs(Date.now());
  }, []);

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <p className="text-sm text-white/50">
        Hits <code className="bg-black/30 px-1 rounded text-purple-300">/api/b50-image</code> and
        renders the PNG inline. Jackets are fetched via your stored{' '}
        <code className="bg-black/30 px-1 rounded text-purple-300">SEGA ID</code> cookie.
      </p>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#f472b6)', color: '#fff' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Generating…' : src ? 'Re-generate' : 'Generate B50 Image'}
        </button>

        {src && (
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors"
          >
            Open in new tab ↗
          </a>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          ✗ {error}
        </div>
      )}

      {src && (
        <div className="rounded-xl overflow-hidden border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="B50 image preview"
            className="w-full"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError('Failed to generate image — check server logs. Is your session cookie still valid?');
            }}
          />
        </div>
      )}
    </div>
  );
}

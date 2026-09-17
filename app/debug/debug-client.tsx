'use client';

import React, { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageWrapper } from '@/components/page-wrapper';

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
    </PageWrapper>
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
        <code className="bg-black/30 px-1 rounded text-purple-300">maimai_clal</code> cookie.
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

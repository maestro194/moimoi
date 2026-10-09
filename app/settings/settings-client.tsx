'use client';

import { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle, Globe, RefreshCw, Trash2, Database, X } from 'lucide-react';
import { bustSongsCache } from '@/app/songs/songs-client';

export default function SettingsClient() {
  const [segaId, setSegaId] = useState('');
  const [segaPassword, setSegaPassword] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [clearing, setClearing] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearMsg, setClearMsg] = useState<{ ok: boolean; text: string } | null>(null);
  
  const [refreshingDb, setRefreshingDb] = useState(false);
  const [refreshDbMsg, setRefreshDbMsg] = useState<{ ok: boolean; text: string } | null>(null);
  
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.segaId) setSegaId(d.segaId);
      if (d.segaPassword) setSegaPassword(d.segaPassword);
    }).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          region: 'intl',
          segaId,
          segaPassword: segaPassword.includes('•') ? undefined : segaPassword
        }),
      });
      if (res.ok) {
        setSaveMsg({ ok: true, text: 'Account info saved!' });
      } else {
        const j = await res.json();
        setSaveMsg({ ok: false, text: j.error || 'Failed to save' });
      }
    } catch {
      setSaveMsg({ ok: false, text: 'Network error' });
    } finally {
      setSaving(false);
      setIsLoginModalOpen(false);
    }
  }

  async function handleRefreshDb() {
    setRefreshingDb(true);
    setRefreshDbMsg(null);
    try {
      const res = await fetch('/api/refresh-songs', { method: 'POST' });
      const j = await res.json();
      if (j.ok) {
        bustSongsCache();
        setRefreshDbMsg({ ok: true, text: `Song database refreshed — ${j.count.toLocaleString()} songs loaded.` });
      } else {
        setRefreshDbMsg({ ok: false, text: j.error || 'Failed to refresh.' });
      }
    } catch {
      setRefreshDbMsg({ ok: false, text: 'Network error.' });
    } finally {
      setRefreshingDb(false);
    }
  }

  async function handleClearData() {
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    setClearing(true);
    setClearMsg(null);
    try {
      const res = await fetch('/api/clear-data', { method: 'DELETE' });
      const j = await res.json();
      if (j.ok) {
        setClearMsg({ ok: true, text: 'All score data cleared successfully.' });
      } else {
        setClearMsg({ ok: false, text: j.error || 'Failed to clear data.' });
      }
    } catch {
      setClearMsg({ ok: false, text: 'Network error.' });
    } finally {
      setClearing(false);
      setClearConfirm(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
          Configure maimai NET auto-sync
        </p>
      </div>

      {/* Sega ID Login */}
      <div className="glass rounded-2xl p-5 mb-5 border" style={{ borderColor: 'rgba(124,58,237,0.2)' }}>
        <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
          <Globe size={15} style={{ color: 'var(--accent-purple)' }} />
          SEGA ID Login
        </label>
        <p className="text-xs mb-4" style={{ color: 'var(--foreground-muted)' }}>
          Provide your SEGA ID to let the app automatically log in and fetch your profile. 
          <strong className="text-white"> Stored locally in your private database.</strong>
        </p>

        <button
          onClick={() => setIsLoginModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#f472b6)', color: '#fff' }}
        >
          <Globe size={16} />
          {segaId ? 'Update SEGA ID Account' : 'Configure SEGA ID Account'}
        </button>

        {saveMsg && (
          <div
            className="mt-4 px-3 py-2 rounded-lg text-sm"
            style={{
              background: saveMsg.ok ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
              color: saveMsg.ok ? '#4ade80' : '#f87171',
            }}
          >
            {saveMsg.text}
          </div>
        )}
      </div>

      {process.env.NODE_ENV === 'development' && (
        <>
          {/* Song Database */}
          <div className="glass rounded-2xl p-5 border mb-5" style={{ borderColor: 'rgba(34,211,238,0.2)' }}>
            <h2 className="font-semibold text-sm mb-1 flex items-center gap-2" style={{ color: 'var(--accent-cyan)' }}>
              <Database size={15} />
              Song Database
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--foreground-muted)' }}>
              [DEV ONLY] Fetches the latest song data from otoge-db (GitHub) and caches it in your database.
            </p>
            <button
              id="refresh-song-db"
              onClick={handleRefreshDb}
              disabled={refreshingDb}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
              style={{
                background: 'rgba(34,211,238,0.1)',
                border: '1px solid rgba(34,211,238,0.3)',
                color: 'var(--accent-cyan)',
              }}
            >
              <RefreshCw size={14} className={refreshingDb ? 'animate-spin' : ''} />
              {refreshingDb ? 'Refreshing…' : 'Refresh Song DB'}
            </button>
            {refreshDbMsg && (
              <div
                className="mt-3 px-3 py-2 rounded-lg text-sm"
                style={{
                  background: refreshDbMsg.ok ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                  color: refreshDbMsg.ok ? '#4ade80' : '#f87171',
                }}
              >
                {refreshDbMsg.text}
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'rgba(248,113,113,0.3)' }}>
            <h2 className="font-semibold text-sm mb-1 flex items-center gap-2" style={{ color: '#f87171' }}>
              <Trash2 size={15} />
              Danger Zone
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--foreground-muted)' }}>
              [DEV ONLY] Permanently delete all synced scores and play history.
            </p>
            <button
              id="clear-data"
              onClick={handleClearData}
              disabled={clearing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
              style={{
                background: clearConfirm ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${clearConfirm ? 'rgba(248,113,113,0.6)' : 'rgba(248,113,113,0.3)'}`,
                color: '#f87171',
              }}
            >
              <Trash2 size={14} />
              {clearing ? 'Clearing…' : clearConfirm ? '⚠️ Click again to confirm' : 'Clear All Score Data'}
            </button>
            {clearConfirm && !clearing && (
              <p className="mt-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>
                This cannot be undone. Click the button again to confirm.
              </p>
            )}
            {clearMsg && (
              <div
                className="mt-3 px-3 py-2 rounded-lg text-sm"
                style={{
                  background: clearMsg.ok ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                  color: clearMsg.ok ? '#4ade80' : '#f87171',
                }}
              >
                {clearMsg.text}
              </div>
            )}
          </div>
        </>
      )}

      {/* SEGA ID Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
          <div className="glass rounded-2xl p-6 max-w-sm w-full border animate-slide-up" style={{ borderColor: 'rgba(124,58,237,0.3)' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Globe size={18} style={{ color: 'var(--accent-purple)' }} />
                SEGA ID Account
              </h2>
              <button onClick={() => setIsLoginModalOpen(false)} className="opacity-60 hover:opacity-100 transition-opacity">
                <X size={18} />
              </button>
            </div>
            
            <p className="text-xs mb-4" style={{ color: 'var(--foreground-muted)' }}>
              Enter your SEGA ID credentials to allow the tracker to automatically fetch your scores.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--foreground-muted)' }}>SEGA ID</label>
                <input
                  type="text"
                  placeholder="ID or Email"
                  value={segaId}
                  onChange={e => setSegaId(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--foreground-muted)' }}>Password</label>
                <input
                  type="password"
                  placeholder="Password"
                  value={segaPassword}
                  onChange={e => setSegaPassword(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#f472b6)', color: '#fff' }}
              >
                <Save size={14} />
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

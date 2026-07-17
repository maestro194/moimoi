'use client';

import { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle, Globe, RefreshCw, Star, Trash2, Database } from 'lucide-react';

export default function SettingsClient() {
  const [versionOverride, setVersionOverride] = useState('');
  const [segaId, setSegaId] = useState('');
  const [segaPassword, setSegaPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearMsg, setClearMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [refreshingDb, setRefreshingDb] = useState(false);
  const [refreshDbMsg, setRefreshDbMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.version !== undefined) setVersionOverride(d.version);
      if (d.segaId) setSegaId(d.segaId);
      if (d.segaPassword) setSegaPassword(d.segaPassword);
      if (d.lastSync) setLastSync(d.lastSync);
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
          version: versionOverride,
          segaId,
          segaPassword: segaPassword.includes('•') ? undefined : segaPassword
        }),
      });
      if (res.ok) {
        setSaveMsg({ ok: true, text: 'Settings saved!' });
      } else {
        const j = await res.json();
        setSaveMsg({ ok: false, text: j.error || 'Failed to save' });
      }
    } catch {
      setSaveMsg({ ok: false, text: 'Network error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleRefreshDb() {
    setRefreshingDb(true);
    setRefreshDbMsg(null);
    try {
      const res = await fetch('/api/refresh-songs', { method: 'POST' });
      const j = await res.json();
      if (j.ok) {
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
        setLastSync(null);
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

      {/* Game Version */}
      <div className="glass rounded-2xl p-5 mb-5">
        <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
          <Star size={15} style={{ color: 'var(--accent-pink)' }} />
          Game Version (Rating Pool)
        </label>
        <p className="text-xs mb-3" style={{ color: 'var(--foreground-muted)' }}>
          Select the version of the game you are playing. This determines which songs belong in the "New" rating pool vs "Old".
        </p>
        <select
          value={versionOverride}
          onChange={e => setVersionOverride(e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all cursor-pointer bg-[#1e1e1e] text-white"
          style={{
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <option value="">Auto-detect (Latest available)</option>
          <option value="26500">maimai DX CiRCLE PLUS (26500)</option>
          <option value="26000">maimai DX CiRCLE (26000)</option>
          <option value="25500">maimai DX PRiSM PLUS (25500)</option>
          <option value="25000">maimai DX PRiSM (25000)</option>
          <option value="24500">maimai DX BUDDiES PLUS (24500)</option>
          <option value="24000">maimai DX BUDDiES (24000)</option>
          <option value="23500">maimai DX FESTiVAL PLUS (23500)</option>
          <option value="23000">maimai DX FESTiVAL (23000)</option>
          <option value="22500">maimai DX UNiVERSE PLUS (22500)</option>
          <option value="22000">maimai DX UNiVERSE (22000)</option>
        </select>
      </div>

      {/* Sega ID Login */}
      <div className="glass rounded-2xl p-5 mb-5 border" style={{ borderColor: 'rgba(124,58,237,0.2)' }}>
        <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
          <Globe size={15} style={{ color: 'var(--accent-purple)' }} />
          SEGA ID Login
        </label>
        <p className="text-xs mb-3" style={{ color: 'var(--foreground-muted)' }}>
          Provide your SEGA ID to let the app automatically log in and fetch your profile. 
          <strong className="text-white"> Stored locally in your private database.</strong>
        </p>
        <div className="space-y-3 mb-4">
          <input
            type="text"
            placeholder="SEGA ID"
            value={segaId}
            onChange={e => setSegaId(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={segaPassword}
            onChange={e => setSegaPassword(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </div>

        <div className="flex gap-3">
          <button
            id="save-settings"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#f472b6)', color: '#fff' }}
          >
            <Save size={14} />
            {saving ? 'Saving…' : 'Save SEGA ID'}
          </button>
        </div>

        {saveMsg && (
          <div
            className="mt-3 px-3 py-2 rounded-lg text-sm"
            style={{
              background: saveMsg.ok ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
              color: saveMsg.ok ? '#4ade80' : '#f87171',
            }}
          >
            {saveMsg.text}
          </div>
        )}
      </div>

      {/* Last sync info */}
      {lastSync && (
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-1">Last Sync</h2>
          <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
            {new Date(lastSync).toLocaleString()}
          </p>
        </div>
      )}

      {/* Song Database */}
      <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'rgba(34,211,238,0.2)' }}>
        <h2 className="font-semibold text-sm mb-1 flex items-center gap-2" style={{ color: 'var(--accent-cyan)' }}>
          <Database size={15} />
          Song Database
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--foreground-muted)' }}>
          Fetches the latest song data from otoge-db (GitHub) and caches it in your database.
          Run this after a new game version is released to get updated internal levels.
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
          Permanently delete all synced scores and play history. Your credentials and settings will be preserved.
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
    </div>
  );
}

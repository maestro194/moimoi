'use client';

import { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle, Globe, Cookie, RefreshCw, Star, Trash2, Database } from 'lucide-react';

type Region = 'jp' | 'intl';

export default function SettingsClient() {
  const [clal, setClal] = useState('');
  const [region, setRegion] = useState<Region>('intl');
  const [versionOverride, setVersionOverride] = useState('');
  const [segaId, setSegaId] = useState('');
  const [segaPassword, setSegaPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearMsg, setClearMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [refreshingDb, setRefreshingDb] = useState(false);
  const [refreshDbMsg, setRefreshDbMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sessionValid, setSessionValid] = useState<{ valid: boolean; debug?: string } | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.clal) setClal(d.clal);
      if (d.region) setRegion(d.region);
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
          clal: clal.includes('•') ? undefined : clal, 
          region,
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

  async function handleValidate() {
    setValidating(true);
    setSessionValid(null);
    try {
      const res = await fetch('/api/validate-session');
      const j = await res.json();
      setSessionValid({ valid: j.valid, debug: j.debug });
    } catch (err) {
      setSessionValid({ valid: false, debug: String(err) });
    } finally {
      setValidating(false);
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

      {/* Instructions */}
      <div className="glass rounded-2xl p-5 border" style={{ borderColor: 'rgba(34,211,238,0.2)' }}>
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--accent-cyan)' }}>
          <Cookie size={15} />
          How to get your session cookie
        </h2>
        <ol className="space-y-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
          <li><span className="font-semibold text-white">1.</span> Open your browser&apos;s DevTools (F12) on the maimai NET site.</li>
          <li><span className="font-semibold text-white">2.</span> Go to Application → Cookies → maimaidx-eng.com (or maimaidx.jp for JP).</li>
          <li><span className="font-semibold text-white">3.</span> For International, you need BOTH <code className="bg-black/30 px-1 rounded text-purple-300">_t</code> and <code className="bg-black/30 px-1 rounded text-purple-300">userId</code>. For JP, just <code className="bg-black/30 px-1 rounded text-purple-300">clal</code>.</li>
          <li><span className="font-semibold text-white">4.</span> Paste them below (e.g. <code className="bg-black/30 px-1 rounded text-purple-300">_t=xxx; userId=yyy</code>) and click Save.</li>
        </ol>
        <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
          ⚠️ Your session cookie is stored in your private database. Never share it with anyone.
        </div>
      </div>

      {/* Region select */}
      <div className="glass rounded-2xl p-5">
        <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
          <Globe size={15} style={{ color: 'var(--accent-purple)' }} />
          Region
        </label>
        <div className="flex gap-3">
          {(['intl', 'jp'] as Region[]).map(r => (
            <button
              key={r}
              id={`region-${r}`}
              onClick={() => setRegion(r)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: region === r ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${region === r ? 'rgba(124,58,237,0.6)' : 'var(--border)'}`,
                color: region === r ? '#d8b4fe' : 'var(--foreground-muted)',
              }}
            >
              {r === 'intl' ? '🌏 International' : '🇯🇵 Japan'}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--foreground-subtle)' }}>
          {region === 'intl'
            ? 'Uses maimaidx-eng.com — for SEA/HK/KR/EU regions'
            : 'Uses maimaidx.jp — for Japan region accounts'}
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
          <option value="27000">maimai DX CiRCLE PLUS (27000)</option>
          <option value="26500">maimai DX CiRCLE (26500)</option>
          <option value="26000">maimai DX PRiSM PLUS (26000)</option>
          <option value="25500">maimai DX PRiSM (25500)</option>
          <option value="25000">maimai DX BUDDiES PLUS (25000)</option>
          <option value="24500">maimai DX BUDDiES (24500)</option>
          <option value="24000">maimai DX FESTiVAL PLUS (24000)</option>
          <option value="23500">maimai DX FESTiVAL (23500)</option>
          <option value="23000">maimai DX UNiVERSE PLUS (23000)</option>
        </select>
      </div>

      {/* Sega ID Login (Optional) */}
      <div className="glass rounded-2xl p-5 mb-5 border" style={{ borderColor: 'rgba(124,58,237,0.2)' }}>
        <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
          <Globe size={15} style={{ color: 'var(--accent-purple)' }} />
          Automated Login (Optional)
        </label>
        <p className="text-xs mb-3" style={{ color: 'var(--foreground-muted)' }}>
          Provide your SEGA ID to let the app automatically log in and fetch a new session cookie when your current one expires. 
          <strong className="text-white"> Stored locally in your private database.</strong>
        </p>
        <div className="space-y-3">
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
      </div>

      {/* CLAL cookie */}
      <div className="glass rounded-2xl p-5">
        <label htmlFor="clal-input" className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
          <Cookie size={15} style={{ color: 'var(--accent-pink)' }} />
          Session Cookie ({region === 'intl' ? '_t' : 'clal'})
        </label>
        <textarea
          id="clal-input"
          value={clal}
          onChange={e => setClal(e.target.value)}
          rows={3}
          placeholder={`E.g. ${region === 'intl' ? '_t=xxx; userId=yyy' : 'clal=xxx'}`}
          className="w-full rounded-xl px-4 py-3 text-sm font-mono outline-none resize-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        />

        {/* Session validation status */}
        {sessionValid !== null && (
          <div
            className="mt-3 flex flex-col gap-2 px-3 py-2 rounded-lg text-sm"
            style={{
              background: sessionValid.valid ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
              color: sessionValid.valid ? '#4ade80' : '#f87171',
            }}
          >
            <div className="flex items-center gap-2">
              {sessionValid.valid ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {sessionValid.valid ? 'Session is valid! Ready to sync.' : 'Session is invalid or expired. Check your cookie.'}
            </div>
            {!sessionValid.valid && sessionValid.debug && (
              <div className="mt-1 p-2 rounded bg-black/30 text-xs font-mono break-words whitespace-pre-wrap">
                {sessionValid.debug}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            id="validate-session"
            onClick={handleValidate}
            disabled={!clal || validating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)', color: 'var(--foreground-muted)' }}
          >
            <RefreshCw size={14} className={validating ? 'animate-spin' : ''} />
            {validating ? 'Checking…' : 'Test Connection'}
          </button>

          <button
            id="save-settings"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#f472b6)', color: '#fff' }}
          >
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Settings'}
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

import { useSyncExternalStore } from 'react';
import { sqlite } from './client';

/** Settings → "Foil animation", stored in sync_meta. When off, B50 cards keep a still foil. */
const KEY = 'foil_animation';
let cached: boolean | null = null;
const listeners = new Set<() => void>();

function read(): boolean {
  if (cached === null) {
    try {
      const row = sqlite.getFirstSync<{ value: string | null }>(`SELECT value FROM sync_meta WHERE key = ?`, [KEY]);
      cached = row?.value !== 'off';
    } catch {
      cached = true;
    }
  }
  return cached;
}

function setFoilAnimation(on: boolean) {
  cached = on;
  sqlite.runSync(
    `INSERT INTO sync_meta (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [KEY, on ? 'on' : 'off', Date.now()],
  );
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useFoilAnimation(): [boolean, (on: boolean) => void] {
  return [useSyncExternalStore(subscribe, read), setFoilAnimation];
}

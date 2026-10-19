'use client';
import { useState, useEffect, useCallback } from 'react';

interface SessionItem { id: number; songTitle: string; sheetType: string; sheetDifficulty: string; played: boolean; sortOrder: number; addedAt: string; }
interface TrackerList { id: number; name: string; emoji: string; color: string; sortOrder: number; }
interface TrackerItem { id: number; listId: number; songTitle: string; sheetType: string; sheetDifficulty: string; targetScore: string|null; notes: string|null; achievedAt: string|null; sortOrder: number; }
interface BoardData { lists: TrackerList[]; items: TrackerItem[]; session: SessionItem[]; }

export function useBoard() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/board');
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const act = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    try {
      await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      await refresh();
    } catch (e) {
      console.error(e);
    }
  }, [refresh]);

  return { data, loading, refresh, act };
}

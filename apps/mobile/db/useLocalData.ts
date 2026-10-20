import { useState, useEffect, useCallback } from 'react';
import { getCachedScores, getCachedRecentPlays, getLastSyncedAt, fullSync, getSongsCount } from './sync';
import { sqlite } from './client';
import type { SongRow } from './schema';
import {
  computeRating,
  normalizeTitle,
  type Song,
  type Score,
  type RatingData,
  type ScoreWithRating,
} from '@maimai-suite/core';

export interface LocalDataState {
  loading: boolean;
  syncing: boolean;
  lastSyncedAt: string | null;
  ratingData: (RatingData & { allScores: ScoreWithRating[] }) | null;
  recentPlays: ReturnType<typeof getCachedRecentPlays>;
  songsCount: number;
  triggerSync: () => Promise<void>;
  reload: () => void;
}

export function useLocalData(): LocalDataState {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [ratingData, setRatingData] = useState<(RatingData & { allScores: ScoreWithRating[] }) | null>(null);
  const [recentPlays, setRecentPlays] = useState<ReturnType<typeof getCachedRecentPlays>>([]);
  const [songsCount, setSongsCount] = useState(0);

  const loadLocal = useCallback(() => {
    try {
      const lastSync = getLastSyncedAt();
      setLastSyncedAt(lastSync);

      const rawScores = getCachedScores();
      const rawSongs = sqlite.getAllSync<SongRow>(`SELECT * FROM songs`);
      setSongsCount(rawSongs.length);

      const songMap = new Map<string, Song>();
      let maxVersion = 25000;

      for (const s of rawSongs) {
        const norm = normalizeTitle(s.title);
        const v = parseInt(s.version ?? '0', 10);
        if (!isNaN(v) && v > maxVersion) {
          maxVersion = v;
        }

        const songObj: Song = {
          title: s.title,
          artist: s.artist ?? '',
          catcode: s.catcode ?? '',
          version: s.version ?? '0',
          image_url: s.image_url ?? '',
          lev_mas: s.lev_mas ?? undefined,
          lev_mas_i: s.lev_mas_i ?? undefined,
          dx_lev_mas: s.dx_lev_mas ?? undefined,
          dx_lev_mas_i: s.dx_lev_mas_i ?? undefined,
          lev_exp: s.lev_exp ?? undefined,
          lev_exp_i: s.lev_exp_i ?? undefined,
          dx_lev_exp: s.dx_lev_exp ?? undefined,
          dx_lev_exp_i: s.dx_lev_exp_i ?? undefined,
          lev_adv: s.lev_adv ?? undefined,
          lev_adv_i: s.lev_adv_i ?? undefined,
          lev_bas: s.lev_bas ?? undefined,
          lev_bas_i: s.lev_bas_i ?? undefined,
          lev_remas: s.lev_remas ?? undefined,
          lev_remas_i: s.lev_remas_i ?? undefined,
          lev_utage: s.lev_utage ?? undefined,
        };
        songMap.set(norm, songObj);
      }

      const formattedScores: Score[] = rawScores.map(s => ({
        id: s.id,
        songTitle: s.song_title,
        difficulty: s.difficulty as any,
        songType: (s.song_type ?? 'DX') as any,
        achievement: s.achievement,
        dxScore: s.dx_score ?? undefined,
        fc: (s.fc as any) ?? null,
        fs: (s.fs as any) ?? null,
        playedAt: new Date(s.played_at),
      }));

      const computed = computeRating(formattedScores, songMap, maxVersion);
      setRatingData(computed);

      const recents = getCachedRecentPlays();
      setRecentPlays(recents);
    } catch (err) {
      console.error('Error loading local data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await fullSync();
      loadLocal();
    } catch (err) {
      console.error('Sync error:', err);
      throw err;
    } finally {
      setSyncing(false);
    }
  };

  return {
    loading,
    syncing,
    lastSyncedAt,
    ratingData,
    recentPlays,
    songsCount,
    triggerSync,
    reload: loadLocal,
  };
}

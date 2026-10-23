import { useState, useEffect, useCallback } from 'react';
import {
  getCachedScores,
  getCachedRecentPlays,
  getLastSyncedAt,
  fullSync,
  syncFromWebDb,
  getSongsCount,
  clusterSessionsFromPlayLog,
  getLastCreditInfo,
  getCachedProfile,
  type ClusteredSession,
  type LastCreditSummary,
  type PlayerProfileData,
} from './sync';
import { sqlite } from './client';
import type { SongRow, ScoreRow } from './schema';
import {
  computeChartSkillProfile,
  computePlayerSkillProfile,
  getRecommendations,
  type PlayerSkillProfile,
  type RecommendedTarget,
} from './recommend';
import {
  computeRating,
  normalizeTitle,
  detectCurrentVersion,
  getTargetSuggestions,
  type Song,
  type Score,
  type RatingData,
  type ScoreWithRating,
  type TargetSuggestion,
} from '@maimai-suite/core';

export interface LocalDataState {
  loading: boolean;
  syncing: boolean;
  segaOffline: boolean;
  lastSyncedAt: string | null;
  currentVersion: number;
  profile: PlayerProfileData | null;
  ratingData: (RatingData & { allScores: ScoreWithRating[] }) | null;
  targetSuggestions: TargetSuggestion[];
  recentPlays: ReturnType<typeof getCachedRecentPlays>;
  songsCount: number;
  clusteredSessions: ClusteredSession[];
  lastCredit: LastCreditSummary | null;
  playerSkillProfile: PlayerSkillProfile | null;
  rawSongs: SongRow[];
  rawScores: ScoreRow[];
  fetchRecommendations: (mode: 'push_skillset' | 'farm_rating') => RecommendedTarget[];
  triggerSync: () => Promise<{ segaDown: boolean }>;
  triggerWebDbSync: (forceSongs?: boolean) => Promise<void>;
  reload: () => void;
}

export function useLocalData(): LocalDataState {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [segaOffline, setSegaOffline] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number>(26500);
  const [profile, setProfile] = useState<PlayerProfileData | null>(null);
  const [ratingData, setRatingData] = useState<(RatingData & { allScores: ScoreWithRating[] }) | null>(null);
  const [targetSuggestions, setTargetSuggestions] = useState<TargetSuggestion[]>([]);
  const [recentPlays, setRecentPlays] = useState<ReturnType<typeof getCachedRecentPlays>>([]);
  const [songsCount, setSongsCount] = useState(0);
  const [clusteredSessions, setClusteredSessions] = useState<ClusteredSession[]>([]);
  const [lastCredit, setLastCredit] = useState<LastCreditSummary | null>(null);
  const [playerSkillProfile, setPlayerSkillProfile] = useState<PlayerSkillProfile | null>(null);
  const [rawSongs, setRawSongs] = useState<SongRow[]>([]);
  const [rawScores, setRawScores] = useState<ScoreRow[]>([]);

  const loadLocal = useCallback(() => {
    try {
      const lastSync = getLastSyncedAt();
      setLastSyncedAt(lastSync);

      const cachedScores = getCachedScores();
      const allScoreRows = sqlite.getAllSync<ScoreRow>(`SELECT * FROM scores`);
      setRawScores(allScoreRows);

      const songsList = sqlite.getAllSync<SongRow>(`SELECT * FROM songs`);
      setRawSongs(songsList);
      setSongsCount(songsList.length);

      const songRowMap = new Map<string, SongRow>();
      for (const s of songsList) {
        songRowMap.set(normalizeTitle(s.title), s);
      }

      // Compute player 6-axis skill profile
      const skillProfile = computePlayerSkillProfile(allScoreRows, songRowMap);
      setPlayerSkillProfile(skillProfile);

      // Detect game version: check sync_meta first, or detect from song DB with >= 20 count rule
      const versionMeta = sqlite.getFirstSync<{ value: string }>(
        `SELECT value FROM sync_meta WHERE key = 'current_version'`
      );
      const activeVersion = versionMeta?.value
        ? parseInt(versionMeta.value, 10)
        : detectCurrentVersion(songsList);
      setCurrentVersion(activeVersion);

      const songMap = new Map<string, Song>();

      for (const s of songsList) {
        const norm = normalizeTitle(s.title);
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
        const existing = songMap.get(norm);
        if (!existing || ((s.lev_mas_i || s.dx_lev_mas_i || s.lev_exp_i || s.dx_lev_exp_i) && !existing.lev_mas_i && !existing.dx_lev_mas_i)) {
          songMap.set(norm, songObj);
        }
      }

      const formattedScores: Score[] = cachedScores.map(s => ({
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

      const computed = computeRating(formattedScores, songMap, activeVersion);
      setRatingData(computed);

      const cachedProfile = getCachedProfile();
      setProfile(cachedProfile);

      if (computed?.allScores?.length) {
        const suggestions = getTargetSuggestions(computed, computed.allScores, 10);
        setTargetSuggestions(suggestions);
      } else {
        setTargetSuggestions([]);
      }

      const recents = getCachedRecentPlays();
      setRecentPlays(recents);

      // Auto session clustering
      const sessions = clusterSessionsFromPlayLog(recents);
      setClusteredSessions(sessions);

      // Last credit delta calculation
      const lastCred = getLastCreditInfo(recents, allScoreRows);
      setLastCredit(lastCred);
    } catch (err) {
      console.error('Error loading local data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  const fetchRecommendations = useCallback(
    (mode: 'push_skillset' | 'farm_rating') => {
      if (!playerSkillProfile) return [];
      const b50Floor =
        ratingData?.oldCharts && ratingData.oldCharts.length >= 35
          ? ratingData.oldCharts[ratingData.oldCharts.length - 1].rating
          : 280;
      return getRecommendations(mode, playerSkillProfile, rawScores, rawSongs, b50Floor);
    },
    [playerSkillProfile, rawScores, rawSongs, ratingData]
  );

  const triggerSync = async (): Promise<{ segaDown: boolean }> => {
    setSyncing(true);
    try {
      const res = await fullSync();
      setSegaOffline(!!res.segaDown);
      loadLocal();
      return { segaDown: !!res.segaDown };
    } catch (err) {
      console.error('Sync error:', err);
      throw err;
    } finally {
      setSyncing(false);
    }
  };

  const triggerWebDbSync = async (forceSongs: boolean = false): Promise<void> => {
    setSyncing(true);
    try {
      await syncFromWebDb(forceSongs);
      loadLocal();
    } catch (err) {
      console.error('Web DB sync error:', err);
      throw err;
    } finally {
      setSyncing(false);
    }
  };

  return {
    loading,
    syncing,
    segaOffline,
    lastSyncedAt,
    currentVersion,
    profile,
    ratingData,
    targetSuggestions,
    recentPlays,
    songsCount,
    clusteredSessions,
    lastCredit,
    playerSkillProfile,
    rawSongs,
    rawScores,
    fetchRecommendations,
    triggerSync,
    triggerWebDbSync,
    reload: loadLocal,
  };
}

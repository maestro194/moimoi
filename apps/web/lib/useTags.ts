'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  CombinedTagsPayload,
  UnifiedTag,
  PersonalTag,
  PersonalTagGroup,
} from './types';

// ── Difficulty normalizer (dxrating lowercase → moimoi uppercase) ──────────────
const DIFF_MAP: Record<string, string> = {
  basic: 'BAS', advanced: 'ADV', expert: 'EXP',
  master: 'MAS', remaster: 'REMAS', utage: 'UTAGE',
};
const TYPE_MAP: Record<string, string> = { dx: 'DX', std: 'STD' };

function normDiff(d: string) { return DIFF_MAP[d.toLowerCase()] ?? d.toUpperCase(); }
function normType(t: string) { return TYPE_MAP[t.toLowerCase()] ?? t.toUpperCase(); }

// ── Color fallback ────────────────────────────────────────────────────────────
const FALLBACK_COLOR = '#6b7280';

// ── Cache shared across hook instances ───────────────────────────────────────
let cachedData: CombinedTagsPayload | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes client-side
const listeners = new Set<() => void>();

function notifyListeners() { listeners.forEach(fn => fn()); }

async function loadTagData(): Promise<CombinedTagsPayload> {
  const now = Date.now();
  if (cachedData && now - cacheTime < CACHE_TTL_MS) return cachedData;

  const res = await fetch('/api/tags/combined');
  if (!res.ok) throw new Error(`Failed to load tags: ${res.status}`);
  cachedData = await res.json() as CombinedTagsPayload;
  cacheTime = Date.now();
  notifyListeners();
  return cachedData;
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useTags() {
  const [data, setData] = useState<CombinedTagsPayload | null>(cachedData);
  const [isLoading, setIsLoading] = useState(cachedData === null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // Subscribe to cache updates
    const update = () => { if (mountedRef.current) setData(cachedData); };
    listeners.add(update);

    // Load data if not cached
    if (!cachedData || Date.now() - cacheTime >= CACHE_TTL_MS) {
      setIsLoading(true);
      loadTagData()
        .then(d => { if (mountedRef.current) { setData(d); setError(null); } })
        .catch(e => { if (mountedRef.current) setError(String(e)); })
        .finally(() => { if (mountedRef.current) setIsLoading(false); });
    }

    return () => { mountedRef.current = false; listeners.delete(update); };
  }, []);

  // ── Invalidate cache and refetch ──────────────────────────────────────────
  const mutate = useCallback(() => {
    cachedData = null;
    cacheTime = 0;
    setIsLoading(true);
    loadTagData()
      .then(d => { setData(d); setError(null); })
      .catch(e => setError(String(e)))
      .finally(() => setIsLoading(false));
  }, []);

  // ── Build unified tags list from both sources ─────────────────────────────
  const getAllUnifiedTags = useCallback((): UnifiedTag[] => {
    if (!data) return [];
    const unified: UnifiedTag[] = [];

    // Community tags
    for (const ct of data.community.tags) {
      const group = data.community.tagGroups.find(g => g.id === ct.group_id);
      unified.push({
        key: `c:${ct.id}`,
        name: ct.localized_name['en'] ?? ct.localized_name[Object.keys(ct.localized_name)[0]] ?? `Tag ${ct.id}`,
        description: ct.localized_description['en'] ?? undefined,
        color: group?.color ?? FALLBACK_COLOR,
        groupName: group?.localized_name['en'] ?? group?.localized_name[Object.keys(group?.localized_name ?? {})[0]] ?? 'Community',
        groupId: ct.group_id,
        source: 'community',
      });
    }

    // Personal tags
    for (const pt of data.personal.tags) {
      const group = data.personal.tagGroups.find(g => g.id === pt.groupId);
      unified.push({
        key: `p:${pt.id}`,
        name: pt.name,
        description: pt.description ?? undefined,
        color: group?.color ?? FALLBACK_COLOR,
        groupName: group?.name ?? 'Personal',
        groupId: pt.groupId ?? null,
        source: 'personal',
      });
    }

    return unified;
  }, [data]);

  // ── Get tags for a specific chart ─────────────────────────────────────────
  const getTagsForChart = useCallback((
    songTitle: string,
    type: 'DX' | 'STD',
    diff: string,
  ): UnifiedTag[] => {
    if (!data) return [];
    const allUnified = getAllUnifiedTags();
    const result: UnifiedTag[] = [];

    // Community: normalize lowercase keys before comparing
    for (const ts of data.community.tagSongs) {
      if (
        ts.song_id === songTitle &&
        normType(ts.sheet_type) === type &&
        normDiff(ts.sheet_difficulty) === diff
      ) {
        const unified = allUnified.find(u => u.key === `c:${ts.tag_id}`);
        if (unified) result.push(unified);
      }
    }

    // Personal
    for (const ts of data.personal.tagSongs) {
      if (
        ts.songTitle === songTitle &&
        ts.sheetType === type &&
        ts.sheetDifficulty === diff
      ) {
        const unified = allUnified.find(u => u.key === `p:${ts.tagId}`);
        if (unified) result.push(unified);
      }
    }

    return result;
  }, [data, getAllUnifiedTags]);

  // ── Get tags for all charts of a song (for row-level display) ────────────
  const getTagsForSong = useCallback((songTitle: string): UnifiedTag[] => {
    if (!data) return [];
    const allUnified = getAllUnifiedTags();
    const seen = new Set<string>();
    const result: UnifiedTag[] = [];

    for (const ts of data.community.tagSongs) {
      if (ts.song_id === songTitle) {
        const key = `c:${ts.tag_id}`;
        if (!seen.has(key)) {
          seen.add(key);
          const unified = allUnified.find(u => u.key === key);
          if (unified) result.push(unified);
        }
      }
    }
    for (const ts of data.personal.tagSongs) {
      if (ts.songTitle === songTitle) {
        const key = `p:${ts.tagId}`;
        if (!seen.has(key)) {
          seen.add(key);
          const unified = allUnified.find(u => u.key === key);
          if (unified) result.push(unified);
        }
      }
    }

    return result;
  }, [data, getAllUnifiedTags]);

  // ── Count how many charts have a given tag key (across all songs passed) ──
  const getTagSongCount = useCallback((tagKey: string, songTitles?: string[]): number => {
    if (!data) return 0;
    const [src, idStr] = tagKey.split(':');
    const id = parseInt(idStr);

    if (src === 'c') {
      return data.community.tagSongs.filter(ts =>
        ts.tag_id === id && (songTitles ? songTitles.includes(ts.song_id) : true)
      ).length;
    }
    return data.personal.tagSongs.filter(ts =>
      ts.tagId === id && (songTitles ? songTitles.includes(ts.songTitle) : true)
    ).length;
  }, [data]);

  // ── Check if a song has any of the given tag keys ─────────────────────────
  const songHasAnyTag = useCallback((songTitle: string, tagKeys: string[]): boolean => {
    if (!data || tagKeys.length === 0) return false;
    for (const key of tagKeys) {
      const [src, idStr] = key.split(':');
      const id = parseInt(idStr);
      if (src === 'c') {
        if (data.community.tagSongs.some(ts => ts.song_id === songTitle && ts.tag_id === id)) return true;
      } else {
        if (data.personal.tagSongs.some(ts => ts.songTitle === songTitle && ts.tagId === id)) return true;
      }
    }
    return false;
  }, [data]);

  // ── Check if a specific chart has any of the given tag keys ───────────────
  const chartHasAnyTag = useCallback((
    songTitle: string, type: 'DX' | 'STD', diff: string, tagKeys: string[],
  ): boolean => {
    if (!data || tagKeys.length === 0) return false;
    for (const key of tagKeys) {
      const [src, idStr] = key.split(':');
      const id = parseInt(idStr);
      if (src === 'c') {
        if (data.community.tagSongs.some(ts =>
          ts.song_id === songTitle &&
          normType(ts.sheet_type) === type &&
          normDiff(ts.sheet_difficulty) === diff &&
          ts.tag_id === id
        )) return true;
      } else {
        if (data.personal.tagSongs.some(ts =>
          ts.songTitle === songTitle &&
          ts.sheetType === type &&
          ts.sheetDifficulty === diff &&
          ts.tagId === id
        )) return true;
      }
    }
    return false;
  }, [data]);

  // ── Count tags for a specific chart ──────────────────────────────────────
  const getChartTagCount = useCallback((
    songTitle: string, type: 'DX' | 'STD', diff: string,
  ): number => {
    if (!data) return 0;
    const comm = data.community.tagSongs.filter(ts =>
      ts.song_id === songTitle &&
      normType(ts.sheet_type) === type &&
      normDiff(ts.sheet_difficulty) === diff
    ).length;
    const pers = data.personal.tagSongs.filter(ts =>
      ts.songTitle === songTitle && ts.sheetType === type && ts.sheetDifficulty === diff
    ).length;
    return comm + pers;
  }, [data]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const attachPersonalTag = useCallback(async (
    tagId: number, songTitle: string, sheetType: string, sheetDifficulty: string,
  ) => {
    const res = await fetch('/api/tags/attach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId, songTitle, sheetType, sheetDifficulty }),
    });
    if (!res.ok) throw new Error('Failed to attach tag');

    // Optimistically update cache
    if (cachedData) {
      const already = cachedData.personal.tagSongs.some(
        ts => ts.tagId === tagId && ts.songTitle === songTitle &&
              ts.sheetType === sheetType && ts.sheetDifficulty === sheetDifficulty
      );
      if (!already) {
        cachedData = {
          ...cachedData,
          personal: {
            ...cachedData.personal,
            tagSongs: [...cachedData.personal.tagSongs, { id: Date.now(), tagId, songTitle, sheetType, sheetDifficulty }],
          },
        };
        notifyListeners();
      }
    }
  }, []);

  const detachPersonalTag = useCallback(async (
    tagId: number, songTitle: string, sheetType: string, sheetDifficulty: string,
  ) => {
    const res = await fetch('/api/tags/attach', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId, songTitle, sheetType, sheetDifficulty }),
    });
    if (!res.ok) throw new Error('Failed to detach tag');

    // Optimistically update cache
    if (cachedData) {
      cachedData = {
        ...cachedData,
        personal: {
          ...cachedData.personal,
          tagSongs: cachedData.personal.tagSongs.filter(
            ts => !(ts.tagId === tagId && ts.songTitle === songTitle &&
                    ts.sheetType === sheetType && ts.sheetDifficulty === sheetDifficulty)
          ),
        },
      };
      notifyListeners();
    }
  }, []);

  const createTag = useCallback(async (
    name: string, description?: string, groupId?: number,
  ): Promise<PersonalTag> => {
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, groupId }),
    });
    if (!res.ok) throw new Error('Failed to create tag');
    const newTag = await res.json() as PersonalTag;

    // Add to cache
    if (cachedData) {
      cachedData = {
        ...cachedData,
        personal: { ...cachedData.personal, tags: [...cachedData.personal.tags, newTag] },
      };
      notifyListeners();
    }
    return newTag;
  }, []);

  const createTagGroup = useCallback(async (
    name: string, color: string,
  ): Promise<PersonalTagGroup> => {
    const res = await fetch('/api/tags/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) throw new Error('Failed to create tag group');
    const newGroup = await res.json() as PersonalTagGroup;

    // Add to cache
    if (cachedData) {
      cachedData = {
        ...cachedData,
        personal: { ...cachedData.personal, tagGroups: [...cachedData.personal.tagGroups, newGroup] },
      };
      notifyListeners();
    }
    return newGroup;
  }, []);

  return {
    tagsData: data,
    isLoading,
    error,
    mutate,
    getAllUnifiedTags,
    getTagsForChart,
    getTagsForSong,
    getTagSongCount,
    songHasAnyTag,
    chartHasAnyTag,
    getChartTagCount,
    attachPersonalTag,
    detachPersonalTag,
    createTag,
    createTagGroup,
  };
}

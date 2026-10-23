import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLocalData } from '../../db/useLocalData';
import { COLORS, getDifficultyColor, getRankBadge, formatAchievement } from '../../constants/Theme';
import {
  Search,
  ArrowUpDown,
  Music2,
  X,
  Filter,
  Disc,
} from 'lucide-react-native';
import { versionLabel, normalizeTitle } from '@maimai-suite/core';
import type { SongRow, ScoreRow } from '../../db/schema';

type CategoryKey = 'all' | 'anime' | 'niconico&vocaloid' | 'toho' | 'game&variety' | 'maimai' | 'original&joypolis';
type LevelFilterKey = 'ALL' | '14+' | '14' | '13+' | '13' | '12+' | '12' | '<=11';
type StatusFilter = 'ALL' | 'PLAYED' | 'UNPLAYED';
type SortKey = 'level_desc' | 'level_asc' | 'title' | 'bpm' | 'newest';

const CATEGORIES: Array<{ key: CategoryKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'anime', label: 'POPS & Anime' },
  { key: 'niconico&vocaloid', label: 'niconico' },
  { key: 'toho', label: 'Touhou' },
  { key: 'game&variety', label: 'Variety' },
  { key: 'maimai', label: 'maimai' },
  { key: 'original&joypolis', label: 'Ongeki/Chuni' },
];

const LEVEL_FILTERS: LevelFilterKey[] = ['ALL', '14+', '14', '13+', '13', '12+', '12', '<=11'];

interface SongWithScores {
  song: SongRow;
  maxLevel: number;
  scoresByDiff: Map<string, ScoreRow>;
}

export default function SongsScreen() {
  const router = useRouter();
  const { loading, rawSongs, rawScores } = useLocalData();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<CategoryKey>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilterKey>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortKey>('level_desc');

  // Map of scores: key is normalizedTitle::diff::type
  const userScoresMap = useMemo(() => {
    const map = new Map<string, ScoreRow>();
    for (const sc of rawScores) {
      const key = `${normalizeTitle(sc.song_title)}::${sc.difficulty}::${sc.song_type ?? 'DX'}`;
      const existing = map.get(key);
      if (!existing || sc.achievement > existing.achievement) {
        map.set(key, sc);
      }
    }
    return map;
  }, [rawScores]);

  // Combine songs with user's scores and compute highest chart level
  const preparedSongs = useMemo(() => {
    return rawSongs.map((song): SongWithScores => {
      const norm = normalizeTitle(song.title);
      const scoresByDiff = new Map<string, ScoreRow>();

      const diffs = ['EXP', 'MAS', 'REMAS'];
      for (const d of diffs) {
        const dxScore = userScoresMap.get(`${norm}::${d}::DX`);
        if (dxScore) scoresByDiff.set(`${d}::DX`, dxScore);
        const stdScore = userScoresMap.get(`${norm}::${d}::STD`);
        if (stdScore) scoresByDiff.set(`${d}::STD`, stdScore);
      }

      // Determine highest internal constant for sorting
      const levels = [
        parseFloat(song.lev_remas_i || '0'),
        parseFloat(song.dx_lev_mas_i || song.lev_mas_i || '0'),
        parseFloat(song.dx_lev_exp_i || song.lev_exp_i || '0'),
      ].filter(n => !isNaN(n) && n > 0);

      const maxLevel = levels.length ? Math.max(...levels) : 0;

      return {
        song,
        maxLevel,
        scoresByDiff,
      };
    });
  }, [rawSongs, userScoresMap]);

  // Filter and sort songs
  const filteredSongs = useMemo(() => {
    let result = preparedSongs;

    // Category filter
    if (selectedCat !== 'all') {
      result = result.filter(item => {
        const cat = (item.song.catcode || '').toLowerCase();
        if (selectedCat === 'original&joypolis') {
          return cat === 'original&joypolis' || cat === 'on_geki';
        }
        return cat === selectedCat;
      });
    }

    // Search query (title, artist, kana)
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(item => {
        const s = item.song;
        return (
          s.title.toLowerCase().includes(q) ||
          (s.artist && s.artist.toLowerCase().includes(q)) ||
          (s.title_kana && s.title_kana.toLowerCase().includes(q))
        );
      });
    }

    // Level range filter
    if (levelFilter !== 'ALL') {
      result = result.filter(item => {
        const lv = item.maxLevel;
        switch (levelFilter) {
          case '14+': return lv >= 14.5;
          case '14':  return lv >= 14.0 && lv < 14.5;
          case '13+': return lv >= 13.5 && lv < 14.0;
          case '13':  return lv >= 13.0 && lv < 13.5;
          case '12+': return lv >= 12.5 && lv < 13.0;
          case '12':  return lv >= 12.0 && lv < 12.5;
          case '<=11': return lv > 0 && lv < 12.0;
          default: return true;
        }
      });
    }

    // Play status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(item => {
        const hasPlay = item.scoresByDiff.size > 0;
        return statusFilter === 'PLAYED' ? hasPlay : !hasPlay;
      });
    }

    // Sort order
    result.sort((a, b) => {
      switch (sortBy) {
        case 'level_desc':
          return b.maxLevel - a.maxLevel;
        case 'level_asc':
          return a.maxLevel - b.maxLevel;
        case 'title':
          return a.song.title.localeCompare(b.song.title);
        case 'bpm':
          return (parseInt(b.song.bpm || '0', 10) || 0) - (parseInt(a.song.bpm || '0', 10) || 0);
        case 'newest':
          return (parseInt(b.song.version || '0', 10) || 0) - (parseInt(a.song.version || '0', 10) || 0);
        default:
          return b.maxLevel - a.maxLevel;
      }
    });

    return result;
  }, [preparedSongs, selectedCat, search, levelFilter, statusFilter, sortBy]);

  const openChartModal = useCallback((
    song: SongRow,
    diff: string,
    type: 'DX' | 'STD',
    internalLvStr?: string | null,
    displayLvStr?: string | null,
    userScore?: ScoreRow
  ) => {
    const internalLevel = parseFloat(internalLvStr || '0');
    router.push({
      pathname: '/modal',
      params: {
        title: song.title,
        difficulty: diff,
        songType: type,
        achievement: String(userScore?.achievement ?? 0),
        internalLevel: String(internalLevel),
        rating: '0',
        fc: userScore?.fc ?? '',
        fs: userScore?.fs ?? '',
        artist: song.artist ?? '',
        imageUrl: song.image_url ?? '',
      },
    });
  }, [router]);

  const renderSongItem = useCallback(({ item }: { item: SongWithScores }) => {
    const { song, scoresByDiff } = item;
    const vName = versionLabel(song.version);

    // Collect available difficulty charts for this song
    interface DiffBadgeData {
      diff: 'EXP' | 'MAS' | 'REMAS';
      type: 'DX' | 'STD';
      internal: string | null;
      display: string | null;
      score?: ScoreRow;
    }

    const availableDiffs: DiffBadgeData[] = [];

    // Check DX first
    if (song.dx_lev_mas_i || song.dx_lev_mas) {
      availableDiffs.push({
        diff: 'EXP',
        type: 'DX',
        internal: song.dx_lev_exp_i,
        display: song.dx_lev_exp,
        score: scoresByDiff.get('EXP::DX'),
      });
      availableDiffs.push({
        diff: 'MAS',
        type: 'DX',
        internal: song.dx_lev_mas_i,
        display: song.dx_lev_mas,
        score: scoresByDiff.get('MAS::DX'),
      });
      if (song.lev_remas_i || song.lev_remas) {
        availableDiffs.push({
          diff: 'REMAS',
          type: 'DX',
          internal: song.lev_remas_i,
          display: song.lev_remas,
          score: scoresByDiff.get('REMAS::DX'),
        });
      }
    } else {
      // Standard charts
      if (song.lev_exp_i || song.lev_exp) {
        availableDiffs.push({
          diff: 'EXP',
          type: 'STD',
          internal: song.lev_exp_i,
          display: song.lev_exp,
          score: scoresByDiff.get('EXP::STD'),
        });
      }
      if (song.lev_mas_i || song.lev_mas) {
        availableDiffs.push({
          diff: 'MAS',
          type: 'STD',
          internal: song.lev_mas_i,
          display: song.lev_mas,
          score: scoresByDiff.get('MAS::STD'),
        });
      }
      if (song.lev_remas_i || song.lev_remas) {
        availableDiffs.push({
          diff: 'REMAS',
          type: 'STD',
          internal: song.lev_remas_i,
          display: song.lev_remas,
          score: scoresByDiff.get('REMAS::STD'),
        });
      }
    }

    const isDxSong = !!(song.dx_lev_mas_i || song.dx_lev_mas);

    return (
      <View style={styles.songCard}>
        {/* Top Section: Jacket + Info */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => {
            const first = availableDiffs[availableDiffs.length - 1] || availableDiffs[0];
            if (first) {
              openChartModal(song, first.diff, first.type, first.internal, first.display, first.score);
            }
          }}
        >
          <View style={styles.jacketBox}>
            {song.image_url ? (
              <Image
                source={{ uri: `https://maimaidx-eng.com/maimai-mobile/img/Music/${song.image_url}` }}
                style={styles.jacketImage}
              />
            ) : (
              <View style={styles.jacketFallback}>
                <Music2 size={20} color={COLORS.purpleLight} />
              </View>
            )}
            <View style={[styles.typePill, isDxSong ? styles.typeDx : styles.typeStd]}>
              <Text style={styles.typePillText}>{isDxSong ? 'DX' : 'STD'}</Text>
            </View>
          </View>

          <View style={styles.songMeta}>
            <Text style={styles.songTitleText} numberOfLines={1}>
              {song.title}
            </Text>
            <Text style={styles.songArtistText} numberOfLines={1}>
              {song.artist || 'Unknown Artist'}
            </Text>

            <View style={styles.tagPillRow}>
              {song.bpm ? (
                <View style={styles.bpmPill}>
                  <Text style={styles.bpmText}>BPM {song.bpm}</Text>
                </View>
              ) : null}
              <View style={styles.versionPill}>
                <Text style={styles.versionText}>{vName}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Bottom Section: Difficulty Chips */}
        <View style={styles.diffChipsContainer}>
          {availableDiffs.map(d => {
            const color = getDifficultyColor(d.diff);
            const levelVal = d.internal ? parseFloat(d.internal).toFixed(1) : (d.display || '?');
            const hasScore = !!d.score;
            const rank = hasScore ? getRankBadge(d.score!.achievement) : null;

            return (
              <TouchableOpacity
                key={`${d.diff}-${d.type}`}
                style={[
                  styles.diffChipItem,
                  { borderColor: color + '60', backgroundColor: hasScore ? color + '15' : COLORS.surfaceLight },
                ]}
                onPress={() => openChartModal(song, d.diff, d.type, d.internal, d.display, d.score)}
              >
                <View style={[styles.diffTagMini, { backgroundColor: color }]}>
                  <Text style={styles.diffTagMiniText}>{d.diff === 'REMAS' ? 'Re:M' : d.diff}</Text>
                </View>

                <Text style={[styles.levelConstantText, { color }]}>{levelVal}</Text>

                {hasScore ? (
                  <View style={styles.chipScoreInfo}>
                    <View style={[styles.rankBadgeMini, { backgroundColor: rank?.bg }]}>
                      <Text style={[styles.rankBadgeMiniText, { color: rank?.color }]}>{rank?.label}</Text>
                    </View>
                    <Text style={styles.chipAchText}>{d.score!.achievement.toFixed(2)}%</Text>
                  </View>
                ) : (
                  <Text style={styles.chipUnplayedText}>--</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }, [openChartModal]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.purpleLight} />
        <Text style={styles.loadingText}>Loading canonical song database…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <Search size={16} color={COLORS.textSubtle} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search 1,559 songs by title, artist, or kana…"
          placeholderTextColor={COLORS.textSubtle}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color={COLORS.textSubtle} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Horizontal Scroll */}
      <View style={styles.catScrollWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.catList}
          renderItem={({ item }) => {
            const isActive = selectedCat === item.key;
            return (
              <TouchableOpacity
                style={[styles.catTab, isActive && styles.catTabActive]}
                onPress={() => setSelectedCat(item.key)}
              >
                <Text style={[styles.catTabText, isActive && styles.catTabTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Level Filters Bar */}
      <View style={styles.filterBarWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={LEVEL_FILTERS}
          keyExtractor={item => item}
          contentContainerStyle={styles.levelFilterList}
          renderItem={({ item }) => {
            const isActive = levelFilter === item;
            return (
              <TouchableOpacity
                style={[styles.levelChip, isActive && styles.levelChipActive]}
                onPress={() => setLevelFilter(item)}
              >
                <Text style={[styles.levelChipText, isActive && styles.levelChipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Controls Row: Status & Sort */}
      <View style={styles.controlsRow}>
        <View style={styles.statusButtonGroup}>
          {(['ALL', 'PLAYED', 'UNPLAYED'] as const).map(st => {
            const isActive = statusFilter === st;
            return (
              <TouchableOpacity
                key={st}
                style={[styles.statusBtn, isActive && styles.statusBtnActive]}
                onPress={() => setStatusFilter(st)}
              >
                <Text style={[styles.statusBtnText, isActive && styles.statusBtnTextActive]}>
                  {st === 'ALL' ? 'All' : st === 'PLAYED' ? 'Played' : 'Unplayed'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sort selector */}
        <View style={styles.sortContainer}>
          <ArrowUpDown size={12} color={COLORS.textSubtle} />
          {(['level_desc', 'title', 'newest'] as const).map(s => {
            const isActive = sortBy === s;
            const label = s === 'level_desc' ? 'Level' : s === 'title' ? 'Title' : 'New';
            return (
              <TouchableOpacity
                key={s}
                style={[styles.sortPill, isActive && styles.sortPillActive]}
                onPress={() => setSortBy(s)}
              >
                <Text style={[styles.sortPillText, isActive && styles.sortPillTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Results Count Banner */}
      <View style={styles.countBanner}>
        <Text style={styles.countText}>
          Showing {filteredSongs.length} of {rawSongs.length} songs
        </Text>
      </View>

      {/* Song Virtualized List */}
      <FlatList
        data={filteredSongs}
        keyExtractor={item => String(item.song.id || item.song.title)}
        renderItem={renderSongItem}
        contentContainerStyle={styles.listContent}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={7}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Disc size={36} color={COLORS.textSubtle} />
            <Text style={styles.emptyTitle}>No songs found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search query or filters.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },
  catScrollWrapper: {
    marginBottom: 6,
  },
  catList: {
    paddingHorizontal: 16,
    gap: 6,
  },
  catTab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catTabActive: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purpleLight,
  },
  catTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  catTabTextActive: {
    color: '#fff',
  },
  filterBarWrapper: {
    marginBottom: 8,
  },
  levelFilterList: {
    paddingHorizontal: 16,
    gap: 6,
  },
  levelChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  levelChipActive: {
    backgroundColor: 'rgba(192, 132, 252, 0.25)',
    borderColor: COLORS.purpleLight,
  },
  levelChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  levelChipTextActive: {
    color: COLORS.purpleLight,
    fontWeight: '800',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  statusButtonGroup: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  statusBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBtnActive: {
    backgroundColor: COLORS.purple,
  },
  statusBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  statusBtnTextActive: {
    color: '#fff',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceLight,
  },
  sortPillActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
  },
  sortPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  sortPillTextActive: {
    color: COLORS.cyan,
    fontWeight: '800',
  },
  countBanner: {
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  countText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSubtle,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  songCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 10,
    padding: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  jacketBox: {
    width: 50,
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  jacketImage: {
    width: '100%',
    height: '100%',
  },
  jacketFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typePill: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  typeDx: {
    backgroundColor: '#f59e0b',
  },
  typeStd: {
    backgroundColor: '#3b82f6',
  },
  typePillText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#000',
  },
  songMeta: {
    flex: 1,
    marginLeft: 10,
  },
  songTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  songArtistText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  tagPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bpmPill: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  bpmText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textSubtle,
  },
  versionPill: {
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  versionText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.purpleLight,
  },
  diffChipsContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  diffChipItem: {
    flex: 1,
    minWidth: 85,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  diffTagMini: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  diffTagMiniText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#000',
  },
  levelConstantText: {
    fontSize: 11,
    fontWeight: '800',
    marginHorizontal: 3,
  },
  chipScoreInfo: {
    alignItems: 'flex-end',
  },
  rankBadgeMini: {
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    borderRadius: 3,
  },
  rankBadgeMiniText: {
    fontSize: 7,
    fontWeight: '900',
  },
  chipAchText: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  chipUnplayedText: {
    fontSize: 9,
    color: COLORS.textSubtle,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 10,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 11,
    color: COLORS.textSubtle,
  },
});

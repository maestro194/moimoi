import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLocalData } from '../../db/useLocalData';
import { COLORS, DIFF_COLOR, getDifficultyColor, getRankBadge, formatAchievement } from '../../constants/Theme';
import {
  Search,
  ArrowUpDown,
  Music2,
  X,
  LayoutGrid,
  List as ListIcon,
  BarChart2,
  Trophy,
} from 'lucide-react-native';
import type { ScoreWithRating, Difficulty } from '@maimai-suite/core';

type PoolFilter = 'all' | 'new' | 'old';
type DiffFilter = 'ALL' | 'EXP' | 'MAS' | 'REMAS' | 'UTAGE';
type SortOption = 'rating' | 'achievement' | 'level';
type ViewMode = 'grid' | 'list' | 'matrix';

export default function ScoresScreen() {
  const router = useRouter();
  const { loading, ratingData, rawSongs } = useLocalData();

  const [search, setSearch] = useState('');
  const [poolFilter, setPoolFilter] = useState<PoolFilter>('all');
  const [diffFilter, setDiffFilter] = useState<DiffFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Matrix-specific filters
  const [matrixRange, setMatrixRange] = useState<'14+' | '14' | '13+' | 'all'>('14+');
  const [hideUnplayed, setHideUnplayed] = useState(false);

  const allScores = useMemo(() => {
    return ratingData?.allScores ?? [];
  }, [ratingData]);

  const filteredScores = useMemo(() => {
    let list = [...allScores];

    if (poolFilter === 'new') {
      list = list.filter(s => s.pool === 'new');
    } else if (poolFilter === 'old') {
      list = list.filter(s => s.pool === 'old');
    }

    if (diffFilter !== 'ALL') {
      list = list.filter(s => s.difficulty.toUpperCase() === diffFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        s =>
          s.songTitle.toLowerCase().includes(q) ||
          (s.song?.artist && s.song.artist.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'achievement') {
        const achA = typeof a.achievement === 'string' ? parseFloat(a.achievement) : a.achievement;
        const achB = typeof b.achievement === 'string' ? parseFloat(b.achievement) : b.achievement;
        return achB - achA;
      }
      if (sortBy === 'level') return b.internalLevel - a.internalLevel;
      return a.songTitle.localeCompare(b.songTitle);
    });

    return list;
  }, [allScores, poolFilter, diffFilter, search, sortBy]);

  // Index the player's true B15 (top 15 new) and B35 (top 35 old) charts by composite key
  const { b15Set, b35Set, b15RankMap, b35RankMap } = useMemo(() => {
    const b15 = ratingData?.newCharts ?? [];
    const b35 = ratingData?.oldCharts ?? [];

    const b15S = new Set<string>();
    const b35S = new Set<string>();
    const b15R = new Map<string, number>();
    const b35R = new Map<string, number>();

    const getKey = (s: { songTitle: string; difficulty: string; songType?: string }) =>
      `${s.songTitle}::${s.difficulty}::${s.songType ?? 'DX'}`;

    b15.forEach((s, idx) => {
      const key = getKey(s);
      b15S.add(key);
      b15R.set(key, idx + 1);
    });

    b35.forEach((s, idx) => {
      const key = getKey(s);
      b35S.add(key);
      b35R.set(key, idx + 1);
    });

    return { b15Set: b15S, b35Set: b35S, b15RankMap: b15R, b35RankMap: b35R };
  }, [ratingData]);

  // Group filtered scores into New B15, Old B35, New Remaining, Old Remaining
  const { newB15, oldB35, newRemaining, oldRemaining } = useMemo(() => {
    const getKey = (s: { songTitle: string; difficulty: string; songType?: string }) =>
      `${s.songTitle}::${s.difficulty}::${s.songType ?? 'DX'}`;

    const newSongs = filteredScores.filter(s => s.pool === 'new' && (s.difficulty as string) !== 'UTAGE');
    const oldSongs = filteredScores.filter(s => s.pool === 'old' && (s.difficulty as string) !== 'UTAGE');

    return {
      newB15: newSongs.filter(s => b15Set.has(getKey(s))),
      oldB35: oldSongs.filter(s => b35Set.has(getKey(s))),
      newRemaining: newSongs.filter(s => !b15Set.has(getKey(s))),
      oldRemaining: oldSongs.filter(s => !b35Set.has(getKey(s))),
    };
  }, [filteredScores, b15Set, b35Set]);

  const newB15Sum = newB15.reduce((acc, s) => acc + s.rating, 0);
  const oldB35Sum = oldB35.reduce((acc, s) => acc + s.rating, 0);

  // Matrix calculations
  const matrixData = useMemo(() => {
    if (viewMode !== 'matrix' || !rawSongs.length) return [];

    let minLv = 14.5;
    let maxLv = 15.0;
    if (matrixRange === '14+') {
      minLv = 14.5;
      maxLv = 15.0;
    } else if (matrixRange === '14') {
      minLv = 14.0;
      maxLv = 14.4;
    } else if (matrixRange === '13+') {
      minLv = 13.5;
      maxLv = 13.9;
    } else {
      minLv = 13.0;
      maxLv = 15.0;
    }

    const scoreMap = new Map<string, ScoreWithRating>();
    for (const s of allScores) {
      scoreMap.set(`${s.songTitle}::${s.difficulty}::${s.songType ?? 'DX'}`, s);
    }

    // Extract all chart instances from songs
    interface ChartItem {
      title: string;
      difficulty: string;
      type: 'DX' | 'STD';
      level: number;
      imageUrl: string;
      score?: ScoreWithRating;
    }

    const chartsByLevel = new Map<number, ChartItem[]>();

    for (const song of rawSongs) {
      const diffs: Array<{ key: string; diff: string; type: 'DX' | 'STD'; img: string }> = [
        { key: song.dx_lev_mas_i || song.lev_mas_i || '', diff: 'MAS', type: song.dx_lev_mas_i ? 'DX' : 'STD', img: song.image_url || '' },
        { key: song.lev_remas_i || '', diff: 'REMAS', type: 'DX', img: song.image_url || '' },
        { key: song.dx_lev_exp_i || song.lev_exp_i || '', diff: 'EXP', type: song.dx_lev_exp_i ? 'DX' : 'STD', img: song.image_url || '' },
      ];

      for (const d of diffs) {
        if (!d.key) continue;
        const lv = parseFloat(d.key);
        if (isNaN(lv) || lv < minLv || lv > maxLv) continue;

        const rounded = Math.round(lv * 10) / 10;
        const score = scoreMap.get(`${song.title}::${d.diff}::${d.type}`);
        if (hideUnplayed && !score) continue;

        if (!chartsByLevel.has(rounded)) {
          chartsByLevel.set(rounded, []);
        }
        chartsByLevel.get(rounded)!.push({
          title: song.title,
          difficulty: d.diff,
          type: d.type,
          level: lv,
          imageUrl: d.img,
          score,
        });
      }
    }

    const sortedLevels = Array.from(chartsByLevel.keys()).sort((a, b) => b - a);

    return sortedLevels.map(level => {
      const charts = chartsByLevel.get(level)!;
      charts.sort((a, b) => (b.score?.achievement ?? 0) - (a.score?.achievement ?? 0));
      return { level, charts };
    });
  }, [viewMode, matrixRange, hideUnplayed, rawSongs, allScores]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.purpleLight} />
        <Text style={styles.loadingText}>Loading scores…</Text>
      </View>
    );
  }

  const navigateToModal = (item: ScoreWithRating | any) => {
    router.push({
      pathname: '/modal',
      params: {
        title: item.songTitle || item.title,
        difficulty: item.difficulty,
        achievement: String(item.achievement ?? item.score?.achievement ?? 0),
        internalLevel: String(item.internalLevel ?? item.level ?? 0),
        rating: String(item.rating ?? item.score?.rating ?? 0),
        songType: item.songType ?? item.type ?? 'DX',
        fc: item.fc ?? item.score?.fc ?? '',
        fs: item.fs ?? item.score?.fs ?? '',
        artist: item.song?.artist ?? '',
        imageUrl: item.song?.image_url ?? item.imageUrl ?? '',
      },
    });
  };

  const renderScoreCard = (item: ScoreWithRating, index: number) => {
    const diffColor = getDifficultyColor(item.difficulty);
    const achNum = typeof item.achievement === 'string' ? parseFloat(item.achievement) : item.achievement;
    const rankInfo = getRankBadge(achNum);
    const chartKey = `${item.songTitle}::${item.difficulty}::${item.songType ?? 'DX'}`;
    const b15Rank = b15RankMap.get(chartKey);
    const b35Rank = b35RankMap.get(chartKey);

    if (viewMode === 'grid') {
      return (
        <TouchableOpacity
          key={`${item.songTitle}-${item.difficulty}-${item.id}-${index}`}
          style={styles.gridCard}
          onPress={() => navigateToModal(item)}
        >
          <View style={[styles.gridJacketWrapper, { borderColor: diffColor }]}>
            {item.song?.image_url ? (
              <Image
                source={{ uri: `https://maimaidx-eng.com/maimai-mobile/img/Music/${item.song.image_url}` }}
                style={styles.gridJacketImg}
              />
            ) : (
              <View style={[styles.gridJacketFallback, { backgroundColor: diffColor + '20' }]}>
                <Music2 size={24} color={diffColor} />
              </View>
            )}
            <View style={[styles.gridDiffBadge, { backgroundColor: diffColor }]}>
              <Text style={styles.gridDiffBadgeText}>
                {item.difficulty} {item.internalLevel > 0 ? item.internalLevel.toFixed(1) : '?'}
              </Text>
            </View>
            {b15Rank !== undefined ? (
              <View style={[styles.poolRankBadge, styles.b15RankBadge]}>
                <Text style={styles.b15RankBadgeText}>B15 #{b15Rank}</Text>
              </View>
            ) : b35Rank !== undefined ? (
              <View style={[styles.poolRankBadge, styles.b35RankBadge]}>
                <Text style={styles.b35RankBadgeText}>B35 #{b35Rank}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.gridSongTitle} numberOfLines={1}>
            {item.songTitle}
          </Text>

          <View style={styles.gridStatsRow}>
            <Text style={styles.gridAchText}>{achNum.toFixed(4)}%</Text>
            <Text style={styles.gridRatingText}>+{item.rating}</Text>
          </View>

          <View style={styles.gridBadgesRow}>
            <View style={[styles.rankBadge, { backgroundColor: rankInfo.bg }]}>
              <Text style={[styles.rankBadgeText, { color: rankInfo.color }]}>{rankInfo.label}</Text>
            </View>
            {item.fc && (
              <View style={styles.fcBadge}>
                <Text style={styles.fcText}>{item.fc}</Text>
              </View>
            )}
            {item.songType === 'STD' && (
              <View style={styles.stdBadge}>
                <Text style={styles.stdText}>STD</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    // List view
    return (
      <TouchableOpacity
        key={`${item.songTitle}-${item.difficulty}-${item.id}-${index}`}
        style={styles.card}
        onPress={() => navigateToModal(item)}
      >
        <View style={styles.rankIndex}>
          <Text style={styles.rankIndexText}>#{index + 1}</Text>
          {b15Rank !== undefined ? (
            <View style={[styles.poolRankBadgeSmall, styles.b15RankBadge]}>
              <Text style={styles.b15RankBadgeTextSmall}>B15</Text>
            </View>
          ) : b35Rank !== undefined ? (
            <View style={[styles.poolRankBadgeSmall, styles.b35RankBadge]}>
              <Text style={styles.b35RankBadgeTextSmall}>B35</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.jacketWrapper, { borderColor: diffColor }]}>
          {item.song?.image_url ? (
            <Image
              source={{ uri: `https://maimaidx-eng.com/maimai-mobile/img/Music/${item.song.image_url}` }}
              style={styles.jacketImg}
            />
          ) : (
            <View style={[styles.jacketFallback, { backgroundColor: diffColor + '20' }]}>
              <Music2 size={16} color={diffColor} />
            </View>
          )}
        </View>

        <View style={styles.scoreInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {item.songTitle}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.diffBadge, { backgroundColor: diffColor }]}>
              <Text style={styles.diffBadgeText}>
                {item.difficulty} {item.internalLevel > 0 ? item.internalLevel.toFixed(1) : '?'}
              </Text>
            </View>
            <View style={[styles.rankBadge, { backgroundColor: rankInfo.bg }]}>
              <Text style={[styles.rankBadgeText, { color: rankInfo.color }]}>{rankInfo.label}</Text>
            </View>
            {item.fc && (
              <View style={styles.fcBadge}>
                <Text style={styles.fcText}>{item.fc}</Text>
              </View>
            )}
            {item.songType === 'STD' && (
              <View style={styles.stdBadge}>
                <Text style={styles.stdText}>STD</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.scoreValues}>
          <Text style={styles.achievementText}>{formatAchievement(achNum)}</Text>
          <Text style={styles.ratingDeltaText}>+{item.rating}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (title: string, count: number, maxCount?: number, sum?: number) => {
    return (
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleWithCount}>
          <Text style={styles.sectionMainTitle}>{title}</Text>
          <Text style={styles.sectionCountText}>
            ({count}{maxCount ? `/${maxCount}` : ''})
          </Text>
        </View>
        {sum !== undefined && maxCount && (
          <View style={styles.sectionStats}>
            <Text style={styles.sectionSumText}>Sum {sum}</Text>
            <Text style={styles.sectionAvgText}>Avg {(sum / maxCount).toFixed(1)}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <Search size={16} color={COLORS.textSubtle} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search song title or artist…"
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

      {/* Control Bar: View Mode Switcher + Pool Filters */}
      <View style={styles.controlsRow}>
        {/* Pool Filters */}
        <View style={styles.poolRow}>
          {(['all', 'new', 'old'] as const).map(p => {
            const isActive = poolFilter === p;
            const label =
              p === 'all'
                ? `All (${allScores.length})`
                : p === 'new'
                ? `B15 (${ratingData?.newCharts?.length ?? 0})`
                : `B35 (${ratingData?.oldCharts?.length ?? 0})`;

            return (
              <TouchableOpacity
                key={p}
                style={[styles.poolTab, isActive && styles.poolTabActive]}
                onPress={() => setPoolFilter(p)}
              >
                <Text style={[styles.poolTabText, isActive && styles.poolTabTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* View Switcher: Grid, List, Matrix */}
        <View style={styles.viewSwitcher}>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
            onPress={() => setViewMode('grid')}
          >
            <LayoutGrid size={15} color={viewMode === 'grid' ? '#fff' : COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <ListIcon size={15} color={viewMode === 'list' ? '#fff' : COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'matrix' && styles.viewBtnActive]}
            onPress={() => setViewMode('matrix')}
          >
            <BarChart2 size={15} color={viewMode === 'matrix' ? '#fff' : COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Difficulty Chips */}
      {viewMode !== 'matrix' && (
        <View style={styles.diffRow}>
          {(['ALL', 'EXP', 'MAS', 'REMAS', 'UTAGE'] as const).map(d => {
            const isActive = diffFilter === d;
            const chipColor = d === 'ALL' ? COLORS.purpleLight : getDifficultyColor(d);

            return (
              <TouchableOpacity
                key={d}
                style={[
                  styles.diffChip,
                  isActive && { backgroundColor: chipColor + '30', borderColor: chipColor },
                ]}
                onPress={() => setDiffFilter(d)}
              >
                <Text
                  style={[
                    styles.diffChipText,
                    isActive ? { color: chipColor, fontWeight: '800' } : { color: COLORS.textMuted },
                  ]}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Sort Options (for List and Grid views) */}
      {viewMode !== 'matrix' && (
        <View style={styles.sortRow}>
          <Text style={styles.resultCountText}>{filteredScores.length} charts</Text>
          <View style={styles.sortOptions}>
            <ArrowUpDown size={12} color={COLORS.textSubtle} />
            {(['rating', 'achievement', 'level'] as const).map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => setSortBy(s)}
                style={[styles.sortBtn, sortBy === s && styles.sortBtnActive]}
              >
                <Text style={[styles.sortBtnText, sortBy === s && styles.sortBtnTextActive]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Content Area */}
      {viewMode === 'matrix' ? (
        /* Matrix View */
        <ScrollView style={styles.matrixContainer} contentContainerStyle={styles.matrixContent}>
          {/* Matrix Level Range Selector */}
          <View style={styles.matrixRangeRow}>
            {(['14+', '14', '13+', 'all'] as const).map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.rangeBtn, matrixRange === r && styles.rangeBtnActive]}
                onPress={() => setMatrixRange(r)}
              >
                <Text style={[styles.rangeBtnText, matrixRange === r && styles.rangeBtnTextActive]}>
                  {r === '14+' ? 'Lv 14.5 - 15.0' : r === '14' ? 'Lv 14.0 - 14.4' : r === '13+' ? 'Lv 13.5 - 13.9' : 'All Levels'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hide unplayed toggle */}
          <TouchableOpacity
            style={styles.toggleUnplayedBtn}
            onPress={() => setHideUnplayed(!hideUnplayed)}
          >
            <View style={[styles.toggleCheckbox, hideUnplayed && styles.toggleCheckboxActive]} />
            <Text style={styles.toggleUnplayedText}>Hide unplayed charts</Text>
          </TouchableOpacity>

          {matrixData.map(({ level, charts }) => (
            <View key={level} style={styles.matrixLevelBlock}>
              <View style={styles.matrixLevelHeader}>
                <Text style={styles.matrixLevelTitle}>CONSTANT {level.toFixed(1)}</Text>
                <Text style={styles.matrixLevelCount}>{charts.length} charts</Text>
              </View>

              <View style={styles.matrixGrid}>
                {charts.map((c, i) => {
                  const diffColor = getDifficultyColor(c.difficulty);
                  const achNum = c.score ? (typeof c.score.achievement === 'string' ? parseFloat(c.score.achievement) : c.score.achievement) : 0;
                  const rankInfo = c.score ? getRankBadge(achNum) : null;

                  return (
                    <TouchableOpacity
                      key={`${c.title}-${c.difficulty}-${i}`}
                      style={[styles.matrixCard, { borderColor: c.score ? diffColor : COLORS.borderSubtle }]}
                      onPress={() => navigateToModal(c)}
                    >
                      {c.imageUrl ? (
                        <Image
                          source={{ uri: `https://maimaidx-eng.com/maimai-mobile/img/Music/${c.imageUrl}` }}
                          style={styles.matrixJacket}
                        />
                      ) : (
                        <View style={[styles.matrixJacketFallback, { backgroundColor: diffColor + '20' }]}>
                          <Music2 size={16} color={diffColor} />
                        </View>
                      )}

                      <View style={styles.matrixCardOverlay}>
                        {rankInfo ? (
                          <View style={[styles.matrixRankBadge, { backgroundColor: rankInfo.bg }]}>
                            <Text style={[styles.matrixRankText, { color: rankInfo.color }]}>{rankInfo.label}</Text>
                          </View>
                        ) : (
                          <View style={styles.matrixUnplayedBadge}>
                            <Text style={styles.matrixUnplayedText}>--</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.matrixCardTitle} numberOfLines={1}>{c.title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        /* Sectioned List or Grid View */
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.listContent}>
          {/* New B15 Section */}
          {newB15.length > 0 && (
            <View style={styles.sectionContainer}>
              {renderSectionHeader('NEW CHARTS (B15)', newB15.length, 15, newB15Sum)}
              <View style={viewMode === 'grid' ? styles.gridRow : undefined}>
                {newB15.map((item, index) => renderScoreCard(item, index))}
              </View>
            </View>
          )}

          {/* Old B35 Section */}
          {oldB35.length > 0 && (
            <View style={styles.sectionContainer}>
              {renderSectionHeader('OLD CHARTS (B35)', oldB35.length, 35, oldB35Sum)}
              <View style={viewMode === 'grid' ? styles.gridRow : undefined}>
                {oldB35.map((item, index) => renderScoreCard(item, index))}
              </View>
            </View>
          )}

          {/* New Remaining Section */}
          {newRemaining.length > 0 && (
            <View style={styles.sectionContainer}>
              {renderSectionHeader('NEW REMAINING', newRemaining.length)}
              <View style={viewMode === 'grid' ? styles.gridRow : undefined}>
                {newRemaining.map((item, index) => renderScoreCard(item, index))}
              </View>
            </View>
          )}

          {/* Old Remaining Section */}
          {oldRemaining.length > 0 && (
            <View style={styles.sectionContainer}>
              {renderSectionHeader('OLD REMAINING', oldRemaining.length)}
              <View style={viewMode === 'grid' ? styles.gridRow : undefined}>
                {oldRemaining.map((item, index) => renderScoreCard(item, index))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
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
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  poolRow: {
    flexDirection: 'row',
    gap: 6,
  },
  poolTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceLight,
  },
  poolTabActive: {
    backgroundColor: COLORS.purple,
  },
  poolTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  poolTabTextActive: {
    color: '#fff',
  },
  viewSwitcher: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  viewBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viewBtnActive: {
    backgroundColor: COLORS.purple,
  },
  diffRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 8,
  },
  diffChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.surfaceLight,
  },
  diffChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  resultCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSubtle,
  },
  sortOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
  },
  sortBtnActive: {
    backgroundColor: 'rgba(192, 132, 252, 0.2)',
  },
  sortBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  sortBtnTextActive: {
    color: COLORS.purpleLight,
    fontWeight: '800',
  },
  scrollArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    marginBottom: 10,
  },
  sectionTitleWithCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  sectionMainTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSubtle,
  },
  sectionStats: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionSumText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.pink,
  },
  sectionAvgText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.cyan,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 4,
  },
  gridJacketWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  gridJacketImg: {
    width: '100%',
    height: '100%',
  },
  gridJacketFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridDiffBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gridDiffBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
  },
  gridSongTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 6,
    marginBottom: 4,
  },
  gridStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gridAchText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },
  gridRatingText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.cyan,
  },
  gridBadgesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  rankIndex: {
    width: 22,
    alignItems: 'center',
    marginRight: 6,
  },
  rankIndexText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSubtle,
  },
  jacketWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  jacketImg: {
    width: '100%',
    height: '100%',
  },
  jacketFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  songTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  diffBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
  },
  rankBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  rankBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  fcBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  fcText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.amber,
  },
  scoreValues: {
    alignItems: 'flex-end',
  },
  achievementText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  ratingDeltaText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.cyan,
    marginTop: 2,
  },
  // Matrix View Styles
  matrixContainer: {
    flex: 1,
  },
  matrixContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  matrixRangeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
  },
  rangeBtnActive: {
    backgroundColor: COLORS.purple,
  },
  rangeBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  rangeBtnTextActive: {
    color: '#fff',
  },
  toggleUnplayedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  toggleCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.textSubtle,
  },
  toggleCheckboxActive: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  toggleUnplayedText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  matrixLevelBlock: {
    marginBottom: 16,
  },
  matrixLevelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    paddingBottom: 4,
    marginBottom: 8,
  },
  matrixLevelTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.cyan,
    letterSpacing: 0.5,
  },
  matrixLevelCount: {
    fontSize: 11,
    color: COLORS.textSubtle,
  },
  matrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  matrixCard: {
    width: 68,
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  matrixJacket: {
    width: '100%',
    height: 52,
  },
  matrixJacketFallback: {
    width: '100%',
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matrixCardOverlay: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  matrixRankBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  matrixRankText: {
    fontSize: 8,
    fontWeight: '800',
  },
  matrixUnplayedBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  matrixUnplayedText: {
    fontSize: 8,
    color: '#888',
    fontWeight: '800',
  },
  matrixCardTitle: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.text,
    padding: 3,
    textAlign: 'center',
  },
  poolRankBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  poolRankBadgeSmall: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 2,
  },
  b15RankBadge: {
    backgroundColor: 'rgba(244, 63, 94, 0.25)',
    borderColor: '#f43f5e',
  },
  b15RankBadgeText: {
    color: '#fda4af',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  b15RankBadgeTextSmall: {
    color: '#fda4af',
    fontSize: 7.5,
    fontWeight: '800',
  },
  b35RankBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
    borderColor: '#06b6d4',
  },
  b35RankBadgeText: {
    color: '#67e8f9',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  b35RankBadgeTextSmall: {
    color: '#67e8f9',
    fontSize: 7.5,
    fontWeight: '800',
  },
  stdBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  stdText: {
    color: '#9ca3af',
    fontSize: 8.5,
    fontWeight: '800',
  },
});


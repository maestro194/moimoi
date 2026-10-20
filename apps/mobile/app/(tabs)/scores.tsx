import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLocalData } from '../../db/useLocalData';
import { COLORS, DIFF_COLOR, getDifficultyColor, getRankBadge, formatAchievement } from '../../constants/Theme';
import { Search, Filter, ArrowUpDown, Music2, X } from 'lucide-react-native';

type PoolFilter = 'all' | 'new' | 'old';
type DiffFilter = 'ALL' | 'EXP' | 'MAS' | 'REMAS' | 'UTAGE';
type SortOption = 'rating' | 'achievement' | 'level';

export default function ScoresScreen() {
  const router = useRouter();
  const { loading, ratingData } = useLocalData();

  const [search, setSearch] = useState('');
  const [poolFilter, setPoolFilter] = useState<PoolFilter>('all');
  const [diffFilter, setDiffFilter] = useState<DiffFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('rating');

  const allScores = useMemo(() => {
    return ratingData?.allScores ?? [];
  }, [ratingData]);

  const filteredScores = useMemo(() => {
    let list = [...allScores];

    // Filter by pool
    if (poolFilter === 'new') {
      list = list.filter(s => s.pool === 'new');
    } else if (poolFilter === 'old') {
      list = list.filter(s => s.pool === 'old');
    }

    // Filter by difficulty
    if (diffFilter !== 'ALL') {
      list = list.filter(s => s.difficulty.toUpperCase() === diffFilter);
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.songTitle.toLowerCase().includes(q) ||
        (s.song?.artist && s.song.artist.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      if (sortBy === 'achievement') {
        const achA = typeof a.achievement === 'string' ? parseFloat(a.achievement) : a.achievement;
        const achB = typeof b.achievement === 'string' ? parseFloat(b.achievement) : b.achievement;
        return achB - achA;
      }
      if (sortBy === 'level') {
        return b.internalLevel - a.internalLevel;
      }
      return 0;
    });

    return list;
  }, [allScores, poolFilter, diffFilter, search, sortBy, ratingData]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.purpleLight} />
        <Text style={styles.loadingText}>Loading scores…</Text>
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

      {/* Pool Filters (All / B15 New / B35 Old) */}
      <View style={styles.poolRow}>
        {(['all', 'new', 'old'] as const).map(p => {
          const isActive = poolFilter === p;
          const label = p === 'all' ? `All (${allScores.length})` : p === 'new' ? `B15 New (${ratingData?.newCharts?.length ?? 0})` : `B35 Old (${ratingData?.oldCharts?.length ?? 0})`;

          return (
            <TouchableOpacity
              key={p}
              style={[styles.poolTab, isActive && styles.poolTabActive]}
              onPress={() => setPoolFilter(p)}
            >
              <Text style={[styles.poolTabText, isActive && styles.poolTabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Difficulty Chips */}
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

      {/* Sort Bar */}
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

      {/* Scores FlatList */}
      <FlatList
        data={filteredScores}
        keyExtractor={item => `${item.songTitle}-${item.difficulty}-${item.id}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const diffColor = getDifficultyColor(item.difficulty);
          const achNum = typeof item.achievement === 'string' ? parseFloat(item.achievement) : item.achievement;
          const rankInfo = getRankBadge(achNum);

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                router.push({
                  pathname: '/modal',
                  params: {
                    title: item.songTitle,
                    difficulty: item.difficulty,
                    achievement: String(item.achievement),
                    internalLevel: String(item.internalLevel),
                    rating: String(item.rating),
                    songType: item.songType ?? 'DX',
                    fc: item.fc ?? '',
                    fs: item.fs ?? '',
                    artist: item.song?.artist ?? '',
                    imageUrl: item.song?.image_url ?? '',
                  },
                });
              }}
            >
              {/* Jacket art with 2.5px difficulty border */}
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

              {/* Title & Badges */}
              <View style={styles.cardBody}>
                <Text style={styles.titleText} numberOfLines={1}>
                  {item.songTitle}
                </Text>
                <Text style={styles.artistText} numberOfLines={1}>
                  {item.song?.artist ?? 'Unknown Artist'}
                </Text>

                <View style={styles.tagRow}>
                  <View style={[styles.diffTag, { backgroundColor: diffColor }]}>
                    <Text style={styles.diffTagText}>
                      {item.difficulty} {item.difficulty === 'UTAGE' ? (item.song?.lev_utage || '?') : item.internalLevel.toFixed(1)}
                    </Text>
                  </View>
                  <View style={[styles.rankTag, { backgroundColor: rankInfo.bg }]}>
                    <Text style={[styles.rankTagText, { color: rankInfo.color }]}>{rankInfo.label}</Text>
                  </View>
                  {item.fc && (
                    <View style={styles.fcTag}>
                      <Text style={styles.fcTagText}>{item.fc}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Achievement & Rating */}
              <View style={styles.cardScoreCol}>
                <Text style={styles.cardAchText}>{formatAchievement(achNum)}</Text>
                <Text style={styles.cardRatingText}>+{item.rating}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Music2 size={36} color={COLORS.textSubtle} />
            <Text style={styles.emptyText}>No charts matched your filter</Text>
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
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },
  poolRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  poolTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  poolTabActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderColor: COLORS.purple,
  },
  poolTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  poolTabTextActive: {
    color: COLORS.purpleLight,
    fontWeight: '700',
  },
  diffRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 8,
  },
  diffChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  diffChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  resultCountText: {
    fontSize: 11,
    color: COLORS.textSubtle,
    fontWeight: '600',
  },
  sortOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sortBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sortBtnText: {
    fontSize: 11,
    color: COLORS.textSubtle,
  },
  sortBtnTextActive: {
    color: COLORS.cyan,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  jacketWrapper: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 2.5, // 2.5px thickness matching web
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
  cardBody: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  artistText: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  diffTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diffTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
  },
  rankTag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rankTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  fcTag: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  fcTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.amber,
  },
  cardScoreCol: {
    alignItems: 'flex-end',
  },
  cardAchText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  cardRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.cyan,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textSubtle,
  },
});

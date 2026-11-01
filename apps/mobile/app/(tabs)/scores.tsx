import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
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
import { JacketImage } from '@/components/JacketImage';
import { Tap } from '@/components/Tap';
import { FoilFrame, foilRatingColor, hasFoil } from '@/components/FoilFrame';
import type { FoilInfo } from '@maimai-suite/core';

type PoolFilter = 'all' | 'new' | 'old';
type DiffFilter = 'ALL' | 'EXP' | 'MAS' | 'REMAS' | 'UTAGE';
type SortOption = 'rating' | 'achievement' | 'level';
type ViewMode = 'grid' | 'list' | 'matrix';

interface MatrixChart {
  title: string;
  difficulty: string;
  type: 'DX' | 'STD';
  level: number;
  imageUrl: string;
  score?: ScoreWithRating;
}

/** Flattened rows for the virtualized list: section/level headers plus rows of cards. */
type ListRow =
  | { kind: 'section'; key: string; title: string; count: number; max?: number; sum?: number; first: boolean }
  | { kind: 'cards'; key: string; items: ScoreWithRating[]; startIndex: number; inB50: boolean }
  | { kind: 'level'; key: string; level: number; count: number; first: boolean }
  | { kind: 'charts'; key: string; charts: MatrixChart[] };

const MATRIX_CARD_W = 68;
const MATRIX_GAP = 8;
const LIST_PADDING_H = 16;

const chartKeyOf = (s: { songTitle: string; difficulty: string; songType?: string }) =>
  `${s.songTitle}::${s.difficulty}::${s.songType ?? 'DX'}`;

function SectionHeader({ title, count, max, sum }: { title: string; count: number; max?: number; sum?: number }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionTitleWithCount}>
        <Text style={styles.sectionMainTitle}>{title}</Text>
        <Text style={styles.sectionCountText}>
          ({count}{max ? `/${max}` : ''})
        </Text>
      </View>
      {sum !== undefined && max && (
        <View style={styles.sectionStats}>
          <Text style={styles.sectionSumText}>Sum {sum}</Text>
          <Text style={styles.sectionAvgText}>Avg {(sum / max).toFixed(1)}</Text>
        </View>
      )}
    </View>
  );
}

interface ScoreCardProps {
  item: ScoreWithRating;
  index: number;
  grid: boolean;
  b15Rank?: number;
  b35Rank?: number;
  /** Only set for cards in the B15/B35 sections. */
  foil?: FoilInfo;
  onOpen: (item: ScoreWithRating) => void;
}

// Memoized so scrolling only renders rows entering the window, not every card again
const ScoreCard = React.memo(function ScoreCard({ item, index, grid, b15Rank, b35Rank, foil, onOpen }: ScoreCardProps) {
  const card = <ScoreCardBody item={item} index={index} grid={grid} b15Rank={b15Rank} b35Rank={b35Rank} foil={foil} onOpen={onOpen} />;
  if (!hasFoil(foil)) return card;
  return (
    <FoilFrame foil={foil} radius={grid ? 16 : 14} style={grid ? styles.gridFoilRoot : styles.listFoilRoot}>
      {card}
    </FoilFrame>
  );
});

function ScoreCardBody({ item, index, grid, b15Rank, b35Rank, foil, onOpen }: ScoreCardProps) {
  const framed = hasFoil(foil);
  const ratingColor = foilRatingColor(foil);
  const diffColor = getDifficultyColor(item.difficulty);
  const achNum = typeof item.achievement === 'string' ? parseFloat(item.achievement) : item.achievement;
  const rankInfo = getRankBadge(achNum);
  const cardLabel = `${item.songTitle} ${item.difficulty}, ${achNum.toFixed(4)}%, rating ${item.rating}`;

  if (grid) {
    return (
      <Tap label={cardLabel} style={[styles.gridCard, framed && styles.cardInFoil]} onPress={() => onOpen(item)}>
        <View style={[styles.gridJacketWrapper, { borderColor: diffColor }]}>
          {item.song?.image_url ? (
            <JacketImage imageName={item.song.image_url} style={styles.gridJacketImg} />
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
          <Text style={[styles.gridRatingText, ratingColor ? { color: ratingColor } : null]}>+{item.rating}</Text>
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
      </Tap>
    );
  }

  return (
    <Tap label={cardLabel} style={[styles.card, framed && styles.cardInFoil]} onPress={() => onOpen(item)}>
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
          <JacketImage imageName={item.song.image_url} style={styles.jacketImg} />
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
        <Text style={[styles.ratingDeltaText, ratingColor ? { color: ratingColor } : null]}>+{item.rating}</Text>
      </View>
    </Tap>
  );
}

const MatrixCard = React.memo(function MatrixCard({ c, onOpen }: { c: MatrixChart; onOpen: (c: MatrixChart) => void }) {
  const diffColor = getDifficultyColor(c.difficulty);
  const achNum = c.score ? (typeof c.score.achievement === 'string' ? parseFloat(c.score.achievement) : c.score.achievement) : 0;
  const rankInfo = c.score ? getRankBadge(achNum) : null;

  return (
    <Tap label={`${c.title} ${c.difficulty}${c.score ? `, ${achNum.toFixed(4)}%` : ', not played'}`}
      style={[styles.matrixCard, { borderColor: c.score ? diffColor : COLORS.borderSubtle }]}
      onPress={() => onOpen(c)}
    >
      {c.imageUrl ? (
        <JacketImage imageName={c.imageUrl} style={styles.matrixJacket} />
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
    </Tap>
  );
});

export default function ScoresScreen() {
  const router = useRouter();
  const { loading, ratingData, rawSongs, foil } = useLocalData();

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

    const chartsByLevel = new Map<number, MatrixChart[]>();

    for (const song of rawSongs) {
      const diffs: Array<{ key: string; diff: string; type: 'DX' | 'STD'; img: string }> = [
        { key: song.dx_lev_mas_i || song.lev_mas_i || '', diff: 'MAS', type: song.dx_lev_mas_i ? 'DX' : 'STD', img: song.image_url || '' },
        { key: song.dx_lev_remas_i || song.lev_remas_i || '', diff: 'REMAS', type: song.dx_lev_remas_i ? 'DX' : 'STD', img: song.image_url || '' },
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

  const { width } = useWindowDimensions();
  const matrixCols = Math.max(1, Math.floor((width - LIST_PADDING_H * 2 + MATRIX_GAP) / (MATRIX_CARD_W + MATRIX_GAP)));

  const rows = useMemo<ListRow[]>(() => {
    const out: ListRow[] = [];
    if (viewMode === 'matrix') {
      matrixData.forEach(({ level, charts }, li) => {
        out.push({ kind: 'level', key: `lv-${level}`, level, count: charts.length, first: li === 0 });
        for (let i = 0; i < charts.length; i += matrixCols) {
          out.push({ kind: 'charts', key: `lv-${level}-${i}`, charts: charts.slice(i, i + matrixCols) });
        }
      });
      return out;
    }
    const perRow = viewMode === 'grid' ? 2 : 1;
    const sections = [
      { id: 'b15', title: 'NEW CHARTS (B15)', items: newB15, max: 15, sum: newB15Sum },
      { id: 'b35', title: 'OLD CHARTS (B35)', items: oldB35, max: 35, sum: oldB35Sum },
      { id: 'newRest', title: 'NEW REMAINING', items: newRemaining },
      { id: 'oldRest', title: 'OLD REMAINING', items: oldRemaining },
    ];
    for (const sec of sections) {
      if (!sec.items.length) continue;
      out.push({ kind: 'section', key: sec.id, title: sec.title, count: sec.items.length, max: sec.max, sum: sec.sum, first: out.length === 0 });
      for (let i = 0; i < sec.items.length; i += perRow) {
        out.push({ kind: 'cards', key: `${sec.id}-${i}`, items: sec.items.slice(i, i + perRow), startIndex: i, inB50: sec.id === 'b15' || sec.id === 'b35' });
      }
    }
    return out;
  }, [viewMode, matrixData, matrixCols, newB15, oldB35, newRemaining, oldRemaining, newB15Sum, oldB35Sum]);

  const navigateToModal = useCallback((item: ScoreWithRating | MatrixChart) => {
    const it = item as any;
    router.push({
      pathname: '/modal',
      params: {
        title: it.songTitle || it.title,
        difficulty: it.difficulty,
        achievement: String(it.achievement ?? it.score?.achievement ?? 0),
        internalLevel: String(it.internalLevel ?? it.level ?? 0),
        rating: String(it.rating ?? it.score?.rating ?? 0),
        songType: it.songType ?? it.type ?? 'DX',
        fc: it.fc ?? it.score?.fc ?? '',
        fs: it.fs ?? it.score?.fs ?? '',
        artist: it.song?.artist ?? '',
        imageUrl: it.song?.image_url ?? it.imageUrl ?? '',
      },
    });
  }, [router]);

  const renderRow = useCallback(({ item: row }: { item: ListRow }) => {
    switch (row.kind) {
      case 'section':
        return (
          <View style={!row.first && styles.sectionSpacer}>
            <SectionHeader title={row.title} count={row.count} max={row.max} sum={row.sum} />
          </View>
        );
      case 'cards':
        return (
          <View style={viewMode === 'grid' ? styles.gridRowLine : undefined}>
            {row.items.map((s, j) => {
              const key = chartKeyOf(s);
              return (
                <ScoreCard
                  key={key}
                  item={s}
                  index={row.startIndex + j}
                  grid={viewMode === 'grid'}
                  b15Rank={b15RankMap.get(key)}
                  b35Rank={b35RankMap.get(key)}
                  foil={row.inB50 ? foil.get(key) : undefined}
                  onOpen={navigateToModal}
                />
              );
            })}
          </View>
        );
      case 'level':
        return (
          <View style={[styles.matrixLevelHeader, !row.first && styles.levelSpacer]}>
            <Text style={styles.matrixLevelTitle}>CONSTANT {row.level.toFixed(1)}</Text>
            <Text style={styles.matrixLevelCount}>{row.count} charts</Text>
          </View>
        );
      case 'charts':
        return (
          <View style={styles.matrixRowLine}>
            {row.charts.map(c => (
              <MatrixCard key={`${c.title}::${c.difficulty}::${c.type}`} c={c} onOpen={navigateToModal} />
            ))}
          </View>
        );
    }
  }, [viewMode, b15RankMap, b35RankMap, foil, navigateToModal]);

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
        <TextInput accessibilityLabel="Search scores"
          style={styles.searchInput}
          placeholder="Search song title or artist…"
          placeholderTextColor={COLORS.textSubtle}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Tap label="Clear search" onPress={() => setSearch('')}>
            <X size={16} color={COLORS.textSubtle} />
          </Tap>
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
              <Tap label={label} role="tab" selected={isActive}
                key={p}
                style={[styles.poolTab, isActive && styles.poolTabActive]}
                onPress={() => setPoolFilter(p)}
              >
                <Text style={[styles.poolTabText, isActive && styles.poolTabTextActive]}>{label}</Text>
              </Tap>
            );
          })}
        </View>

        {/* View Switcher: Grid, List, Matrix */}
        <View style={styles.viewSwitcher}>
          <Tap label="Grid view" role="tab" selected={viewMode === 'grid'}
            style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
            onPress={() => setViewMode('grid')}
          >
            <LayoutGrid size={15} color={viewMode === 'grid' ? '#fff' : COLORS.textMuted} />
          </Tap>
          <Tap label="List view" role="tab" selected={viewMode === 'list'}
            style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <ListIcon size={15} color={viewMode === 'list' ? '#fff' : COLORS.textMuted} />
          </Tap>
          <Tap label="Level matrix view" role="tab" selected={viewMode === 'matrix'}
            style={[styles.viewBtn, viewMode === 'matrix' && styles.viewBtnActive]}
            onPress={() => setViewMode('matrix')}
          >
            <BarChart2 size={15} color={viewMode === 'matrix' ? '#fff' : COLORS.textMuted} />
          </Tap>
        </View>
      </View>

      {/* Difficulty Chips */}
      {viewMode !== 'matrix' && (
        <View style={styles.diffRow}>
          {(['ALL', 'EXP', 'MAS', 'REMAS', 'UTAGE'] as const).map(d => {
            const isActive = diffFilter === d;
            const chipColor = d === 'ALL' ? COLORS.purpleLight : getDifficultyColor(d);

            return (
              <Tap label={`Difficulty: ${d}`} selected={isActive}
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
              </Tap>
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
              <Tap label={`Sort by ${s}`} selected={sortBy === s}
                key={s}
                onPress={() => setSortBy(s)}
                style={[styles.sortBtn, sortBy === s && styles.sortBtnActive]}
              >
                <Text style={[styles.sortBtnText, sortBy === s && styles.sortBtnTextActive]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </Tap>
            ))}
          </View>
        </View>
      )}

      {/* Content Area: one virtualized list (grid, list or level matrix) */}
      <FlatList
        style={viewMode === 'matrix' ? styles.matrixContainer : styles.scrollArea}
        contentContainerStyle={viewMode === 'matrix' ? styles.matrixContent : styles.listContent}
        data={rows}
        keyExtractor={row => row.key}
        renderItem={renderRow}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={viewMode === 'matrix' ? (
          <View>
            {/* Matrix Level Range Selector */}
            <View style={styles.matrixRangeRow}>
              {(['14+', '14', '13+', 'all'] as const).map(r => (
                <Tap label={r === 'all' ? 'All levels' : `Level range ${r}`} selected={matrixRange === r}
                  key={r}
                  style={[styles.rangeBtn, matrixRange === r && styles.rangeBtnActive]}
                  onPress={() => setMatrixRange(r)}
                >
                  <Text style={[styles.rangeBtnText, matrixRange === r && styles.rangeBtnTextActive]}>
                    {r === '14+' ? 'Lv 14.5 - 15.0' : r === '14' ? 'Lv 14.0 - 14.4' : r === '13+' ? 'Lv 13.5 - 13.9' : 'All Levels'}
                  </Text>
                </Tap>
              ))}
            </View>

            {/* Hide unplayed toggle */}
            <Tap label="Hide unplayed charts" role="checkbox" checked={hideUnplayed}
              style={styles.toggleUnplayedBtn}
              onPress={() => setHideUnplayed(!hideUnplayed)}
            >
              <View style={[styles.toggleCheckbox, hideUnplayed && styles.toggleCheckboxActive]} />
              <Text style={styles.toggleUnplayedText}>Hide unplayed charts</Text>
            </Tap>
          </View>
        ) : undefined}
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
  sectionSpacer: {
    marginTop: 20,
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
  gridRowLine: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  // A foil frame takes the card's place in the row; the card inside then fills it
  gridFoilRoot: {
    width: '48%',
    marginBottom: 4,
  },
  listFoilRoot: {
    marginBottom: 8,
  },
  cardInFoil: {
    width: '100%',
    marginBottom: 0,
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
  levelSpacer: {
    marginTop: 8,
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
  matrixRowLine: {
    flexDirection: 'row',
    gap: MATRIX_GAP,
    marginBottom: MATRIX_GAP,
  },
  matrixCard: {
    width: MATRIX_CARD_W,
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


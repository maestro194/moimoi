import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS, getDifficultyColor, getRankBadge, formatAchievement } from '../constants/Theme';
import {
  Music2,
  Trophy,
  Disc,
  Calendar,
  X,
  TrendingUp,
  ExternalLink,
  Target,
  CheckCircle2,
} from 'lucide-react-native';
import { sqlite } from '../db/client';
import type { PlayLogRow, SongRow, ScoreRow } from '../db/schema';
import { calcSingleRating, versionLabel, normalizeTitle } from '@maimai-suite/core';

export default function SongDetailModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    title: string;
    difficulty: string;
    achievement: string;
    internalLevel: string;
    rating: string;
    songType?: string;
    fc?: string;
    fs?: string;
    artist?: string;
    imageUrl?: string;
  }>();

  const title = params.title ?? 'Unknown Song';
  const difficulty = params.difficulty ?? 'MAS';
  const songType = params.songType ?? 'DX';
  const diffColor = getDifficultyColor(difficulty);

  // Load song record from SQLite for note counts, designer, bpm, and version
  const songData = useMemo(() => {
    try {
      const songRow = sqlite.getFirstSync<SongRow>(
        `SELECT * FROM songs WHERE title = ? OR title_kana = ? LIMIT 1`,
        [title, title]
      );
      if (!songRow) return null;

      let sheetObj: any = null;
      if (songRow.sheets) {
        try {
          const sheets = JSON.parse(songRow.sheets);
          const diffKey = difficulty.toLowerCase();
          const targetType = songType.toLowerCase();
          sheetObj = sheets.find(
            (sh: any) =>
              (sh.difficulty === diffKey || (diffKey === 'remas' && sh.difficulty === 'remaster')) &&
              (!sh.type || sh.type.toLowerCase() === targetType)
          ) || sheets.find((sh: any) => sh.difficulty === diffKey || (diffKey === 'remas' && sh.difficulty === 'remaster'));
        } catch {}
      }

      return {
        song: songRow,
        sheet: sheetObj,
        bpm: songRow.bpm,
        version: songRow.version,
        noteCounts: sheetObj?.noteCounts,
        noteDesigner: sheetObj?.noteDesigner,
      };
    } catch {
      return null;
    }
  }, [title, difficulty, songType]);

  // Load best score from SQLite if param achievement is 0
  const bestScore = useMemo(() => {
    try {
      return sqlite.getFirstSync<ScoreRow>(
        `SELECT * FROM scores WHERE song_title = ? AND difficulty = ? ORDER BY achievement DESC LIMIT 1`,
        [title, difficulty]
      );
    } catch {
      return null;
    }
  }, [title, difficulty]);

  const paramAch = parseFloat(params.achievement ?? '0');
  const achNum = paramAch > 0 ? paramAch : (bestScore?.achievement ?? 0);
  const rankInfo = getRankBadge(achNum);

  const parsedInternal = parseFloat(params.internalLevel ?? '0');
  const internalLevel = parsedInternal > 0
    ? parsedInternal
    : (parseFloat(songData?.sheet?.internalLevelValue ?? '0') || 0);

  const paramRating = parseInt(params.rating ?? '0', 10);
  const ratingPoints = paramRating > 0
    ? paramRating
    : (internalLevel > 0 && achNum > 0 ? calcSingleRating(internalLevel, achNum).floored : 0);

  const imageUrl = params.imageUrl || songData?.song.image_url;
  const artistName = params.artist || songData?.song.artist || 'Unknown Artist';
  const effectiveFC = params.fc || bestScore?.fc || '';
  const effectiveFS = params.fs || bestScore?.fs || '';

  // Query local play_log for history on this specific chart
  const playHistory = useMemo(() => {
    try {
      return sqlite.getAllSync<PlayLogRow>(
        `SELECT * FROM play_log WHERE song_title = ? AND difficulty = ? ORDER BY played_at DESC LIMIT 20`,
        [title, difficulty]
      );
    } catch {
      return [];
    }
  }, [title, difficulty]);

  // Target rating milestones
  const milestones = useMemo(() => {
    if (internalLevel <= 0) return [];
    const thresholds = [
      { name: 'S', min: 97.0 },
      { name: 'S+', min: 98.0 },
      { name: 'SS', min: 99.0 },
      { name: 'SS+', min: 99.5 },
      { name: 'SSS', min: 100.0 },
      { name: 'SSS+', min: 100.5 },
    ];

    return thresholds.map(t => {
      const calc = calcSingleRating(internalLevel, t.min);
      const isAchieved = achNum >= t.min;
      const ptsDiff = isAchieved ? 0 : calc.floored - ratingPoints;
      return {
        ...t,
        targetRating: calc.floored,
        isAchieved,
        ptsDiff,
      };
    });
  }, [internalLevel, achNum, ratingPoints]);

  const openDxRating = () => {
    const url = `https://dxrating.net/songs/${encodeURIComponent(title)}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={openDxRating}>
            <ExternalLink size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <X size={18} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Jacket Art with 2.5px difficulty border */}
        <View style={styles.jacketWrapper}>
          <View style={[styles.jacketBorder, { borderColor: diffColor }]}>
            {imageUrl ? (
              <Image
                source={{ uri: `https://maimaidx-eng.com/maimai-mobile/img/Music/${imageUrl}` }}
                style={styles.jacketImg}
              />
            ) : (
              <View style={[styles.jacketFallback, { backgroundColor: diffColor + '20' }]}>
                <Music2 size={48} color={diffColor} />
              </View>
            )}
          </View>
        </View>

        {/* Title & Artist */}
        <Text style={styles.songTitle}>{title}</Text>
        <Text style={styles.songArtist}>{artistName}</Text>

        {/* Badges */}
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: songType === 'DX' ? COLORS.cyan + '20' : COLORS.blue + '20' },
            ]}
          >
            <Text style={[styles.typeBadgeText, { color: songType === 'DX' ? COLORS.cyan : COLORS.blue }]}>
              {songType}
            </Text>
          </View>
          <View style={[styles.diffBadge, { backgroundColor: diffColor }]}>
            <Text style={styles.diffBadgeText}>
              {difficulty} {difficulty === 'UTAGE' ? 'UTAGE' : internalLevel.toFixed(1)}
            </Text>
          </View>
          {achNum > 0 ? (
            <View style={[styles.rankBadge, { backgroundColor: rankInfo.bg }]}>
              <Text style={[styles.rankBadgeText, { color: rankInfo.color }]}>{rankInfo.label}</Text>
            </View>
          ) : (
            <View style={[styles.rankBadge, { backgroundColor: COLORS.surfaceLight }]}>
              <Text style={[styles.rankBadgeText, { color: COLORS.textSubtle }]}>UNPLAYED</Text>
            </View>
          )}
          {effectiveFC ? (
            <View style={styles.fcBadge}>
              <Text style={styles.fcText}>{effectiveFC}</Text>
            </View>
          ) : null}
          {effectiveFS ? (
            <View style={styles.fsBadge}>
              <Text style={styles.fsText}>{effectiveFS}</Text>
            </View>
          ) : null}
        </View>

        {/* Score & Rating Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>PERSONAL BEST</Text>
            <Text style={styles.statValue}>
              {achNum > 0 ? formatAchievement(achNum) : '--'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>DX RATING</Text>
            <Text style={[styles.statValue, { color: COLORS.cyan }]}>
              {ratingPoints > 0 ? `+${ratingPoints}` : '--'}
            </Text>
          </View>
        </View>

        {/* Chart Details Card: BPM, Version, Designer, Note Breakdown */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Disc size={16} color={COLORS.cyan} />
            <Text style={styles.sectionCardTitle}>Chart Information</Text>
          </View>

          <View style={styles.chartDetailsGrid}>
            <View style={styles.detailRowItem}>
              <Text style={styles.detailLabel}>Game Version</Text>
              <Text style={styles.detailValue}>{versionLabel(songData?.version)}</Text>
            </View>
            {songData?.bpm ? (
              <View style={styles.detailRowItem}>
                <Text style={styles.detailLabel}>BPM</Text>
                <Text style={styles.detailValue}>{songData.bpm}</Text>
              </View>
            ) : null}
            {songData?.noteDesigner ? (
              <View style={styles.detailRowItem}>
                <Text style={styles.detailLabel}>Chart Designer</Text>
                <Text style={styles.detailValue}>{songData.noteDesigner}</Text>
              </View>
            ) : null}
          </View>

          {/* Note Counts breakdown */}
          {songData?.noteCounts ? (
            <View style={styles.notesBreakdownWrapper}>
              <Text style={styles.notesSubtitle}>NOTE BREAKDOWN</Text>
              <View style={styles.notesGrid}>
                <View style={styles.noteStatBox}>
                  <Text style={styles.noteStatLabel}>TAP</Text>
                  <Text style={styles.noteStatValue}>{songData.noteCounts.tap ?? 0}</Text>
                </View>
                <View style={styles.noteStatBox}>
                  <Text style={styles.noteStatLabel}>HOLD</Text>
                  <Text style={styles.noteStatValue}>{songData.noteCounts.hold ?? 0}</Text>
                </View>
                <View style={styles.noteStatBox}>
                  <Text style={styles.noteStatLabel}>SLIDE</Text>
                  <Text style={styles.noteStatValue}>{songData.noteCounts.slide ?? 0}</Text>
                </View>
                {songData.noteCounts.touch !== null && songData.noteCounts.touch !== undefined ? (
                  <View style={styles.noteStatBox}>
                    <Text style={styles.noteStatLabel}>TOUCH</Text>
                    <Text style={styles.noteStatValue}>{songData.noteCounts.touch}</Text>
                  </View>
                ) : null}
                <View style={styles.noteStatBox}>
                  <Text style={styles.noteStatLabel}>BREAK</Text>
                  <Text style={[styles.noteStatValue, { color: COLORS.amber }]}>
                    {songData.noteCounts.break ?? 0}
                  </Text>
                </View>
                <View style={styles.noteStatBox}>
                  <Text style={styles.noteStatLabel}>TOTAL</Text>
                  <Text style={[styles.noteStatValue, { color: COLORS.purpleLight }]}>
                    {songData.noteCounts.total ?? 0}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {/* Rating Milestones Card */}
        {milestones.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Target size={16} color={COLORS.amber} />
              <Text style={styles.sectionCardTitle}>Rating Milestones</Text>
            </View>

            <View style={styles.milestoneGrid}>
              {milestones.map(m => (
                <View
                  key={m.name}
                  style={[
                    styles.milestoneItem,
                    m.isAchieved && styles.milestoneItemAchieved,
                  ]}
                >
                  <View style={styles.milestoneTop}>
                    <Text
                      style={[
                        styles.milestoneRank,
                        { color: m.isAchieved ? '#4ade80' : COLORS.textMuted },
                      ]}
                    >
                      {m.name} ({m.min}%)
                    </Text>
                    {m.isAchieved ? (
                      <CheckCircle2 size={13} color="#4ade80" />
                    ) : (
                      <Text style={styles.milestoneGain}>+{m.ptsDiff} pts</Text>
                    )}
                  </View>
                  <Text style={styles.milestoneRating}>{m.targetRating}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Score Progression History Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <TrendingUp size={16} color={COLORS.purpleLight} />
            <Text style={styles.sectionCardTitle}>
              Play History ({playHistory.length} recorded)
            </Text>
          </View>

          {playHistory.length === 0 ? (
            <Text style={styles.emptyHistoryText}>No recorded plays for this chart in local cache.</Text>
          ) : (
            playHistory.slice(0, 10).map((p, idx) => {
              const r = getRankBadge(p.achievement);
              return (
                <View key={p.id || idx} style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyDate}>
                      {new Date(p.played_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      {new Date(p.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <View style={styles.historyBadges}>
                      <View style={[styles.rankBadge, { backgroundColor: r.bg }]}>
                        <Text style={[styles.rankBadgeText, { color: r.color, fontSize: 8 }]}>{r.label}</Text>
                      </View>
                      {p.fc && (
                        <View style={styles.fcBadge}>
                          <Text style={[styles.fcText, { fontSize: 8 }]}>{p.fc}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.historyAch}>{p.achievement.toFixed(4)}%</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Chart Details Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconCol}>
              <Disc size={15} color={COLORS.purpleLight} />
            </View>
            <Text style={styles.infoKey}>Chart Type</Text>
            <Text style={styles.infoVal}>{songType === 'DX' ? 'DX Chart' : 'Standard Chart'}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconCol}>
              <Trophy size={15} color={COLORS.amber} />
            </View>
            <Text style={styles.infoKey}>Internal Constant</Text>
            <Text style={styles.infoVal}>
              {difficulty === 'UTAGE' ? 'Special' : internalLevel.toFixed(1)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconCol}>
              <Calendar size={15} color={COLORS.cyan} />
            </View>
            <Text style={styles.infoKey}>Difficulty Tier</Text>
            <Text style={[styles.infoVal, { color: diffColor, fontWeight: '700' }]}>{difficulty}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 18,
    alignItems: 'center',
  },
  jacketWrapper: {
    marginVertical: 14,
  },
  jacketBorder: {
    width: 140,
    height: 140,
    borderRadius: 20,
    borderWidth: 2.5,
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
  songTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  diffBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
  },
  rankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rankBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  fcBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  fcText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.amber,
  },
  fsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
  },
  fsText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.cyan,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    width: '100%',
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.borderSubtle,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textSubtle,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    width: '100%',
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  milestoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  milestoneItem: {
    width: '48%',
    backgroundColor: COLORS.surfaceLight,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  milestoneItemAchieved: {
    borderColor: 'rgba(74, 222, 128, 0.3)',
    backgroundColor: 'rgba(74, 222, 128, 0.05)',
  },
  milestoneTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  milestoneRank: {
    fontSize: 11,
    fontWeight: '800',
  },
  milestoneGain: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.cyan,
  },
  milestoneRating: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  historyBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  historyAch: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  emptyHistoryText: {
    fontSize: 12,
    color: COLORS.textSubtle,
    textAlign: 'center',
    paddingVertical: 10,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoIconCol: {
    width: 22,
    alignItems: 'center',
    marginRight: 8,
  },
  infoKey: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  chartDetailsGrid: {
    gap: 8,
    marginBottom: 12,
  },
  detailRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  notesBreakdownWrapper: {
    marginTop: 4,
  },
  notesSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSubtle,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  noteStatBox: {
    flex: 1,
    minWidth: 50,
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  noteStatLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.textSubtle,
    marginBottom: 2,
  },
  noteStatValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },
});

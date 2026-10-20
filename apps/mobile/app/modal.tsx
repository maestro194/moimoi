import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS, getDifficultyColor, getRankBadge, formatAchievement } from '../constants/Theme';
import { Music2, Trophy, Disc, Calendar, X } from 'lucide-react-native';

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
  const internalLevel = parseFloat(params.internalLevel ?? '0');
  const achNum = parseFloat(params.achievement ?? '0');
  const rankInfo = getRankBadge(achNum);
  const ratingPoints = parseInt(params.rating ?? '0', 10);
  const imageUrl = params.imageUrl;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header with Close Button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chart Details</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <X size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Jacket Art */}
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
        <Text style={styles.songArtist}>{params.artist || 'Unknown Artist'}</Text>

        {/* Chart Badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: songType === 'DX' ? COLORS.cyan + '20' : COLORS.blue + '20' }]}>
            <Text style={[styles.typeBadgeText, { color: songType === 'DX' ? COLORS.cyan : COLORS.blue }]}>{songType}</Text>
          </View>
          <View style={[styles.diffBadge, { backgroundColor: diffColor }]}>
            <Text style={styles.diffBadgeText}>
              {difficulty} {difficulty === 'UTAGE' ? 'UTAGE' : internalLevel.toFixed(1)}
            </Text>
          </View>
          <View style={[styles.rankBadge, { backgroundColor: rankInfo.bg }]}>
            <Text style={[styles.rankBadgeText, { color: rankInfo.color }]}>{rankInfo.label}</Text>
          </View>
          {params.fc && (
            <View style={styles.fcBadge}>
              <Text style={styles.fcText}>{params.fc}</Text>
            </View>
          )}
          {params.fs && (
            <View style={styles.fsBadge}>
              <Text style={styles.fsText}>{params.fs}</Text>
            </View>
          )}
        </View>

        {/* Score & Rating Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ACHIEVEMENT</Text>
            <Text style={styles.statValue}>{formatAchievement(achNum)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>DX RATING</Text>
            <Text style={[styles.statValue, { color: COLORS.cyan }]}>+{ratingPoints}</Text>
          </View>
        </View>

        {/* Additional Chart Information */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconCol}>
              <Disc size={16} color={COLORS.purpleLight} />
            </View>
            <Text style={styles.infoKey}>Chart Type</Text>
            <Text style={styles.infoVal}>{songType === 'DX' ? 'DX Chart' : 'Standard Chart'}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconCol}>
              <Trophy size={16} color={COLORS.amber} />
            </View>
            <Text style={styles.infoKey}>Internal Level</Text>
            <Text style={styles.infoVal}>{difficulty === 'UTAGE' ? 'Special' : internalLevel.toFixed(1)}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconCol}>
              <Calendar size={16} color={COLORS.cyan} />
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
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  jacketWrapper: {
    marginVertical: 16,
  },
  jacketBorder: {
    width: 140,
    height: 140,
    borderRadius: 20,
    borderWidth: 2.5, // Standardized 2.5px border
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
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
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
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    width: '100%',
    marginBottom: 16,
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
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSubtle,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoIconCol: {
    width: 24,
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
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLocalData } from '../../db/useLocalData';
import { COLORS, DIFF_COLOR, getDifficultyColor, getRankBadge, formatAchievement } from '../../constants/Theme';
import { RefreshCw, Sparkles, TrendingUp, Trophy, ArrowRight, Music2, User, Target } from 'lucide-react-native';

export default function DashboardScreen() {
  const router = useRouter();
  const {
    loading,
    syncing,
    lastSyncedAt,
    profile,
    ratingData,
    targetSuggestions,
    songsCount,
    triggerSync,
    reload,
  } = useLocalData();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  };

  const handleManualSync = async () => {
    try {
      await triggerSync();
      Alert.alert('Sync Complete', 'Scores and songs updated successfully!');
    } catch (err: any) {
      Alert.alert('Sync Failed', err?.message || 'Could not connect to server.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.purpleLight} />
        <Text style={styles.loadingText}>Loading maimai data…</Text>
      </View>
    );
  }

  const totalRating = ratingData?.totalRating ?? 0;
  const b35Sum = ratingData?.oldRating ?? 0;
  const b15Sum = ratingData?.newRating ?? 0;
  const b35Count = ratingData?.oldCharts?.length ?? 0;
  const b15Count = ratingData?.newCharts?.length ?? 0;

  // Next milestone calculation
  const nextMilestone = Math.ceil((totalRating + 1) / 1000) * 1000;
  const prevMilestone = nextMilestone - 1000;
  const progressPercent = Math.min(100, Math.max(0, ((totalRating - prevMilestone) / 1000) * 100));

  // Top 5 highest rated charts
  const topScores = [...(ratingData?.oldCharts ?? []), ...(ratingData?.newCharts ?? [])]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.purpleLight} />
      }
    >
      {/* Sync Status Banner */}
      <View style={styles.syncBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.syncLabel}>DATABASE STATUS</Text>
          <Text style={styles.syncTime}>
            {lastSyncedAt ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not synced yet'}
            {songsCount > 0 ? ` • ${songsCount.toLocaleString()} songs` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
          onPress={handleManualSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <RefreshCw size={14} color="#fff" />
              <Text style={styles.syncButtonText}>Sync Now</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Player Profile Card */}
      {profile?.name ? (
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <User size={24} color="#fff" />
              </View>
            )}
            <View style={styles.profileInfo}>
              {profile.title && (
                <View style={styles.titleBadge}>
                  <Text style={styles.titleBadgeText} numberOfLines={1}>{profile.title}</Text>
                </View>
              )}
              <Text style={styles.playerName}>{profile.name}</Text>
              <View style={styles.playerMetaRow}>
                {profile.ratingBase && (
                  <Image source={{ uri: profile.ratingBase }} style={styles.ratingBaseImg} resizeMode="contain" />
                )}
                <Text style={styles.profileRatingText}>{profile.rating || totalRating}</Text>
              </View>
            </View>
          </View>

          <View style={styles.profileStatsRow}>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatLabel}>STARS</Text>
              <Text style={styles.profileStatVal}>★ {profile.stars || '0'}</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatLabel}>VER. PLAYS</Text>
              <Text style={styles.profileStatVal}>{profile.versionPlays || '0'}</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatLabel}>TOTAL PLAYS</Text>
              <Text style={styles.profileStatVal}>{profile.totalPlays || '0'}</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Main Rating Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.trophyIconContainer}>
            <Trophy size={20} color={COLORS.purpleLight} />
          </View>
          <Text style={styles.heroBadge}>DX RATING</Text>
        </View>

        <Text style={styles.ratingNumber}>{totalRating.toLocaleString()}</Text>

        {/* Milestone Progress Bar */}
        <View style={styles.milestoneContainer}>
          <View style={styles.milestoneHeader}>
            <Text style={styles.milestoneLabel}>Progress to {nextMilestone.toLocaleString()}</Text>
            <Text style={styles.milestoneDiff}>+{nextMilestone - totalRating} pts</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* B35 + B15 Breakdown Split */}
        <View style={styles.splitRow}>
          {/* B35 Old Charts */}
          <View style={styles.splitBox}>
            <Text style={styles.splitTitle}>OLD CHARTS (B35)</Text>
            <Text style={styles.splitValue}>{b35Sum.toLocaleString()}</Text>
            <Text style={styles.splitSub}>{b35Count}/35 filled • avg {b35Count ? (b35Sum / b35Count).toFixed(1) : 0}</Text>
          </View>

          <View style={styles.splitDivider} />

          {/* B15 New Charts */}
          <View style={styles.splitBox}>
            <Text style={styles.splitTitle}>NEW CHARTS (B15)</Text>
            <Text style={styles.splitValue}>{b15Sum.toLocaleString()}</Text>
            <Text style={styles.splitSub}>{b15Count}/15 filled • avg {b15Count ? (b15Sum / b15Count).toFixed(1) : 0}</Text>
          </View>
        </View>
      </View>

      {/* Top Scores Section */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Sparkles size={18} color={COLORS.purpleLight} />
          <Text style={styles.sectionTitle}>Top Contributing Charts</Text>
        </View>
        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={() => router.push('/(tabs)/scores')}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <ArrowRight size={14} color={COLORS.purpleLight} />
        </TouchableOpacity>
      </View>

      {topScores.length === 0 ? (
        <View style={styles.emptyCard}>
          <Music2 size={32} color={COLORS.textSubtle} />
          <Text style={styles.emptyTitle}>No Scores Synced Yet</Text>
          <Text style={styles.emptySubtitle}>
            Go to Settings and configure your SEGA ID, then tap Sync Now above.
          </Text>
        </View>
      ) : (
        topScores.map((item, index) => {
          const diffColor = getDifficultyColor(item.difficulty);
          const rankInfo = getRankBadge(typeof item.achievement === 'string' ? parseFloat(item.achievement) : item.achievement);

          return (
            <TouchableOpacity
              key={`${item.songTitle}-${item.difficulty}-${index}`}
              style={styles.scoreRow}
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
              <View style={styles.rankIndex}>
                <Text style={styles.rankIndexText}>#{index + 1}</Text>
              </View>

              {/* Jacket art thumbnail with difficulty border */}
              <View style={[styles.jacketContainer, { borderColor: diffColor }]}>
                {item.song?.image_url ? (
                  <Image
                    source={{ uri: `https://maimaidx-eng.com/maimai-mobile/img/Music/${item.song.image_url}` }}
                    style={styles.jacketImage}
                  />
                ) : (
                  <View style={[styles.jacketPlaceholder, { backgroundColor: diffColor + '20' }]}>
                    <Music2 size={16} color={diffColor} />
                  </View>
                )}
              </View>

              {/* Title & Info */}
              <View style={styles.scoreInfo}>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {item.songTitle}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.diffBadge, { backgroundColor: diffColor }]}>
                    <Text style={styles.diffBadgeText}>
                      {item.difficulty} {item.difficulty === 'UTAGE' ? (item.song?.lev_utage || '?') : item.internalLevel.toFixed(1)}
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
                </View>
              </View>

              {/* Score and Rating Contribution */}
              <View style={styles.scoreValues}>
                <Text style={styles.achievementText}>
                  {formatAchievement(typeof item.achievement === 'string' ? parseFloat(item.achievement) : item.achievement)}
                </Text>
                <Text style={styles.ratingDeltaText}>+{item.rating}</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Rating Improvement Targets */}
      {targetSuggestions.length > 0 && (
        <View style={styles.targetSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Target size={18} color={COLORS.amber} />
              <Text style={styles.sectionTitle}>Rating Improvement Targets</Text>
            </View>
            <View style={styles.targetCountBadge}>
              <Text style={styles.targetCountText}>{targetSuggestions.length} Available</Text>
            </View>
          </View>

          {targetSuggestions.slice(0, 5).map((s, index) => {
            const diffColor = getDifficultyColor(s.difficulty);
            return (
              <TouchableOpacity
                key={`target-${s.songTitle}-${s.difficulty}-${index}`}
                style={styles.targetRow}
                onPress={() => {
                  router.push({
                    pathname: '/modal',
                    params: {
                      title: s.songTitle,
                      difficulty: s.difficulty,
                      achievement: String(s.currentAchievement),
                      internalLevel: String(s.internalLevel),
                      rating: String(s.currentRating),
                      songType: 'DX',
                      fc: s.fc ?? '',
                      fs: s.fs ?? '',
                      artist: s.song?.artist ?? '',
                      imageUrl: s.song?.image_url ?? '',
                    },
                  });
                }}
              >
                <View style={[styles.jacketContainer, { borderColor: diffColor }]}>
                  {s.song?.image_url ? (
                    <Image
                      source={{ uri: `https://maimaidx-eng.com/maimai-mobile/img/Music/${s.song.image_url}` }}
                      style={styles.jacketImage}
                    />
                  ) : (
                    <View style={[styles.jacketPlaceholder, { backgroundColor: diffColor + '20' }]}>
                      <Music2 size={16} color={diffColor} />
                    </View>
                  )}
                </View>

                <View style={styles.targetInfo}>
                  <Text style={styles.songTitle} numberOfLines={1}>{s.songTitle}</Text>
                  <View style={styles.targetPathRow}>
                    <View style={[styles.diffBadge, { backgroundColor: diffColor }]}>
                      <Text style={styles.diffBadgeText}>{s.difficulty} {s.internalLevel > 0 ? s.internalLevel.toFixed(1) : '?'}</Text>
                    </View>
                    <Text style={styles.targetPathText}>
                      {s.currentRank} {s.currentAchievement.toFixed(2)}% →{' '}
                      <Text style={{ color: COLORS.amber, fontWeight: '800' }}>
                        {s.targetRank} {s.targetAchievement.toFixed(1)}%
                      </Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.targetDeltaCol}>
                  <Text style={styles.targetDeltaLabel}>Total Δ</Text>
                  <Text style={styles.targetDeltaVal}>+{s.totalRatingGain.toFixed(0)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 16,
  },
  syncLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSubtle,
    letterSpacing: 0.5,
  },
  syncTime: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.purple,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    marginBottom: 24,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  trophyIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.purpleLight,
    letterSpacing: 1,
  },
  ratingNumber: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -1,
    marginVertical: 4,
  },
  milestoneContainer: {
    marginTop: 12,
    marginBottom: 18,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  milestoneLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  milestoneDiff: {
    fontSize: 11,
    color: COLORS.cyan,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.cyan,
    borderRadius: 4,
  },
  splitRow: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  splitBox: {
    flex: 1,
  },
  splitDivider: {
    width: 1,
    backgroundColor: COLORS.borderSubtle,
    marginHorizontal: 12,
  },
  splitTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSubtle,
    letterSpacing: 0.5,
  },
  splitValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  splitSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.purpleLight,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  rankIndex: {
    width: 24,
    alignItems: 'center',
    marginRight: 6,
  },
  rankIndexText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSubtle,
  },
  jacketContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  jacketImage: {
    width: '100%',
    height: '100%',
  },
  jacketPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  songTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diffBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
  },
  rankBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rankBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  fcBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
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
  // Profile Card Styles
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarImg: {
    width: 60,
    height: 60,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.amber,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  profileInfo: {
    flex: 1,
  },
  titleBadge: {
    backgroundColor: '#3b3839',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#555',
    marginBottom: 4,
  },
  titleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  playerName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 1,
  },
  playerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  ratingBaseImg: {
    width: 44,
    height: 18,
  },
  profileRatingText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.purpleLight,
  },
  profileStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.borderSubtle,
  },
  profileStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textSubtle,
    letterSpacing: 0.5,
  },
  profileStatVal: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  // Target Section Styles
  targetSection: {
    marginTop: 20,
  },
  targetCountBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  targetCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.amber,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  targetInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  targetPathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  targetPathText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  targetDeltaCol: {
    alignItems: 'flex-end',
  },
  targetDeltaLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textSubtle,
  },
  targetDeltaVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4ade80',
  },
});

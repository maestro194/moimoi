import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useLocalData } from '../../db/useLocalData';
import { COLORS, getDifficultyColor, formatAchievement, getRankBadge } from '../../constants/Theme';
import type { SkillAxis, SkillTier } from '../../db/recommend';

export default function ArcadeScreen() {
  const {
    loading,
    syncing,
    ratingData,
    clusteredSessions,
    lastCredit,
    playerSkillProfile,
    segaOffline,
    fetchRecommendations,
    triggerSync,
    triggerWebDbSync,
  } = useLocalData();

  const [recMode, setRecMode] = useState<'push_skillset' | 'farm_rating'>('push_skillset');
  const [showPastSessions, setShowPastSessions] = useState(false);

  const recommendations = useMemo(() => {
    return fetchRecommendations(recMode);
  }, [fetchRecommendations, recMode]);

  const activeSession = clusteredSessions.find(s => s.isActive);

  const getTierColor = (tier: SkillTier) => {
    switch (tier) {
      case 'SSS+':
      case 'SSS':
        return '#f43f5e';
      case 'SS':
        return '#f59e0b';
      case 'S':
        return '#6366f1';
      case 'AAA':
        return '#22c55e';
      default:
        return '#9ca3af';
    }
  };

  const getSkillLabel = (skill: SkillAxis) => {
    switch (skill) {
      case 'TAP': return 'Tap';
      case 'SPIN': return 'Spin';
      case 'SPEED': return 'Speed';
      case 'STAMINA': return 'Stamina';
      case 'TECH': return 'Tech';
      case 'ACCURACY': return 'Accuracy';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={syncing}
          onRefresh={() => { void triggerSync(); }}
          tintColor={COLORS.purpleLight}
          colors={[COLORS.purpleLight]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Arcade Companion</Text>
          <Text style={styles.subtitle}>Zero-friction live arcade sync & recommendations</Text>
        </View>
        {ratingData && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingValue}>{ratingData.totalRating.toLocaleString()}</Text>
            <Text style={styles.ratingLabel}>DX RATING</Text>
          </View>
        )}
      </View>

      {/* SEGA Offline Alert Banner */}
      {segaOffline && (
        <View style={styles.segaOfflineBanner}>
          <Text style={styles.segaOfflineIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.segaOfflineTitle}>SEGA maimai NET is currently down / in maintenance</Text>
            <Text style={styles.segaOfflineSub}>
              Data successfully synced from your Web App Database cache.
            </Text>
          </View>
        </View>
      )}

      {/* Sync Buttons Group */}
      <View style={styles.syncButtonGroup}>
        <TouchableOpacity
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
          onPress={triggerSync}
          disabled={syncing}
          activeOpacity={0.8}
        >
          {syncing ? (
            <View style={styles.syncContent}>
              <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.syncButtonText}>Syncing...</Text>
            </View>
          ) : (
            <Text style={styles.syncButtonText}>⚡ Quick Sync (SEGA)</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.webDbSyncButton, syncing && styles.syncButtonDisabled]}
          onPress={triggerWebDbSync}
          disabled={syncing}
          activeOpacity={0.8}
        >
          <Text style={styles.webDbSyncButtonText}>☁️ Sync Web DB</Text>
        </TouchableOpacity>
      </View>

      {/* 1. Last Credit Result Card */}
      {lastCredit && lastCredit.tracks.length > 0 && (
        <View style={styles.lastCreditCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.rowAlign}>
              <Text style={styles.creditIcon}>⚡</Text>
              <Text style={styles.cardTitle}>Just Finished Credit</Text>
            </View>
            <View style={styles.deltaBadge}>
              <Text style={styles.deltaText}>
                {lastCredit.ratingDelta > 0 ? `+${lastCredit.ratingDelta} pts` : 'Stable (±0)'}
              </Text>
            </View>
          </View>

          <Text style={styles.lastCreditMeta}>
            {lastCredit.pbCount > 0 ? `🔥 ${lastCredit.pbCount} new PB achieved!` : 'Credit complete'}
          </Text>

          <View style={styles.tracksList}>
            {lastCredit.tracks.map((t, i) => {
              const diffColor = getDifficultyColor(t.difficulty);
              const rank = getRankBadge(t.achievement);
              return (
                <View key={i} style={styles.trackItem}>
                  <View style={styles.trackLeft}>
                    <View style={[styles.diffBadge, { backgroundColor: diffColor }]}>
                      <Text style={styles.diffText}>{t.difficulty}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trackTitle} numberOfLines={1}>
                        {t.song_title}
                      </Text>
                      <Text style={styles.trackSub}>
                        Track {t.track ?? i + 1} • {formatAchievement(t.achievement)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rowAlign}>
                    {t.isPB && (
                      <View style={styles.pbBadge}>
                        <Text style={styles.pbText}>NEW PB</Text>
                      </View>
                    )}
                    <View style={[styles.rankChip, { backgroundColor: rank.bg }]}>
                      <Text style={[styles.rankChipText, { color: rank.color }]}>{rank.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 2. 6-Axis Player Skill Stats (EXP+) */}
      {playerSkillProfile && (
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>🎯 6-Axis Skill Profile</Text>
            <Text style={styles.tagSubtitle}>EXP+ Only</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Calculated from your Top 15 performances on Expert & Master charts.
          </Text>

          <View style={styles.skillGrid}>
            {(Object.keys(playerSkillProfile.stats) as SkillAxis[]).map(skill => {
              const val = playerSkillProfile.stats[skill];
              const tier = playerSkillProfile.tiers[skill];
              const isWeakest = skill === playerSkillProfile.weakestSkill;
              const isStrongest = skill === playerSkillProfile.strongestSkill;
              const tierColor = getTierColor(tier);

              return (
                <View key={skill} style={[styles.skillBox, isWeakest && styles.skillBoxWeak]}>
                  <View style={styles.skillTopRow}>
                    <Text style={styles.skillName}>{getSkillLabel(skill)}</Text>
                    <View style={[styles.skillTierBadge, { backgroundColor: tierColor }]}>
                      <Text style={styles.skillTierText}>{tier}</Text>
                    </View>
                  </View>

                  <Text style={styles.skillNumber}>{val.toFixed(1)} <Text style={styles.skillDenom}>/ 101</Text></Text>

                  {isWeakest && <Text style={styles.weakBadge}>Weakest (Focus)</Text>}
                  {isStrongest && <Text style={styles.strongBadge}>Peak Skill</Text>}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 3. What to Play Next (Target Suggestions) */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>🔥 What to Play Next</Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, recMode === 'push_skillset' && styles.toggleBtnActive]}
            onPress={() => setRecMode('push_skillset')}
          >
            <Text
              style={[styles.toggleText, recMode === 'push_skillset' && styles.toggleTextActive]}
            >
              Push Skillset
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, recMode === 'farm_rating' && styles.toggleBtnActive]}
            onPress={() => setRecMode('farm_rating')}
          >
            <Text
              style={[styles.toggleText, recMode === 'farm_rating' && styles.toggleTextActive]}
            >
              Farm Rating
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.toggleSubtext}>
          {recMode === 'push_skillset'
            ? `Targets your weakest skill (${playerSkillProfile ? getSkillLabel(playerSkillProfile.weakestSkill) : 'Stamina'}) to expand your skill ceiling.`
            : 'Finds achievable charts predicted to beat your B50 floor and gain DX Rating.'}
        </Text>

        {/* Target Cards */}
        {recommendations.length === 0 ? (
          <Text style={styles.emptyText}>No recommendations available. Sync your scores to populate!</Text>
        ) : (
          recommendations.map((rec, i) => {
            const diffColor = getDifficultyColor(rec.difficulty);
            return (
              <View key={i} style={styles.recCard}>
                <View style={styles.recTopRow}>
                  {rec.imageUrl ? (
                    <Image source={{ uri: rec.imageUrl }} style={styles.recJacket} />
                  ) : (
                    <View style={[styles.recJacket, styles.recJacketPlaceholder]}>
                      <Text style={styles.recJacketText}>🎵</Text>
                    </View>
                  )}

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={styles.rowAlign}>
                      <View style={[styles.diffBadge, { backgroundColor: diffColor }]}>
                        <Text style={styles.diffText}>{rec.difficulty} {rec.constant.toFixed(1)}</Text>
                      </View>
                      <View style={styles.challengeBadge}>
                        <Text style={styles.challengeText}>{rec.challengeTier}</Text>
                      </View>
                    </View>

                    <Text style={styles.recTitle} numberOfLines={1}>
                      {rec.songTitle}
                    </Text>
                    <Text style={styles.recArtist} numberOfLines={1}>
                      {rec.artist}
                    </Text>
                  </View>

                  <View style={styles.gainBox}>
                    <Text style={styles.gainLabel}>GAIN</Text>
                    <Text style={styles.gainVal}>{rec.gainDetail}</Text>
                  </View>
                </View>

                {/* Skills chips */}
                <View style={styles.chipsRow}>
                  {rec.primarySkills.map((ps, idx) => (
                    <View key={idx} style={styles.skillChip}>
                      <Text style={styles.skillChipText}>
                        {getSkillLabel(ps.skill)} {ps.value.toFixed(1)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Prediction & Target */}
                <View style={styles.recFooter}>
                  <Text style={styles.recPredict}>
                    Dự đoán: <Text style={styles.recPredictVal}>~{rec.predictedAchievement.toFixed(1)}%</Text>
                  </Text>
                  <Text style={styles.recTarget}>
                    Target: <Text style={styles.recTargetVal}>{rec.targetAchievement.toFixed(1)}% ({rec.targetRank})</Text>
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* 4. Active / Today's Session Summary */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>
            {activeSession ? '🟢 Active Arcade Session' : '⚪ Session Status'}
          </Text>
          {activeSession && <Text style={styles.liveBadge}>LIVE</Text>}
        </View>

        {activeSession ? (
          <View style={styles.sessionStatsRow}>
            <View style={styles.sessionStatItem}>
              <Text style={styles.sessionStatVal}>{activeSession.durationMinutes}m</Text>
              <Text style={styles.sessionStatLabel}>DURATION</Text>
            </View>
            <View style={styles.sessionStatItem}>
              <Text style={styles.sessionStatVal}>{activeSession.creditsCount}</Text>
              <Text style={styles.sessionStatLabel}>CREDITS</Text>
            </View>
            <View style={styles.sessionStatItem}>
              <Text style={styles.sessionStatVal}>{activeSession.tracksCount}</Text>
              <Text style={styles.sessionStatLabel}>TRACKS</Text>
            </View>
            <View style={styles.sessionStatItem}>
              <Text style={styles.sessionStatVal}>{activeSession.newPBs}</Text>
              <Text style={styles.sessionStatLabel}>PBs TODAY</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.idleSessionText}>
            No active session detected in the last 45 minutes. Quick Sync between credits at the arcade to track your live session!
          </Text>
        )}
      </View>

      {/* 5. Past Sessions Accordion */}
      {clusteredSessions.length > 0 && (
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.cardHeaderRow}
            onPress={() => setShowPastSessions(!showPastSessions)}
            activeOpacity={0.7}
          >
            <Text style={styles.cardTitle}>📜 Past Arcade Sessions ({clusteredSessions.length})</Text>
            <Text style={styles.toggleArrow}>{showPastSessions ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showPastSessions && (
            <View style={{ marginTop: 12 }}>
              {clusteredSessions.map((session, idx) => (
                <View key={session.id || idx} style={styles.pastSessionRow}>
                  <View>
                    <Text style={styles.pastDate}>
                      {new Date(session.startTime).toLocaleDateString()}
                    </Text>
                    <Text style={styles.pastMeta}>
                      {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {session.durationMinutes}m
                    </Text>
                  </View>
                  <View style={styles.rowAlign}>
                    <Text style={styles.pastCredits}>
                      {session.creditsCount} credit{session.creditsCount > 1 ? 's' : ''} ({session.tracksCount} tracks)
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* 6. Deferred Geofencing Card */}
      <View style={[styles.sectionCard, styles.deferredCard]}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.deferredTitle}>📍 Arcade Auto-Detection (Geofencing)</Text>
          <View style={styles.deferredBadge}>
            <Text style={styles.deferredBadgeText}>Deferred</Text>
          </View>
        </View>
        <Text style={styles.deferredSubtext}>
          Location-based automatic check-in is deferred for a future release per architectural decision #4. All session tracking functions seamlessly through zero-friction data sync.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  ratingBadge: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.purpleLight },
  ratingLabel: { fontSize: 9, color: COLORS.textSubtle, fontWeight: '600', marginTop: 1 },

  syncButtonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  syncButton: {
    flex: 1.4,
    backgroundColor: COLORS.purple,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  webDbSyncButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webDbSyncButtonText: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: 'bold',
  },
  segaOfflineBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  segaOfflineIcon: { fontSize: 16, marginRight: 8 },
  segaOfflineTitle: { fontSize: 12, fontWeight: 'bold', color: COLORS.amber },
  segaOfflineSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  syncButtonDisabled: { opacity: 0.6 },
  syncContent: { flexDirection: 'row', alignItems: 'center' },
  syncButtonText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },

  lastCreditCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowAlign: { flexDirection: 'row', alignItems: 'center' },
  creditIcon: { fontSize: 16, marginRight: 6 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  deltaBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deltaText: { color: COLORS.green, fontSize: 12, fontWeight: 'bold' },
  lastCreditMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, marginBottom: 10 },
  tracksList: { gap: 8 },
  trackItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    padding: 10,
    borderRadius: 8,
  },
  trackLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  diffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  diffText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
  trackTitle: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  trackSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  pbBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  pbText: { color: COLORS.amber, fontSize: 10, fontWeight: 'bold' },
  rankChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  rankChipText: { fontSize: 11, fontWeight: 'bold' },

  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagSubtitle: { fontSize: 11, color: COLORS.purpleLight, fontWeight: 'bold' },
  sectionDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, marginBottom: 12 },

  skillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  skillBox: {
    width: '48%',
    backgroundColor: COLORS.surfaceLight,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  skillBoxWeak: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  skillTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  skillName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  skillTierBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  skillTierText: { color: '#ffffff', fontSize: 9, fontWeight: 'bold' },
  skillNumber: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  skillDenom: { fontSize: 11, color: COLORS.textSubtle, fontWeight: 'normal' },
  weakBadge: { fontSize: 10, color: COLORS.red, fontWeight: 'bold', marginTop: 4 },
  strongBadge: { fontSize: 10, color: COLORS.green, fontWeight: 'bold', marginTop: 4 },

  toggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 3,
    marginTop: 10,
    marginBottom: 6,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: { backgroundColor: COLORS.purple },
  toggleText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  toggleTextActive: { color: '#ffffff' },
  toggleSubtext: { fontSize: 12, color: COLORS.textMuted, marginBottom: 12 },

  emptyText: { color: COLORS.textSubtle, fontSize: 13, fontStyle: 'italic', marginVertical: 8 },

  recCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  recTopRow: { flexDirection: 'row', alignItems: 'center' },
  recJacket: { width: 44, height: 44, borderRadius: 6 },
  recJacketPlaceholder: {
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recJacketText: { fontSize: 20 },
  challengeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  challengeText: { color: COLORS.textMuted, fontSize: 9, fontWeight: '600' },
  recTitle: { color: COLORS.text, fontSize: 13, fontWeight: 'bold', marginTop: 3 },
  recArtist: { color: COLORS.textSubtle, fontSize: 11 },
  gainBox: { alignItems: 'flex-end', minWidth: 65 },
  gainLabel: { fontSize: 9, color: COLORS.textSubtle, fontWeight: 'bold' },
  gainVal: { fontSize: 11, color: COLORS.green, fontWeight: 'bold', marginTop: 2 },

  chipsRow: { flexDirection: 'row', gap: 6, marginVertical: 6 },
  skillChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skillChipText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '500' },

  recFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  recPredict: { fontSize: 11, color: COLORS.textSubtle },
  recPredictVal: { color: COLORS.text, fontWeight: '600' },
  recTarget: { fontSize: 11, color: COLORS.textSubtle },
  recTargetVal: { color: COLORS.amber, fontWeight: 'bold' },

  liveBadge: {
    fontSize: 10,
    color: COLORS.green,
    fontWeight: 'bold',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sessionStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  sessionStatItem: { alignItems: 'center' },
  sessionStatVal: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  sessionStatLabel: { fontSize: 9, color: COLORS.textSubtle, fontWeight: '600', marginTop: 2 },
  idleSessionText: { fontSize: 12, color: COLORS.textMuted, marginTop: 6, lineHeight: 18 },

  toggleArrow: { fontSize: 12, color: COLORS.textMuted },
  pastSessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  pastDate: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  pastMeta: { fontSize: 11, color: COLORS.textSubtle, marginTop: 1 },
  pastCredits: { fontSize: 12, color: COLORS.purpleLight, fontWeight: '500' },

  deferredCard: { opacity: 0.6 },
  deferredTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  deferredBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deferredBadgeText: { fontSize: 10, color: COLORS.textSubtle },
  deferredSubtext: { fontSize: 11, color: COLORS.textSubtle, marginTop: 6, lineHeight: 16 },
});

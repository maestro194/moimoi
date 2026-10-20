import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalData } from '../../db/useLocalData';
import { COLORS, getDifficultyColor, getRankBadge, formatAchievement } from '../../constants/Theme';
import { Clock, ChevronDown, ChevronUp, Music2 } from 'lucide-react-native';

interface PlayItem {
  id: number;
  song_title: string;
  difficulty: string;
  song_type: string;
  achievement: number;
  dx_score: number | null;
  fc: string | null;
  fs: string | null;
  track: number | null;
  details: string | null;
  played_at: string;
  song?: any;
}

interface CreditGroup {
  id: string;
  timestamp: Date;
  plays: PlayItem[];
}

function groupPlaysIntoSessions(plays: PlayItem[]): CreditGroup[] {
  const groups: CreditGroup[] = [];
  let currentGroup: CreditGroup | null = null;

  for (let i = 0; i < plays.length; i++) {
    const play = plays[i];
    const playDate = new Date(play.played_at);

    if (!currentGroup) {
      currentGroup = { id: play.id.toString(), timestamp: playDate, plays: [] };
      groups.push(currentGroup);
    }

    currentGroup.plays.push(play);

    const nextPlay = plays[i + 1];
    if (nextPlay) {
      const nextDate = new Date(nextPlay.played_at);
      const timeDiffMs = playDate.getTime() - nextDate.getTime();
      const isBigGap = timeDiffMs > 30 * 60 * 1000;
      const isTrackAnomaly =
        play.track !== null &&
        nextPlay.track !== null &&
        nextPlay.track >= play.track;

      if (play.track === 1 || isBigGap || isTrackAnomaly) {
        currentGroup = null;
      }
    }
  }

  return groups;
}

export default function SessionsScreen() {
  const { loading, recentPlays } = useLocalData();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const sessions = useMemo(() => {
    return groupPlaysIntoSessions(recentPlays as any[]);
  }, [recentPlays]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.purpleLight} />
        <Text style={styles.loadingText}>Loading recent plays…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: session, index: sessionIdx }) => {
          return (
            <View style={styles.sessionCard}>
              {/* Session Header */}
              <View style={styles.sessionHeader}>
                <View style={styles.sessionHeaderLeft}>
                  <Clock size={14} color={COLORS.purpleLight} />
                  <Text style={styles.sessionTimeText}>
                    {session.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })}{' • '}
                    {session.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.sessionBadge}>
                  <Text style={styles.sessionBadgeText}>{session.plays.length} {session.plays.length === 1 ? 'play' : 'plays'}</Text>
                </View>
              </View>

              {/* Plays in session */}
              {session.plays.map((play, playIdx) => {
                const diffColor = getDifficultyColor(play.difficulty);
                const rankInfo = getRankBadge(play.achievement);
                const isExpanded = expandedId === play.id;

                let parsedDetails: any = null;
                if (play.details) {
                  try {
                    parsedDetails = JSON.parse(play.details);
                  } catch {}
                }

                return (
                  <View key={play.id} style={[styles.playRowWrapper, playIdx > 0 && styles.playRowBorder]}>
                    <TouchableOpacity
                      style={styles.playRow}
                      onPress={() => setExpandedId(isExpanded ? null : play.id)}
                    >
                      {/* Track indicator */}
                      <View style={styles.trackCol}>
                        <Text style={styles.trackText}>T{play.track ?? playIdx + 1}</Text>
                      </View>

                      {/* Jacket with 2.5px diff border */}
                      <View style={[styles.jacketBox, { borderColor: diffColor }]}>
                        {play.song?.image_url ? (
                          <Image
                            source={{ uri: `https://maimaidx-eng.com/maimai-mobile/img/Music/${play.song.image_url}` }}
                            style={styles.jacketImg}
                          />
                        ) : (
                          <View style={[styles.jacketFallback, { backgroundColor: diffColor + '20' }]}>
                            <Music2 size={14} color={diffColor} />
                          </View>
                        )}
                      </View>

                      {/* Title & Difficulty */}
                      <View style={styles.playInfo}>
                        <Text style={styles.playTitle} numberOfLines={1}>{play.song_title}</Text>
                        <View style={styles.badgeRow}>
                          <View style={[styles.diffBadge, { backgroundColor: diffColor }]}>
                            <Text style={styles.diffBadgeText}>{play.difficulty}</Text>
                          </View>
                          <View style={[styles.rankBadge, { backgroundColor: rankInfo.bg }]}>
                            <Text style={[styles.rankBadgeText, { color: rankInfo.color }]}>{rankInfo.label}</Text>
                          </View>
                          {play.fc && (
                            <View style={styles.fcBadge}>
                              <Text style={styles.fcText}>{play.fc}</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Achievement % */}
                      <View style={styles.playScoreCol}>
                        <Text style={styles.achText}>{formatAchievement(play.achievement)}</Text>
                        {parsedDetails && (
                          <View style={styles.expandIcon}>
                            {isExpanded ? <ChevronUp size={14} color={COLORS.textSubtle} /> : <ChevronDown size={14} color={COLORS.textSubtle} />}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Expandable Note Breakdown */}
                    {isExpanded && parsedDetails && (
                      <View style={styles.breakdownBox}>
                        <Text style={styles.breakdownTitle}>Note Breakdown</Text>
                        <View style={styles.noteGrid}>
                          {['tap', 'hold', 'slide', 'touch', 'break'].map(noteType => {
                            const n = parsedDetails[noteType];
                            if (!n) return null;
                            const total = (n.cp ?? 0) + (n.p ?? 0) + (n.gr ?? 0) + (n.go ?? 0) + (n.miss ?? 0);
                            return (
                              <View key={noteType} style={styles.noteCol}>
                                <Text style={styles.noteTypeLabel}>{noteType.toUpperCase()}</Text>
                                <Text style={styles.noteCritText}>{n.cp ?? 0} cp</Text>
                                <Text style={styles.notePerfText}>{n.p ?? 0} p</Text>
                                <Text style={styles.noteGreatText}>{n.gr ?? 0} gr</Text>
                                {(n.go > 0 || n.miss > 0) && (
                                  <Text style={styles.noteMissText}>{n.go ?? 0}g / {n.miss ?? 0}m</Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                        {(parsedDetails.fast !== undefined || parsedDetails.late !== undefined) && (
                          <View style={styles.timingRow}>
                            <Text style={styles.fastText}>FAST: {parsedDetails.fast ?? 0}</Text>
                            <Text style={styles.lateText}>LATE: {parsedDetails.late ?? 0}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Clock size={36} color={COLORS.textSubtle} />
            <Text style={styles.emptyText}>No recent play records cached</Text>
            <Text style={styles.emptySubtext}>Perform a sync from the Dashboard to load your play log.</Text>
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
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sessionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  sessionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  sessionBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.purpleLight,
  },
  playRowWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  playRowBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  playRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackCol: {
    width: 24,
    marginRight: 6,
  },
  trackText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSubtle,
  },
  jacketBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
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
  playInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  playTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  diffBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  diffBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
  },
  rankBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  rankBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  fcBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  fcText: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.amber,
  },
  playScoreCol: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  achText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  expandIcon: {
    padding: 2,
  },
  breakdownBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  breakdownTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSubtle,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  noteGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteCol: {
    alignItems: 'center',
  },
  noteTypeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  noteCritText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.cyan,
  },
  notePerfText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.amber,
  },
  noteGreatText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#f97316',
  },
  noteMissText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.red,
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  fastText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.blue,
  },
  lateText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e11d48',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

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
import { Clock, ChevronDown, ChevronUp, Music2, Star } from 'lucide-react-native';
import { solvePlayDetails } from '@maimai-suite/core';

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

function computeDrops(d: any) {
  if (!d?.tap || !d?.break) return null;

  const tap = (d.tap.cp ?? 0) + (d.tap.p ?? 0) + (d.tap.gr ?? 0) + (d.tap.go ?? 0) + (d.tap.miss ?? 0);
  const hold = (d.hold.cp ?? 0) + (d.hold.p ?? 0) + (d.hold.gr ?? 0) + (d.hold.go ?? 0) + (d.hold.miss ?? 0);
  const slide = (d.slide.cp ?? 0) + (d.slide.p ?? 0) + (d.slide.gr ?? 0) + (d.slide.go ?? 0) + (d.slide.miss ?? 0);
  const touch = (d.touch.cp ?? 0) + (d.touch.p ?? 0) + (d.touch.gr ?? 0) + (d.touch.go ?? 0) + (d.touch.miss ?? 0);

  const brk =
    (d.break.cp ?? 0) +
    (d.break.p_high ?? d.break.p2500 ?? d.break.p ?? 0) +
    (d.break.p_low ?? d.break.p2000 ?? 0) +
    (d.break.g_high ?? d.break.g1500 ?? d.break.gr ?? 0) +
    (d.break.g_mid ?? d.break.g1250 ?? 0) +
    (d.break.g_low ?? d.break.g1000 ?? d.break.go ?? 0) +
    (d.break.miss ?? 0);

  if (brk === 0) return null;

  const maxBase = tap * 500 + hold * 1000 + slide * 1500 + touch * 500 + brk * 2500;
  if (maxBase === 0) return null;

  const bpb = 1 / brk;
  const bpp = 100 / maxBase;

  const std = { gr: 100 * bpp, go: 250 * bpp, miss: 500 * bpp };
  const hld = { gr: 200 * bpp, go: 500 * bpp, miss: 1000 * bpp };
  const sld = { gr: 300 * bpp, go: 750 * bpp, miss: 1500 * bpp };

  const brkRates = {
    p2500: 0.25 * bpb,
    p2000: 0.5 * bpb,
    g1500: 0.6 * bpb + 500 * bpp,
    g1250: 0.6 * bpb + 1000 * bpp,
    g1000: 0.6 * bpb + 1250 * bpp,
    good: 0.7 * bpb + 1500 * bpp,
    miss: 1.0 * bpb + 2500 * bpp,
  };

  return { tap: std, hold: hld, slide: sld, touch: std, break: brkRates };
}

function computeMaxDxScore(d: any): number {
  if (!d?.tap) return 0;
  const brkTotal =
    (d.break.cp ?? 0) +
    (d.break.p_high ?? d.break.p2500 ?? d.break.p ?? 0) +
    (d.break.p_low ?? d.break.p2000 ?? 0) +
    (d.break.g_high ?? d.break.g1500 ?? d.break.gr ?? 0) +
    (d.break.g_mid ?? d.break.g1250 ?? 0) +
    (d.break.g_low ?? d.break.g1000 ?? d.break.go ?? 0) +
    (d.break.miss ?? 0);
  const total =
    (d.tap.cp ?? 0) + (d.tap.p ?? 0) + (d.tap.gr ?? 0) + (d.tap.go ?? 0) + (d.tap.miss ?? 0) +
    (d.hold.cp ?? 0) + (d.hold.p ?? 0) + (d.hold.gr ?? 0) + (d.hold.go ?? 0) + (d.hold.miss ?? 0) +
    (d.slide.cp ?? 0) + (d.slide.p ?? 0) + (d.slide.gr ?? 0) + (d.slide.go ?? 0) + (d.slide.miss ?? 0) +
    (d.touch.cp ?? 0) + (d.touch.p ?? 0) + (d.touch.gr ?? 0) + (d.touch.go ?? 0) + (d.touch.miss ?? 0) +
    brkTotal;
  return total * 3;
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
        renderItem={({ item: session }) => {
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
                  <Text style={styles.sessionBadgeText}>
                    {session.plays.length} {session.plays.length === 1 ? 'track' : 'tracks'}
                  </Text>
                </View>
              </View>

              {/* Plays in session */}
              {session.plays.map((play, playIdx) => {
                const diffColor = getDifficultyColor(play.difficulty);
                const rankInfo = getRankBadge(play.achievement);
                const isExpanded = expandedId === play.id;

                let rawDetails: any = null;
                if (play.details) {
                  try {
                    rawDetails = JSON.parse(play.details);
                  } catch {}
                }

                // Solve accurate break sub-tiers and loss rates
                const solvedDetails = rawDetails ? solvePlayDetails(rawDetails, play.achievement) : null;
                const dropRates = solvedDetails ? computeDrops(solvedDetails) : null;
                const maxDx = solvedDetails ? computeMaxDxScore(solvedDetails) : 0;
                let dxStars = 0;
                if (maxDx > 0 && play.dx_score) {
                  const p = play.dx_score / maxDx;
                  if (p >= 0.97) dxStars = 5;
                  else if (p >= 0.95) dxStars = 4;
                  else if (p >= 0.93) dxStars = 3;
                  else if (p >= 0.9) dxStars = 2;
                  else if (p >= 0.85) dxStars = 1;
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

                      {/* Title & Badges */}
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
                          {play.fs && (
                            <View style={styles.fsBadge}>
                              <Text style={styles.fsText}>{play.fs}</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Score & Expand Icon */}
                      <View style={styles.playScoreCol}>
                        <Text style={styles.achText}>{formatAchievement(play.achievement)}</Text>
                        {dxStars > 0 && (
                          <View style={styles.starsRow}>
                            {Array.from({ length: dxStars }).map((_, i) => (
                              <Star key={i} size={10} color={COLORS.amber} fill={COLORS.amber} />
                            ))}
                          </View>
                        )}
                        {solvedDetails && (
                          <View style={styles.expandIcon}>
                            {isExpanded ? <ChevronUp size={14} color={COLORS.textSubtle} /> : <ChevronDown size={14} color={COLORS.textSubtle} />}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Detailed Note Breakdown Table */}
                    {isExpanded && solvedDetails && (
                      <View style={styles.breakdownBox}>
                        <View style={styles.breakdownHeaderRow}>
                          <Text style={styles.breakdownHeaderTitle}>Loss Analysis</Text>
                          {maxDx > 0 && play.dx_score && (
                            <Text style={styles.dxScoreMeta}>
                              DX: {play.dx_score} / {maxDx} ({((play.dx_score / maxDx) * 100).toFixed(1)}%)
                            </Text>
                          )}
                        </View>

                        {/* Table Header */}
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tableColHeader, { flex: 1.2, textAlign: 'left' }]}>NOTE</Text>
                          <Text style={[styles.tableColHeader, { flex: 0.8 }]}>CNT</Text>
                          <Text style={[styles.tableColHeader, { flex: 1 }]}>CRIT</Text>
                          <Text style={[styles.tableColHeader, { flex: 1.2 }]}>PERF</Text>
                          <Text style={[styles.tableColHeader, { flex: 1.2 }]}>GREAT</Text>
                          <Text style={[styles.tableColHeader, { flex: 1 }]}>GD/MS</Text>
                          <Text style={[styles.tableColHeader, { flex: 1.2, textAlign: 'right' }]}>LOSS</Text>
                        </View>

                        {/* Standard Note Rows */}
                        {(['tap', 'hold', 'slide', 'touch'] as const).map(type => {
                          const n = solvedDetails[type];
                          if (!n) return null;
                          const total = (n.cp ?? 0) + (n.p ?? 0) + (n.gr ?? 0) + (n.go ?? 0) + (n.miss ?? 0);
                          if (total === 0) return null;

                          let loss = 0;
                          let grLoss = 0;
                          let goLoss = 0;
                          let missLoss = 0;
                          if (dropRates && dropRates[type]) {
                            const r = dropRates[type] as any;
                            grLoss = (r.gr ?? 0) * (n.gr ?? 0);
                            goLoss = (r.go ?? 0) * (n.go ?? 0);
                            missLoss = (r.miss ?? 0) * (n.miss ?? 0);
                            loss = grLoss + goLoss + missLoss;
                          }

                          return (
                            <View key={type} style={styles.tableRow}>
                              <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'left', fontWeight: '800', color: COLORS.purpleLight }]}>
                                {type.toUpperCase()}
                              </Text>
                              <Text style={[styles.tableCell, { flex: 0.8, color: COLORS.textMuted }]}>{total}</Text>
                              <Text style={[styles.tableCell, { flex: 1, color: COLORS.amber }]}>{n.cp ?? 0}</Text>
                              <Text style={[styles.tableCell, { flex: 1.2, color: COLORS.text }]}>{n.p ?? 0}</Text>
                              <View style={[styles.tableCellCol, { flex: 1.2 }]}>
                                <Text style={[styles.tableCell, { color: COLORS.pink }]}>{n.gr ?? 0}</Text>
                                {grLoss > 0 && <Text style={styles.miniLossText}>(-{grLoss.toFixed(3)}%)</Text>}
                              </View>
                              <View style={[styles.tableCellCol, { flex: 1 }]}>
                                <Text style={[styles.tableCell, { color: (n.go > 0 || n.miss > 0) ? COLORS.red : COLORS.textSubtle }]}>
                                  {n.go ?? 0}/{n.miss ?? 0}
                                </Text>
                              </View>
                              <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right', fontWeight: '700', color: loss > 0 ? COLORS.red : COLORS.textSubtle }]}>
                                {loss > 0 ? `-${loss.toFixed(4)}%` : '-'}
                              </Text>
                            </View>
                          );
                        })}

                        {/* Break Note Row (Exact 8-tier Sub-tiers) */}
                        {(() => {
                          const b = solvedDetails.break;
                          if (!b) return null;
                          const pHigh = b.p_high ?? b.p2500 ?? b.p ?? 0;
                          const pLow = b.p_low ?? b.p2000 ?? 0;
                          const gHigh = b.g_high ?? b.g1500 ?? b.gr ?? 0;
                          const gMid = b.g_mid ?? b.g1250 ?? 0;
                          const gLow = b.g_low ?? b.g1000 ?? b.go ?? 0;
                          const good = b.good ?? b.go ?? 0;
                          const miss = b.miss ?? 0;
                          const total = (b.cp ?? 0) + pHigh + pLow + gHigh + gMid + gLow + good + miss;
                          if (total === 0) return null;

                          let loss = 0;
                          if (dropRates?.break) {
                            const r = dropRates.break;
                            loss =
                              r.p2500 * pHigh +
                              r.p2000 * pLow +
                              r.g1500 * gHigh +
                              r.g1250 * gMid +
                              r.g1000 * gLow +
                              r.good * good +
                              r.miss * miss;
                          }

                          return (
                            <View style={[styles.tableRow, styles.tableRowBreak]}>
                              <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'left', fontWeight: '800', color: COLORS.red }]}>
                                BREAK
                              </Text>
                              <Text style={[styles.tableCell, { flex: 0.8, color: COLORS.textMuted }]}>{total}</Text>
                              <Text style={[styles.tableCell, { flex: 1, color: COLORS.amber, fontWeight: '800' }]}>{b.cp ?? 0}</Text>
                              <View style={[styles.tableCellCol, { flex: 1.2 }]}>
                                <Text style={[styles.tableCell, { color: COLORS.text, fontWeight: '700' }]}>{pHigh}-{pLow}</Text>
                              </View>
                              <View style={[styles.tableCellCol, { flex: 1.2 }]}>
                                <Text style={[styles.tableCell, { color: COLORS.pink, fontWeight: '700' }]}>{gHigh}-{gMid}-{gLow}</Text>
                              </View>
                              <Text style={[styles.tableCell, { flex: 1, color: (good > 0 || miss > 0) ? COLORS.red : COLORS.textSubtle }]}>
                                {good}/{miss}
                              </Text>
                              <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right', fontWeight: '800', color: loss > 0 ? COLORS.red : COLORS.textSubtle }]}>
                                {loss > 0 ? `-${loss.toFixed(4)}%` : '-'}
                              </Text>
                            </View>
                          );
                        })()}

                        {/* Timing Row */}
                        {(solvedDetails.fast !== undefined || solvedDetails.late !== undefined) && (
                          <View style={styles.timingRow}>
                            <Text style={styles.fastText}>FAST: {solvedDetails.fast ?? 0}</Text>
                            <Text style={styles.lateText}>LATE: {solvedDetails.late ?? 0}</Text>
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
    paddingBottom: 40,
  },
  sessionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  sessionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  sessionBadge: {
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sessionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.purpleLight,
  },
  playRowWrapper: {},
  playRowBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  playRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  trackCol: {
    width: 24,
    alignItems: 'center',
    marginRight: 6,
  },
  trackText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSubtle,
  },
  jacketBox: {
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
  playInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  playTitle: {
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
    borderRadius: 5,
  },
  diffBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
  },
  rankBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  rankBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  fcBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  fcText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.amber,
  },
  fsBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
  },
  fsText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.cyan,
  },
  playScoreCol: {
    alignItems: 'flex-end',
  },
  achText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  expandIcon: {
    marginTop: 4,
  },
  breakdownBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  breakdownHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.purpleLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dxScoreMeta: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.amber,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 4,
    marginBottom: 6,
  },
  tableColHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textSubtle,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  tableRowBreak: {
    backgroundColor: 'rgba(244, 114, 182, 0.06)',
    borderRadius: 6,
    paddingHorizontal: 2,
  },
  tableCell: {
    fontSize: 10,
    color: COLORS.text,
    textAlign: 'center',
  },
  tableCellCol: {
    alignItems: 'center',
  },
  miniLossText: {
    fontSize: 8,
    color: COLORS.red,
    marginTop: 1,
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  fastText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.cyan,
  },
  lateText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.amber,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
});

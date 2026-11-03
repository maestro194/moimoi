import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { COLORS, getDifficultyColor, formatAchievement } from '../constants/Theme';
import { X, Check, Trash2, Plus, Zap, Calculator, Sparkles, ChevronRight } from 'lucide-react-native';
import { chartOf, chartsOf, solvePlayDetails, SongIndex } from '@maimai-suite/core';
import type { SongRow, PlayLogRow } from '../db/schema';
import { saveManualCredit, updateManualPlay, deleteManualPlay, calculateDxScoreFromDetails } from '../db/sync';
import { Tap } from '@/components/Tap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MatrixRow {
  cp: string;
  p: string;
  gr: string;
  go: string;
  miss: string;
}

interface TrackFormState {
  songTitle: string;
  difficulty: string; // BAS, ADV, EXP, MAS, REMAS
  songType: 'DX' | 'STD';
  achievement: string;
  dxScore: string;
  fc: string;
  fs: string;
  entryMode: 'quick' | 'detailed';
  matrix: {
    tap: MatrixRow;
    hold: MatrixRow;
    slide: MatrixRow;
    touch: MatrixRow;
    break: MatrixRow;
  };
  fast: string;
  late: string;
  maxCombo: string;
}

const emptyMatrixRow = (): MatrixRow => ({ cp: '', p: '', gr: '', go: '', miss: '' });

const createInitialTrack = (trackNum: number): TrackFormState => ({
  songTitle: '',
  difficulty: 'MAS',
  songType: 'DX',
  achievement: '',
  dxScore: '',
  fc: '',
  fs: '',
  entryMode: 'quick',
  matrix: {
    tap: emptyMatrixRow(),
    hold: emptyMatrixRow(),
    slide: emptyMatrixRow(),
    touch: emptyMatrixRow(),
    break: emptyMatrixRow(),
  },
  fast: '',
  late: '',
  maxCombo: '',
});

interface ManualCreditModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  songs: SongRow[];
  initialPlay?: PlayLogRow | null;
}

const FC_OPTIONS = ['', 'FC', 'FC+', 'AP', 'AP+'];
const FS_OPTIONS = ['', 'FS', 'FS+', 'FDX', 'FDX+', 'SYNC'];
const DIFFICULTIES = ['BAS', 'ADV', 'EXP', 'MAS', 'REMAS'];

export default function ManualCreditModal({
  visible,
  onClose,
  onSuccess,
  songs,
  initialPlay,
}: ManualCreditModalProps) {
  // Full-screen RN Modal draws under the status bar and home indicator, so pad by the real insets
  const insets = useSafeAreaInsets();
  const isEditMode = Boolean(initialPlay);
  const [activeTrackIdx, setActiveTrackIdx] = useState(0);
  const [trackCount, setTrackCount] = useState(3);
  const [tracks, setTracks] = useState<TrackFormState[]>([
    createInitialTrack(1),
    createInitialTrack(2),
    createInitialTrack(3),
    createInitialTrack(4),
  ]);

  const [searchQueries, setSearchQueries] = useState<string[]>(['', '', '', '']);
  const [isSearching, setIsSearching] = useState<boolean[]>([false, false, false, false]);
  const [submitting, setSubmitting] = useState(false);

  // Initialize form state
  useEffect(() => {
    if (!visible) return;

    if (initialPlay) {
      setTrackCount(1);
      setActiveTrackIdx(0);

      let parsedDetails: any = null;
      if (initialPlay.details) {
        try {
          parsedDetails = typeof initialPlay.details === 'string'
            ? JSON.parse(initialPlay.details)
            : initialPlay.details;
        } catch {}
      }

      const hasMatrix = Boolean(parsedDetails?.tap || parsedDetails?.break);
      const b = parsedDetails?.break || {};

      const newTrack: TrackFormState = {
        songTitle: initialPlay.song_title,
        difficulty: initialPlay.difficulty,
        songType: (initialPlay.song_type === 'STD' ? 'STD' : 'DX'),
        achievement: initialPlay.achievement ? String(initialPlay.achievement) : '',
        dxScore: initialPlay.dx_score ? String(initialPlay.dx_score) : '',
        fc: initialPlay.fc || '',
        fs: initialPlay.fs || '',
        entryMode: hasMatrix ? 'detailed' : 'quick',
        matrix: {
          tap: {
            cp: parsedDetails?.tap?.cp ? String(parsedDetails.tap.cp) : '',
            p: parsedDetails?.tap?.p ? String(parsedDetails.tap.p) : '',
            gr: parsedDetails?.tap?.gr ? String(parsedDetails.tap.gr) : '',
            go: parsedDetails?.tap?.go ? String(parsedDetails.tap.go) : '',
            miss: parsedDetails?.tap?.miss ? String(parsedDetails.tap.miss) : '',
          },
          hold: {
            cp: parsedDetails?.hold?.cp ? String(parsedDetails.hold.cp) : '',
            p: parsedDetails?.hold?.p ? String(parsedDetails.hold.p) : '',
            gr: parsedDetails?.hold?.gr ? String(parsedDetails.hold.gr) : '',
            go: parsedDetails?.hold?.go ? String(parsedDetails.hold.go) : '',
            miss: parsedDetails?.hold?.miss ? String(parsedDetails.hold.miss) : '',
          },
          slide: {
            cp: parsedDetails?.slide?.cp ? String(parsedDetails.slide.cp) : '',
            p: parsedDetails?.slide?.p ? String(parsedDetails.slide.p) : '',
            gr: parsedDetails?.slide?.gr ? String(parsedDetails.slide.gr) : '',
            go: parsedDetails?.slide?.go ? String(parsedDetails.slide.go) : '',
            miss: parsedDetails?.slide?.miss ? String(parsedDetails.slide.miss) : '',
          },
          touch: {
            cp: parsedDetails?.touch?.cp ? String(parsedDetails.touch.cp) : '',
            p: parsedDetails?.touch?.p ? String(parsedDetails.touch.p) : '',
            gr: parsedDetails?.touch?.gr ? String(parsedDetails.touch.gr) : '',
            go: parsedDetails?.touch?.go ? String(parsedDetails.touch.go) : '',
            miss: parsedDetails?.touch?.miss ? String(parsedDetails.touch.miss) : '',
          },
          break: {
            cp: b.cp ? String(b.cp) : '',
            p: (b.p_high || b.p_low || b.p) ? String((b.p_high ?? 0) + (b.p_low ?? 0) || b.p) : '',
            gr: (b.g_high || b.g_mid || b.g_low || b.gr) ? String((b.g_high ?? 0) + (b.g_mid ?? 0) + (b.g_low ?? 0) || b.gr) : '',
            go: (b.good ?? b.go) ? String(b.good ?? b.go) : '',
            miss: b.miss ? String(b.miss) : '',
          },
        },
        fast: parsedDetails?.fast ? String(parsedDetails.fast) : '',
        late: parsedDetails?.late ? String(parsedDetails.late) : '',
        maxCombo: parsedDetails?.maxCombo ? String(parsedDetails.maxCombo) : '',
      };

      setTracks([newTrack, createInitialTrack(2), createInitialTrack(3), createInitialTrack(4)]);
      setSearchQueries([initialPlay.song_title, '', '', '']);
    } else {
      setTrackCount(3);
      setActiveTrackIdx(0);
      setTracks([
        createInitialTrack(1),
        createInitialTrack(2),
        createInitialTrack(3),
        createInitialTrack(4),
      ]);
      setSearchQueries(['', '', '', '']);
      setIsSearching([false, false, false, false]);
    }
  }, [visible, initialPlay]);

  const currentTrack = tracks[activeTrackIdx] || tracks[0];

  const updateCurrentTrack = (updater: Partial<TrackFormState>) => {
    setTracks(prev => {
      const next = [...prev];
      next[activeTrackIdx] = { ...next[activeTrackIdx], ...updater };
      return next;
    });
  };

  const updateMatrixCell = (
    noteType: 'tap' | 'hold' | 'slide' | 'touch' | 'break',
    col: keyof MatrixRow,
    value: string
  ) => {
    setTracks(prev => {
      const next = [...prev];
      const cur = next[activeTrackIdx];
      const newMatrix = {
        ...cur.matrix,
        [noteType]: {
          ...cur.matrix[noteType],
          [col]: value,
        },
      };
      next[activeTrackIdx] = { ...cur, matrix: newMatrix };
      return next;
    });
  };

  // Autocomplete suggestions for active track
  const activeQuery = searchQueries[activeTrackIdx] || '';
  const searchResults = useMemo(() => {
    if (!activeQuery.trim() || activeQuery.length < 1) return [];
    const q = activeQuery.toLowerCase().trim();
    const matches: SongRow[] = [];
    for (const s of songs) {
      if (
        s.title.toLowerCase().includes(q) ||
        (s.title_kana && s.title_kana.toLowerCase().includes(q)) ||
        (s.artist && s.artist.toLowerCase().includes(q))
      ) {
        matches.push(s);
        if (matches.length >= 8) break;
      }
    }
    return matches;
  }, [songs, activeQuery]);

  const songIndex = useMemo(() => new SongIndex(songs), [songs]);

  // Lookup current selected song object
  const selectedSong = useMemo(() => {
    if (!currentTrack.songTitle) return null;
    return songIndex.forChart({ songTitle: currentTrack.songTitle, difficulty: currentTrack.difficulty, songType: currentTrack.songType }) ?? null;
  }, [songIndex, currentTrack.songTitle, currentTrack.difficulty, currentTrack.songType]);

  // Selected chart: note counts (sheet) and constant
  const selectedChart = useMemo(
    () => (selectedSong ? chartOf(selectedSong, { difficulty: currentTrack.difficulty, type: currentTrack.songType }) : undefined),
    [selectedSong, currentTrack.difficulty, currentTrack.songType],
  );
  const selectedSheet = selectedChart?.sheet ?? null;
  const chartConstant = selectedChart?.constant !== undefined ? selectedChart.constant.toFixed(1) : null;

  // Live solver calculation
  const solverResult = useMemo(() => {
    const ach = parseFloat(currentTrack.achievement);
    if (isNaN(ach) || ach <= 0) return null;

    const m = currentTrack.matrix;
    const details = {
      tap: { cp: +m.tap.cp || 0, p: +m.tap.p || 0, gr: +m.tap.gr || 0, go: +m.tap.go || 0, miss: +m.tap.miss || 0 },
      hold: { cp: +m.hold.cp || 0, p: +m.hold.p || 0, gr: +m.hold.gr || 0, go: +m.hold.go || 0, miss: +m.hold.miss || 0 },
      slide: { cp: +m.slide.cp || 0, p: +m.slide.p || 0, gr: +m.slide.gr || 0, go: +m.slide.go || 0, miss: +m.slide.miss || 0 },
      touch: { cp: +m.touch.cp || 0, p: +m.touch.p || 0, gr: +m.touch.gr || 0, go: +m.touch.go || 0, miss: +m.touch.miss || 0 },
      break: { cp: +m.break.cp || 0, p: +m.break.p || 0, gr: +m.break.gr || 0, go: +m.break.go || 0, miss: +m.break.miss || 0 },
      fast: +currentTrack.fast || 0,
      late: +currentTrack.late || 0,
      maxCombo: +currentTrack.maxCombo || 0,
    };

    const hasNotes = (
      details.tap.cp + details.tap.p + details.tap.gr + details.tap.go + details.tap.miss +
      details.break.cp + details.break.p + details.break.gr + details.break.go + details.break.miss
    ) > 0;

    if (!hasNotes) return null;

    const solved = solvePlayDetails(details, ach);
    const computedDx = calculateDxScoreFromDetails(solved);
    return { solved, computedDx };
  }, [currentTrack.achievement, currentTrack.matrix, currentTrack.fast, currentTrack.late, currentTrack.maxCombo]);

  const selectSong = (song: SongRow) => {
    // Default to the song's MAS chart of its first type (DX when it has DX charts)
    const charts = chartsOf(song).filter(c => c.ref.difficulty !== 'UTAGE');
    const defaultType = charts[0]?.ref.type ?? 'DX';
    const hasMas = charts.some(c => c.ref.type === defaultType && c.ref.difficulty === 'MAS');

    updateCurrentTrack({
      songTitle: song.title,
      songType: defaultType,
      difficulty: hasMas ? 'MAS' : 'EXP',
    });

    setSearchQueries(prev => {
      const next = [...prev];
      next[activeTrackIdx] = song.title;
      return next;
    });

    setIsSearching(prev => {
      const next = [...prev];
      next[activeTrackIdx] = false;
      return next;
    });
  };

  const handleSave = async () => {
    // Validate tracks
    const filledTracks = tracks.slice(0, trackCount).filter(t => t.songTitle.trim() && t.achievement.trim());

    if (filledTracks.length === 0) {
      Alert.alert('Incomplete Entry', 'Please enter at least one track with a song title and achievement percentage.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode && initialPlay) {
        // Edit mode
        const t = tracks[0];
        const achNum = parseFloat(t.achievement);
        if (isNaN(achNum) || achNum < 0 || achNum > 101.0) {
          Alert.alert('Invalid Achievement', 'Achievement must be between 0.0000% and 101.0000%.');
          setSubmitting(false);
          return;
        }

        let detailsPayload: any = { isManual: true };
        if (t.entryMode === 'detailed' && solverResult?.solved) {
          detailsPayload = solverResult.solved;
          detailsPayload.isManual = true;
        }

        await updateManualPlay(initialPlay.id, {
          songTitle: t.songTitle,
          difficulty: t.difficulty,
          songType: t.songType,
          achievement: achNum,
          dxScore: t.dxScore ? parseInt(t.dxScore, 10) : (solverResult?.computedDx ?? null),
          fc: t.fc || null,
          fs: t.fs || null,
          details: detailsPayload,
        });

        Alert.alert('Play Updated', 'The manual play record was successfully updated.');
      } else {
        // Multi-track credit mode
        const payloadTracks = filledTracks.map((t, idx) => {
          const achNum = parseFloat(t.achievement);
          let detailsPayload: any = { isManual: true };
          let finalDx = t.dxScore ? parseInt(t.dxScore, 10) : null;

          if (t.entryMode === 'detailed') {
            const m = t.matrix;
            const rawDetails = {
              tap: { cp: +m.tap.cp || 0, p: +m.tap.p || 0, gr: +m.tap.gr || 0, go: +m.tap.go || 0, miss: +m.tap.miss || 0 },
              hold: { cp: +m.hold.cp || 0, p: +m.hold.p || 0, gr: +m.hold.gr || 0, go: +m.hold.go || 0, miss: +m.hold.miss || 0 },
              slide: { cp: +m.slide.cp || 0, p: +m.slide.p || 0, gr: +m.slide.gr || 0, go: +m.slide.go || 0, miss: +m.slide.miss || 0 },
              touch: { cp: +m.touch.cp || 0, p: +m.touch.p || 0, gr: +m.touch.go ? +m.touch.go : 0, go: +m.touch.go || 0, miss: +m.touch.miss || 0 },
              break: { cp: +m.break.cp || 0, p: +m.break.p || 0, gr: +m.break.gr || 0, go: +m.break.go || 0, miss: +m.break.miss || 0 },
              fast: +t.fast || 0,
              late: +t.late || 0,
              maxCombo: +t.maxCombo || 0,
            };
            detailsPayload = solvePlayDetails(rawDetails, achNum);
            detailsPayload.isManual = true;
            if (finalDx === null) {
              finalDx = calculateDxScoreFromDetails(detailsPayload);
            }
          }

          return {
            track: idx + 1,
            songTitle: t.songTitle,
            difficulty: t.difficulty,
            songType: t.songType,
            achievement: achNum,
            dxScore: finalDx,
            fc: t.fc || null,
            fs: t.fs || null,
            details: detailsPayload,
          };
        });

        const res = await saveManualCredit({ tracks: payloadTracks });
        if (res.offline) {
          Alert.alert('Logged Offline', 'Credit saved to device. It will sync with Neon once connection is established.');
        } else {
          Alert.alert('Credit Recorded', `Successfully logged credit with ${res.count} track(s)!`);
        }
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save credit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!initialPlay) return;
    Alert.alert(
      'Delete Manual Play',
      `Are you sure you want to delete this manual play for "${initialPlay.song_title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await deleteManualPlay(initialPlay.id);
              onSuccess?.();
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete play.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>
              {isEditMode ? 'Edit Manual Play' : 'Log Arcade Credit'}
            </Text>
            <View style={styles.manualTag}>
              <Text style={styles.manualTagText}>MANUAL</Text>
            </View>
          </View>
          <Tap label="Close" style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <X size={20} color={COLORS.textMuted} />
          </Tap>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Track Selector Tabs (In credit mode) */}
          {!isEditMode && (
            <View style={styles.trackTabBar}>
              {Array.from({ length: trackCount }).map((_, idx) => {
                const isSelected = activeTrackIdx === idx;
                const isFilled = Boolean(tracks[idx].songTitle && tracks[idx].achievement);
                return (
                  <Tap label={`Track ${idx + 1}, ${isFilled ? 'filled' : 'empty'}`} role="tab" selected={isSelected}
                    key={idx}
                    style={[styles.trackTab, isSelected && styles.trackTabActive]}
                    onPress={() => setActiveTrackIdx(idx)}
                  >
                    <View style={styles.trackTabContent}>
                      <Text style={[styles.trackTabLabel, isSelected && styles.trackTabLabelActive]}>
                        Track {idx + 1}
                      </Text>
                      <View
                        style={[
                          styles.statusDot,
                          isFilled ? styles.statusDotFilled : styles.statusDotEmpty,
                        ]}
                      />
                    </View>
                  </Tap>
                );
              })}

              {trackCount === 3 && (
                <Tap label="Add track 4"
                  style={styles.addTrackTab}
                  onPress={() => setTrackCount(4)}
                >
                  <Plus size={14} color={COLORS.cyan} />
                  <Text style={styles.addTrackText}>Track 4</Text>
                </Tap>
              )}
            </View>
          )}

          {/* Section: Song & Chart Selection */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>CHART SELECTION</Text>

            {/* Song Autocomplete Search Input */}
            <View style={styles.searchBox}>
              <TextInput accessibilityLabel="Search song"
                style={styles.searchInput}
                placeholder="Search song title or artist..."
                placeholderTextColor={COLORS.textSubtle}
                value={searchQueries[activeTrackIdx]}
                onChangeText={text => {
                  setSearchQueries(prev => {
                    const next = [...prev];
                    next[activeTrackIdx] = text;
                    return next;
                  });
                  setIsSearching(prev => {
                    const next = [...prev];
                    next[activeTrackIdx] = true;
                    return next;
                  });
                }}
                onFocus={() => {
                  setIsSearching(prev => {
                    const next = [...prev];
                    next[activeTrackIdx] = true;
                    return next;
                  });
                }}
              />
              {currentTrack.songTitle ? (
                <View style={styles.songSelectedCheck}>
                  <Check size={16} color={COLORS.green} />
                </View>
              ) : null}
            </View>

            {/* Autocomplete Dropdown List */}
            {isSearching[activeTrackIdx] && searchResults.length > 0 && (
              <View style={styles.dropdownList}>
                {searchResults.map(song => (
                  <Tap label={song.title}
                    key={song.title}
                    style={styles.dropdownItem}
                    onPress={() => selectSong(song)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dropdownTitle} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={styles.dropdownArtist} numberOfLines={1}>
                        {song.artist || song.catcode || 'maimai'}
                      </Text>
                    </View>
                    <ChevronRight size={16} color={COLORS.textSubtle} />
                  </Tap>
                ))}
              </View>
            )}

            {/* Chart Type (DX / STD) & Difficulty Chips */}
            <View style={styles.chartControlRow}>
              {/* Type Toggle */}
              <View style={styles.typeToggleGroup}>
                <Tap label="Chart type DX" role="radio" selected={currentTrack.songType === 'DX'}
                  style={[styles.typeBtn, currentTrack.songType === 'DX' && styles.typeBtnActive]}
                  onPress={() => updateCurrentTrack({ songType: 'DX' })}
                >
                  <Text style={[styles.typeBtnText, currentTrack.songType === 'DX' && styles.typeBtnTextActive]}>
                    DX
                  </Text>
                </Tap>
                <Tap label="Chart type STD" role="radio" selected={currentTrack.songType === 'STD'}
                  style={[styles.typeBtn, currentTrack.songType === 'STD' && styles.typeBtnActive]}
                  onPress={() => updateCurrentTrack({ songType: 'STD' })}
                >
                  <Text style={[styles.typeBtnText, currentTrack.songType === 'STD' && styles.typeBtnTextActive]}>
                    STD
                  </Text>
                </Tap>
              </View>

              {/* Constant preview if available */}
              {chartConstant && (
                <View style={styles.constantBadge}>
                  <Text style={styles.constantLabel}>CONST</Text>
                  <Text style={styles.constantValue}>{chartConstant}</Text>
                </View>
              )}
            </View>

            {/* Difficulty Chips */}
            <View style={styles.diffRow}>
              {DIFFICULTIES.map(diff => {
                const isSelected = currentTrack.difficulty.toUpperCase() === diff;
                const color = getDifficultyColor(diff);
                return (
                  <Tap label={`Difficulty ${diff}`} role="radio" selected={isSelected}
                    key={diff}
                    style={[
                      styles.diffChip,
                      isSelected && { backgroundColor: color, borderColor: color },
                    ]}
                    onPress={() => updateCurrentTrack({ difficulty: diff })}
                  >
                    <Text
                      style={[
                        styles.diffChipText,
                        isSelected ? { color: '#ffffff', fontWeight: '800' } : { color: COLORS.textMuted },
                      ]}
                    >
                      {diff}
                    </Text>
                  </Tap>
                );
              })}
            </View>

            {/* Sheet Note Counts Reference Banner */}
            {selectedSheet?.noteCounts && (
              <View style={styles.noteCountsBanner}>
                <Text style={styles.noteCountsText}>
                  🎯 Chart Notes: Tap {selectedSheet.noteCounts.tap ?? 0} • Hold {selectedSheet.noteCounts.hold ?? 0} • Slide {selectedSheet.noteCounts.slide ?? 0} • Touch {selectedSheet.noteCounts.touch ?? 0} • Break {selectedSheet.noteCounts.break ?? 0} (Total {selectedSheet.noteCounts.total ?? 0})
                </Text>
              </View>
            )}
          </View>

          {/* Section: Mode Switcher */}
          <View style={styles.modeTabBar}>
            <Tap label="Quick score" role="tab" selected={currentTrack.entryMode === 'quick'}
              style={[styles.modeTab, currentTrack.entryMode === 'quick' && styles.modeTabActive]}
              onPress={() => updateCurrentTrack({ entryMode: 'quick' })}
            >
              <Zap size={15} color={currentTrack.entryMode === 'quick' ? COLORS.purpleLight : COLORS.textMuted} />
              <Text
                style={[
                  styles.modeTabText,
                  currentTrack.entryMode === 'quick' && styles.modeTabTextActive,
                ]}
              >
                Quick Score
              </Text>
            </Tap>

            <Tap label="Detailed judgments" role="tab" selected={currentTrack.entryMode === 'detailed'}
              style={[styles.modeTab, currentTrack.entryMode === 'detailed' && styles.modeTabActive]}
              onPress={() => updateCurrentTrack({ entryMode: 'detailed' })}
            >
              <Calculator size={15} color={currentTrack.entryMode === 'detailed' ? COLORS.purpleLight : COLORS.textMuted} />
              <Text
                style={[
                  styles.modeTabText,
                  currentTrack.entryMode === 'detailed' && styles.modeTabTextActive,
                ]}
              >
                Detailed Judgments
              </Text>
            </Tap>
          </View>

          {/* Primary Achievement Input */}
          <View style={styles.sectionCard}>
            <View style={styles.achRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>ACHIEVEMENT RATE (%)</Text>
                <TextInput accessibilityLabel="Achievement rate"
                  style={styles.achInput}
                  placeholder="100.4128"
                  placeholderTextColor={COLORS.textSubtle}
                  keyboardType="numeric"
                  value={currentTrack.achievement}
                  onChangeText={val => updateCurrentTrack({ achievement: val })}
                />
              </View>

              <View style={{ width: 140 }}>
                <Text style={styles.sectionLabel}>DX SCORE (OPTIONAL)</Text>
                <TextInput accessibilityLabel="DX score"
                  style={styles.achInput}
                  placeholder={solverResult?.computedDx ? String(solverResult.computedDx) : '2450'}
                  placeholderTextColor={COLORS.textSubtle}
                  keyboardType="numeric"
                  value={currentTrack.dxScore}
                  onChangeText={val => updateCurrentTrack({ dxScore: val })}
                />
              </View>
            </View>

            {/* Medals & Clears (FC / FS) */}
            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>CLEAR MEDALS</Text>
            <View style={styles.medalsRow}>
              <View style={styles.medalGroup}>
                <Text style={styles.medalLabel}>Combo:</Text>
                {FC_OPTIONS.map(opt => (
                  <Tap label={`Full combo: ${opt}`} selected={currentTrack.fc === opt}
                    key={opt}
                    style={[
                      styles.medalChip,
                      currentTrack.fc === opt && styles.medalChipActive,
                    ]}
                    onPress={() => updateCurrentTrack({ fc: opt })}
                  >
                    <Text
                      style={[
                        styles.medalChipText,
                        currentTrack.fc === opt && styles.medalChipTextActive,
                      ]}
                    >
                      {opt || 'None'}
                    </Text>
                  </Tap>
                ))}
              </View>

              <View style={styles.medalGroup}>
                <Text style={styles.medalLabel}>Sync:</Text>
                {FS_OPTIONS.map(opt => (
                  <Tap label={`Full sync: ${opt}`} selected={currentTrack.fs === opt}
                    key={opt}
                    style={[
                      styles.medalChip,
                      currentTrack.fs === opt && styles.medalChipActive,
                    ]}
                    onPress={() => updateCurrentTrack({ fs: opt })}
                  >
                    <Text
                      style={[
                        styles.medalChipText,
                        currentTrack.fs === opt && styles.medalChipTextActive,
                      ]}
                    >
                      {opt || 'None'}
                    </Text>
                  </Tap>
                ))}
              </View>
            </View>
          </View>

          {/* Detailed Judgment Breakdown Grid */}
          {currentTrack.entryMode === 'detailed' && (
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionLabel}>NOTE JUDGMENTS MATRIX</Text>
                <Text style={styles.matrixHint}>Cabinet Result Screen</Text>
              </View>

              {/* Table Header */}
              <View style={styles.matrixHeaderRow}>
                <Text style={[styles.matrixHeaderCell, { flex: 1.2, textAlign: 'left' }]}>NOTE</Text>
                <Text style={[styles.matrixHeaderCell, { color: COLORS.amber }]}>CRIT</Text>
                <Text style={[styles.matrixHeaderCell, { color: COLORS.text }]}>PERF</Text>
                <Text style={[styles.matrixHeaderCell, { color: COLORS.pink }]}>GREAT</Text>
                <Text style={[styles.matrixHeaderCell, { color: COLORS.cyan }]}>GOOD</Text>
                <Text style={[styles.matrixHeaderCell, { color: COLORS.red }]}>MISS</Text>
              </View>

              {/* Rows: TAP, HOLD, SLIDE, TOUCH, BREAK */}
              {(['tap', 'hold', 'slide', 'touch', 'break'] as const).map(type => (
                <View key={type} style={styles.matrixRow}>
                  <Text style={[styles.matrixRowHeader, { flex: 1.2 }]}>
                    {type.toUpperCase()}
                  </Text>
                  {(['cp', 'p', 'gr', 'go', 'miss'] as const).map(col => (
                    <TextInput accessibilityLabel={`${type} ${{ cp: 'critical perfect', p: 'perfect', gr: 'great', go: 'good', miss: 'miss' }[col]}`}
                      key={col}
                      style={styles.matrixInput}
                      placeholder="0"
                      placeholderTextColor={COLORS.textSubtle}
                      keyboardType="numeric"
                      value={currentTrack.matrix[type][col]}
                      onChangeText={val => updateMatrixCell(type, col, val)}
                    />
                  ))}
                </View>
              ))}

              {/* Fast / Late / Max Combo Row */}
              <View style={styles.timingRow}>
                <View style={styles.timingCol}>
                  <Text style={styles.timingLabel}>FAST</Text>
                  <TextInput accessibilityLabel="Fast"
                    style={styles.timingInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.textSubtle}
                    keyboardType="numeric"
                    value={currentTrack.fast}
                    onChangeText={val => updateCurrentTrack({ fast: val })}
                  />
                </View>

                <View style={styles.timingCol}>
                  <Text style={styles.timingLabel}>LATE</Text>
                  <TextInput accessibilityLabel="Late"
                    style={styles.timingInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.textSubtle}
                    keyboardType="numeric"
                    value={currentTrack.late}
                    onChangeText={val => updateCurrentTrack({ late: val })}
                  />
                </View>

                <View style={styles.timingCol}>
                  <Text style={styles.timingLabel}>MAX COMBO</Text>
                  <TextInput accessibilityLabel="Max combo"
                    style={styles.timingInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.textSubtle}
                    keyboardType="numeric"
                    value={currentTrack.maxCombo}
                    onChangeText={val => updateCurrentTrack({ maxCombo: val })}
                  />
                </View>
              </View>

              {/* Live Solver Results Box */}
              {solverResult?.solved?.break && (
                <View style={styles.solverResultBox}>
                  <View style={styles.solverHeader}>
                    <Sparkles size={14} color={COLORS.amber} />
                    <Text style={styles.solverTitle}>Exact 8-Tier Break Solver Match</Text>
                  </View>

                  <View style={styles.solverBreakGrid}>
                    <Text style={styles.solverBreakText}>
                      Critical: <Text style={styles.boldWhite}>{solverResult.solved.break.cp}</Text> (2600)
                    </Text>
                    <Text style={styles.solverBreakText}>
                      P-High: <Text style={styles.boldWhite}>{solverResult.solved.break.p_high}</Text> (2550)
                    </Text>
                    <Text style={styles.solverBreakText}>
                      P-Low: <Text style={styles.boldWhite}>{solverResult.solved.break.p_low}</Text> (2500)
                    </Text>
                    <Text style={styles.solverBreakText}>
                      G-High: <Text style={styles.boldWhite}>{solverResult.solved.break.g_high}</Text> (2000)
                    </Text>
                    <Text style={styles.solverBreakText}>
                      G-Mid: <Text style={styles.boldWhite}>{solverResult.solved.break.g_mid}</Text> (1500)
                    </Text>
                    <Text style={styles.solverBreakText}>
                      G-Low: <Text style={styles.boldWhite}>{solverResult.solved.break.g_low}</Text> (1250)
                    </Text>
                  </View>

                  {solverResult.computedDx ? (
                    <Text style={styles.solverDxText}>
                      Computed DX Score: <Text style={styles.boldWhite}>{solverResult.computedDx}</Text>
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          )}

          {/* Submit & Action Buttons */}
          <View style={styles.actionButtons}>
            <Tap label={submitting ? 'Saving' : isEditMode ? 'Save changes' : `Log credit, ${trackCount} tracks`}
              style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {isEditMode ? 'Save Changes' : `Log Credit (${trackCount} Tracks)`}
                </Text>
              )}
            </Tap>

            {isEditMode && (
              <Tap label="Delete play"
                style={styles.deleteBtn}
                onPress={handleDelete}
                disabled={submitting}
              >
                <Trash2 size={16} color={COLORS.red} />
                <Text style={styles.deleteBtnText}>Delete Play</Text>
              </Tap>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  manualTag: {
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  manualTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.purpleLight,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  trackTabBar: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  trackTab: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
  },
  trackTabActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderColor: COLORS.purpleLight,
  },
  trackTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackTabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  trackTabLabelActive: {
    color: COLORS.purpleLight,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotFilled: {
    backgroundColor: COLORS.green,
  },
  statusDotEmpty: {
    backgroundColor: COLORS.border,
  },
  addTrackTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  addTrackText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.cyan,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: COLORS.text,
  },
  songSelectedCheck: {
    paddingLeft: 8,
  },
  dropdownList: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.purple,
    overflow: 'hidden',
    marginTop: -4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  dropdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  dropdownArtist: {
    fontSize: 11,
    color: COLORS.textSubtle,
  },
  chartControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  typeToggleGroup: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 2,
  },
  typeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  typeBtnActive: {
    backgroundColor: COLORS.purple,
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  typeBtnTextActive: {
    color: '#ffffff',
  },
  constantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  constantLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.amber,
  },
  constantValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.amber,
  },
  diffRow: {
    flexDirection: 'row',
    gap: 8,
  },
  diffChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
  },
  diffChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  noteCountsBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  noteCountsText: {
    fontSize: 11,
    color: COLORS.textSubtle,
  },
  modeTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 4,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: COLORS.surfaceLight,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  modeTabTextActive: {
    color: COLORS.purpleLight,
  },
  achRow: {
    flexDirection: 'row',
    gap: 12,
  },
  achInput: {
    height: 44,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 6,
  },
  medalsRow: {
    gap: 10,
  },
  medalGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  medalLabel: {
    fontSize: 11,
    color: COLORS.textSubtle,
    width: 48,
  },
  medalChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  medalChipActive: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purpleLight,
  },
  medalChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  medalChipTextActive: {
    color: '#ffffff',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matrixHint: {
    fontSize: 11,
    color: COLORS.textSubtle,
  },
  matrixHeaderRow: {
    flexDirection: 'row',
    gap: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  matrixHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  matrixRowHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.purpleLight,
  },
  matrixInput: {
    flex: 1,
    height: 44, // minimum touch target
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    padding: 0,
  },
  timingRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  timingCol: {
    flex: 1,
  },
  timingLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSubtle,
    marginBottom: 4,
  },
  timingInput: {
    height: 44, // minimum touch target
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    fontSize: 13,
    color: COLORS.text,
  },
  solverResultBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    padding: 10,
    marginTop: 8,
    gap: 6,
  },
  solverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  solverTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.amber,
  },
  solverBreakGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  solverBreakText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  boldWhite: {
    fontWeight: '800',
    color: COLORS.text,
  },
  solverDxText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  actionButtons: {
    gap: 10,
    marginTop: 8,
    marginBottom: 30,
  },
  saveBtn: {
    backgroundColor: COLORS.purple,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.red,
  },
});

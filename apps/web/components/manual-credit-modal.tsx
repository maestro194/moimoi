'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, Plus, Zap, Calculator, Sparkles, ChevronRight, Search, Loader2 } from 'lucide-react';
import { solvePlayDetails } from '@/lib/accuracy-solver';
import { normalizeTitle } from '@/lib/normalize';
import type { Song } from '@/lib/types';

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

const DIFF_COLORS: Record<string, string> = {
  BAS: '#3fb950',
  ADV: '#d4a017',
  EXP: '#f64861',
  MAS: '#9f51dc',
  REMAS: '#e4b7eb',
  UTAGE: '#bf1b5e',
};

const FC_OPTIONS = ['', 'FC', 'FC+', 'AP', 'AP+'];
const FS_OPTIONS = ['', 'FS', 'FS+', 'FDX', 'FDX+', 'SYNC'];
const DIFFICULTIES = ['BAS', 'ADV', 'EXP', 'MAS', 'REMAS'];

export interface ManualCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  songs?: Song[];
  initialPlay?: {
    id: number;
    songTitle: string;
    difficulty: string;
    songType?: string;
    achievement: string | number;
    dxScore?: number | null;
    fc?: string | null;
    fs?: string | null;
    track?: number | null;
    details?: any;
    playedAt?: string | Date;
  } | null;
}

export function ManualCreditModalWeb({
  isOpen,
  onClose,
  onSuccess,
  songs: initialSongs,
  initialPlay,
}: ManualCreditModalProps) {
  const isEditMode = Boolean(initialPlay);
  const [activeTrackIdx, setActiveTrackIdx] = useState(0);
  const [trackCount, setTrackCount] = useState(3);
  const [songs, setSongs] = useState<Song[]>(initialSongs || []);
  const [loadingSongs, setLoadingSongs] = useState(false);

  const [tracks, setTracks] = useState<TrackFormState[]>([
    createInitialTrack(1),
    createInitialTrack(2),
    createInitialTrack(3),
    createInitialTrack(4),
  ]);

  const [searchQueries, setSearchQueries] = useState<string[]>(['', '', '', '']);
  const [isSearching, setIsSearching] = useState<boolean[]>([false, false, false, false]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch song catalog if not provided
  useEffect(() => {
    if (initialSongs && initialSongs.length > 0) {
      setSongs(initialSongs);
      return;
    }
    if (!isOpen) return;

    let mounted = true;
    setLoadingSongs(true);
    fetch('/api/songs')
      .then(res => res.json())
      .then(data => {
        if (mounted && data.songs) {
          setSongs(data.songs);
        }
      })
      .catch(err => console.error('Failed to load songs in modal:', err))
      .finally(() => {
        if (mounted) setLoadingSongs(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, initialSongs]);

  // Initialize or reset form state
  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      return;
    }

    if (initialPlay) {
      setTrackCount(1);
      setActiveTrackIdx(0);

      let parsedDetails: any = initialPlay.details;
      if (typeof parsedDetails === 'string') {
        try {
          parsedDetails = JSON.parse(parsedDetails);
        } catch {}
      }

      const hasMatrix = Boolean(parsedDetails?.tap || parsedDetails?.break);
      const b = parsedDetails?.break || {};

      const editTrack: TrackFormState = {
        songTitle: initialPlay.songTitle,
        difficulty: initialPlay.difficulty,
        songType: (initialPlay.songType === 'STD' ? 'STD' : 'DX'),
        achievement: initialPlay.achievement ? String(initialPlay.achievement) : '',
        dxScore: initialPlay.dxScore ? String(initialPlay.dxScore) : '',
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

      setTracks([editTrack, createInitialTrack(2), createInitialTrack(3), createInitialTrack(4)]);
      setSearchQueries([initialPlay.songTitle, '', '', '']);
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
  }, [isOpen, initialPlay]);

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

  // Autocomplete matching
  const activeQuery = searchQueries[activeTrackIdx] || '';
  const searchResults = useMemo(() => {
    if (!activeQuery.trim() || activeQuery.length < 1) return [];
    const q = activeQuery.toLowerCase().trim();
    const matches: Song[] = [];
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

  // Selected song object
  const selectedSong = useMemo(() => {
    if (!currentTrack.songTitle) return null;
    const target = normalizeTitle(currentTrack.songTitle);
    return songs.find(s => normalizeTitle(s.title) === target) || null;
  }, [songs, currentTrack.songTitle]);

  // Selected sheet details (note counts reference)
  const selectedSheet = useMemo(() => {
    if (!selectedSong) return null;
    const sheets = (selectedSong as any).sheets;
    if (!sheets) return null;
    let list = sheets;
    if (typeof list === 'string') {
      try {
        list = JSON.parse(list);
      } catch {}
    }
    if (Array.isArray(list)) {
      return list.find(
        (sh: any) =>
          sh.type?.toUpperCase() === currentTrack.songType &&
          sh.difficulty?.toUpperCase() === currentTrack.difficulty.toUpperCase()
      ) || null;
    }
    return null;
  }, [selectedSong, currentTrack.songType, currentTrack.difficulty]);

  // Internal chart constant
  const chartConstant = useMemo(() => {
    if (!selectedSong) return null;
    const diff = currentTrack.difficulty.toLowerCase();
    const isDx = currentTrack.songType === 'DX';
    const key = isDx ? `dx_lev_${diff}_i` : `lev_${diff}_i`;
    const val = (selectedSong as any)[key];
    return val ? parseFloat(val).toFixed(1) : null;
  }, [selectedSong, currentTrack.difficulty, currentTrack.songType]);

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

    // Compute DX Score: 3 for Crit, 2 for Perf, 1 for Great
    const cp = details.tap.cp + details.hold.cp + details.slide.cp + details.touch.cp + details.break.cp;
    const p = details.tap.p + details.hold.p + details.slide.p + details.touch.p + details.break.p;
    const gr = details.tap.gr + details.hold.gr + details.slide.gr + details.touch.gr + details.break.gr;
    const computedDx = cp * 3 + p * 2 + gr * 1;

    return { solved, computedDx };
  }, [currentTrack.achievement, currentTrack.matrix, currentTrack.fast, currentTrack.late, currentTrack.maxCombo]);

  const selectSong = (song: Song) => {
    const hasDx = Boolean(song.dx_lev_mas || song.dx_lev_exp || (song as any).dx_lev_mas_i);
    const defaultType = hasDx ? 'DX' : 'STD';

    updateCurrentTrack({
      songTitle: song.title,
      songType: defaultType,
      difficulty: song.dx_lev_mas || song.lev_mas ? 'MAS' : 'EXP',
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
    setErrorMsg(null);
    const filledTracks = tracks.slice(0, trackCount).filter(t => t.songTitle.trim() && t.achievement.trim());

    if (filledTracks.length === 0) {
      setErrorMsg('Please enter at least one track with a song title and achievement percentage.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode && initialPlay) {
        // Edit mode (PUT)
        const t = tracks[0];
        const achNum = parseFloat(t.achievement);
        if (isNaN(achNum) || achNum < 0 || achNum > 101.0) {
          setErrorMsg('Achievement must be between 0.0000% and 101.0000%.');
          setSubmitting(false);
          return;
        }

        let detailsPayload: any = { isManual: true };
        if (t.entryMode === 'detailed' && solverResult?.solved) {
          detailsPayload = solverResult.solved;
          detailsPayload.isManual = true;
        }

        const res = await fetch('/api/manual-credit', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: initialPlay.id,
            songTitle: t.songTitle,
            difficulty: t.difficulty,
            songType: t.songType,
            achievement: achNum,
            dxScore: t.dxScore ? parseInt(t.dxScore, 10) : (solverResult?.computedDx ?? null),
            fc: t.fc || null,
            fs: t.fs || null,
            details: detailsPayload,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Server responded with ${res.status}`);
        }
      } else {
        // Multi-track credit mode (POST)
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
              touch: { cp: +m.touch.cp || 0, p: +m.touch.p || 0, gr: +m.touch.gr || 0, go: +m.touch.go || 0, miss: +m.touch.miss || 0 },
              break: { cp: +m.break.cp || 0, p: +m.break.p || 0, gr: +m.break.gr || 0, go: +m.break.go || 0, miss: +m.break.miss || 0 },
              fast: +t.fast || 0,
              late: +t.late || 0,
              maxCombo: +t.maxCombo || 0,
            };
            detailsPayload = solvePlayDetails(rawDetails, achNum);
            detailsPayload.isManual = true;
            if (finalDx === null) {
              const cp = rawDetails.tap.cp + rawDetails.hold.cp + rawDetails.slide.cp + rawDetails.touch.cp + rawDetails.break.cp;
              const p = rawDetails.tap.p + rawDetails.hold.p + rawDetails.slide.p + rawDetails.touch.p + rawDetails.break.p;
              const gr = rawDetails.tap.gr + rawDetails.hold.gr + rawDetails.slide.gr + rawDetails.touch.gr + rawDetails.break.gr;
              finalDx = cp * 3 + p * 2 + gr * 1;
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

        const res = await fetch('/api/manual-credit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tracks: payloadTracks }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Server responded with ${res.status}`);
        }
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save manual credit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialPlay) return;
    if (!window.confirm(`Are you sure you want to delete this manual play for "${initialPlay.songTitle}"?`)) {
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/manual-credit?id=${initialPlay.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server responded with ${res.status}`);
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete manual play.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-[#121217] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">✍️</span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {isEditMode ? 'Edit Manual Play' : 'Log Arcade Credit'}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Manual
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center justify-between">
                <span>⚠️ {errorMsg}</span>
                <button onClick={() => setErrorMsg(null)} className="text-red-300 hover:text-white">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Track Selector Tabs (Credit mode) */}
            {!isEditMode && (
              <div className="flex items-center gap-2">
                {Array.from({ length: trackCount }).map((_, idx) => {
                  const isSelected = activeTrackIdx === idx;
                  const isFilled = Boolean(tracks[idx].songTitle && tracks[idx].achievement);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveTrackIdx(idx)}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-purple-600/30 border-purple-500 text-white shadow-lg shadow-purple-900/30'
                          : 'bg-white/[0.03] border-white/5 text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                      }`}
                    >
                      <span>Track {idx + 1}</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isFilled ? 'bg-green-400' : 'bg-white/20'
                        }`}
                      />
                    </button>
                  );
                })}

                {trackCount === 3 && (
                  <button
                    type="button"
                    onClick={() => setTrackCount(4)}
                    className="py-2 px-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition-all flex items-center gap-1 shrink-0"
                  >
                    <Plus size={14} />
                    <span>Track 4</span>
                  </button>
                )}
              </div>
            )}

            {/* Chart Selection Box */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-white/50 block">
                Chart Selection
              </label>

              {/* Autocomplete Input */}
              <div className="relative">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-white/10 focus-within:border-purple-500 transition-colors">
                  <Search size={16} className="text-white/40 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search song title or artist..."
                    value={searchQueries[activeTrackIdx]}
                    onChange={e => {
                      const val = e.target.value;
                      setSearchQueries(prev => {
                        const next = [...prev];
                        next[activeTrackIdx] = val;
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
                    className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                  />
                  {currentTrack.songTitle && (
                    <span className="text-green-400 shrink-0">
                      <Check size={16} />
                    </span>
                  )}
                </div>

                {/* Dropdown Menu */}
                {isSearching[activeTrackIdx] && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-30 max-h-60 overflow-y-auto rounded-xl bg-[#181822] border border-purple-500/40 shadow-2xl divide-y divide-white/5">
                    {searchResults.map(s => (
                      <button
                        key={s.title}
                        type="button"
                        onClick={() => selectSong(s)}
                        className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center justify-between transition-colors group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-sm font-bold text-white group-hover:text-purple-300 truncate">
                            {s.title}
                          </p>
                          <p className="text-xs text-white/40 truncate">
                            {s.artist || s.catcode || 'maimai'}
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-white/30 group-hover:text-white shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chart Controls (Type & Difficulty) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {/* DX / STD Toggle */}
                <div className="flex rounded-lg bg-black/40 border border-white/5 p-1 gap-1">
                  {(['DX', 'STD'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateCurrentTrack({ songType: type })}
                      className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                        currentTrack.songType === type
                          ? 'bg-purple-600 text-white shadow'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Constant Badge */}
                {chartConstant && (
                  <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-extrabold flex items-center gap-1.5">
                    <span className="text-[10px] text-amber-400/70 font-semibold">CONST</span>
                    <span>{chartConstant}</span>
                  </div>
                )}
              </div>

              {/* Difficulty Chips */}
              <div className="flex gap-2 pt-1">
                {DIFFICULTIES.map(diff => {
                  const isSelected = currentTrack.difficulty.toUpperCase() === diff;
                  const color = DIFF_COLORS[diff] || '#9ca3af';
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => updateCurrentTrack({ difficulty: diff })}
                      style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-extrabold transition-all text-center ${
                        isSelected
                          ? 'text-white shadow-md'
                          : 'bg-black/30 border-white/10 text-white/50 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {diff}
                    </button>
                  );
                })}
              </div>

              {/* Note Counts Reference */}
              {selectedSheet?.noteCounts && (
                <div className="p-2 rounded-lg bg-white/[0.03] text-[11px] text-white/50 border border-white/5">
                  🎯 Notes: Tap {selectedSheet.noteCounts.tap ?? 0} • Hold {selectedSheet.noteCounts.hold ?? 0} • Slide {selectedSheet.noteCounts.slide ?? 0} • Touch {selectedSheet.noteCounts.touch ?? 0} • Break {selectedSheet.noteCounts.break ?? 0} (Total {selectedSheet.noteCounts.total ?? 0})
                </div>
              )}
            </div>

            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-white/[0.03] border border-white/5 p-1 gap-2">
              <button
                type="button"
                onClick={() => updateCurrentTrack({ entryMode: 'quick' })}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  currentTrack.entryMode === 'quick'
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                <Zap size={14} />
                <span>Quick Score</span>
              </button>
              <button
                type="button"
                onClick={() => updateCurrentTrack({ entryMode: 'detailed' })}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  currentTrack.entryMode === 'detailed'
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                <Calculator size={14} />
                <span>Detailed Judgments</span>
              </button>
            </div>

            {/* Primary Achievement & Medals */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-white/50 block mb-1">
                    Achievement Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="100.4128"
                    value={currentTrack.achievement}
                    onChange={e => updateCurrentTrack({ achievement: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-extrabold text-base focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-white/50 block mb-1">
                    DX Score (Optional)
                  </label>
                  <input
                    type="number"
                    placeholder={solverResult?.computedDx ? String(solverResult.computedDx) : '2450'}
                    value={currentTrack.dxScore}
                    onChange={e => updateCurrentTrack({ dxScore: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-extrabold text-base focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Medals */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-white/40 font-bold w-12">Combo:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {FC_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateCurrentTrack({ fc: opt })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                          currentTrack.fc === opt
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-black/30 border-white/5 text-white/50 hover:text-white'
                        }`}
                      >
                        {opt || 'None'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-white/40 font-bold w-12">Sync:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {FS_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateCurrentTrack({ fs: opt })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                          currentTrack.fs === opt
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-black/30 border-white/5 text-white/50 hover:text-white'
                        }`}
                      >
                        {opt || 'None'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Note Breakdown Grid */}
            {currentTrack.entryMode === 'detailed' && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-white/50 block">
                    Note Judgments Matrix
                  </label>
                  <span className="text-[11px] text-white/30">From Cabinet Result Screen</span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/60">
                        <th className="py-2 px-1 text-left font-extrabold w-16">NOTE</th>
                        <th className="py-2 px-1 text-[#facc15] font-extrabold">CRIT</th>
                        <th className="py-2 px-1 text-white font-extrabold">PERF</th>
                        <th className="py-2 px-1 text-[#f472b6] font-extrabold">GREAT</th>
                        <th className="py-2 px-1 text-[#22d3ee] font-extrabold">GOOD</th>
                        <th className="py-2 px-1 text-[#ef4444] font-extrabold">MISS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(['tap', 'hold', 'slide', 'touch', 'break'] as const).map(type => (
                        <tr key={type}>
                          <td className="py-1.5 px-1 font-bold text-left text-purple-300 uppercase">
                            {type}
                          </td>
                          {(['cp', 'p', 'gr', 'go', 'miss'] as const).map(col => (
                            <td key={col} className="py-1.5 px-1">
                              <input
                                type="number"
                                placeholder="0"
                                value={currentTrack.matrix[type][col]}
                                onChange={e => updateMatrixCell(type, col, e.target.value)}
                                className="w-12 sm:w-14 h-8 bg-black/40 border border-white/10 rounded-lg text-center text-xs font-bold text-white focus:border-purple-500 focus:outline-none"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Timing Row */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-cyan-400 block mb-1">FAST</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={currentTrack.fast}
                      onChange={e => updateCurrentTrack({ fast: e.target.value })}
                      className="w-full h-8 px-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-amber-400 block mb-1">LATE</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={currentTrack.late}
                      onChange={e => updateCurrentTrack({ late: e.target.value })}
                      className="w-full h-8 px-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-white/50 block mb-1">MAX COMBO</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={currentTrack.maxCombo}
                      onChange={e => updateCurrentTrack({ maxCombo: e.target.value })}
                      className="w-full h-8 px-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live Solver Results */}
                {solverResult?.solved?.break && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                      <Sparkles size={14} />
                      <span>Exact 8-Tier Break Solver Match</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[11px] text-white/70">
                      <div>CP: <span className="font-bold text-white">{solverResult.solved.break.cp}</span> (2600)</div>
                      <div>P-High: <span className="font-bold text-white">{solverResult.solved.break.p_high}</span> (2550)</div>
                      <div>P-Low: <span className="font-bold text-white">{solverResult.solved.break.p_low}</span> (2500)</div>
                      <div>G-High: <span className="font-bold text-white">{solverResult.solved.break.g_high}</span> (2000)</div>
                      <div>G-Mid: <span className="font-bold text-white">{solverResult.solved.break.g_mid}</span> (1500)</div>
                      <div>G-Low: <span className="font-bold text-white">{solverResult.solved.break.g_low}</span> (1250)</div>
                    </div>
                    {solverResult.computedDx ? (
                      <div className="text-[11px] text-amber-200/80 pt-1 border-t border-amber-500/20">
                        Computed DX Score: <span className="font-extrabold text-white">{solverResult.computedDx}</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
            {isEditMode ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold hover:bg-red-500/20 transition-all disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>Delete Play</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>{isEditMode ? 'Save Changes' : `Save Credit (${trackCount} Tracks)`}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

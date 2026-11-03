/**
 * Everything the song modal shows for one chart, loaded from its identity (see GLOSSARY.md: Chart identity).
 * Screens only say which chart to open (useOpenChart); this is the one place that gathers the rest.
 */
import { calcSingleRating, chartOf, chartRef, sameChart, type ChartInfo, type ChartLike, type ChartRef, type SongIndex } from '@maimai-suite/core';
import { sqlite } from './client';
import type { PlayLogRow, ScoreRow, SongRow } from './schema';

export interface ChartDetail {
  chart: ChartRef;
  song?: SongRow;
  /** Displayed level, constant and sheet (note counts, designer) from the chart lookup. */
  info?: ChartInfo<SongRow>;
  /** The personal best for this chart, if played. */
  best?: ScoreRow;
  /** Rating of the best (AP bonus included), as in the B50; 0 without a best or a known constant. */
  rating: number;
  /** Latest plays of this chart, newest first. */
  plays: PlayLogRow[];
}

const PLAY_LIMIT = 20;

export function loadChartDetail(songs: SongIndex<SongRow>, x: ChartLike): ChartDetail {
  const chart = chartRef(x);
  let song: SongRow | undefined;
  let best: ScoreRow | undefined;
  let plays: PlayLogRow[] = [];
  try {
    // Older links sometimes carried the kana title: keep finding those songs
    song = songs.forChart(chart)
      ?? sqlite.getFirstSync<SongRow>(`SELECT * FROM songs WHERE title_kana = ? LIMIT 1`, [chart.title])
      ?? undefined;
    // By chart identity, so DX and STD (and title spellings) don't mix
    best = sqlite
      .getAllSync<ScoreRow>(`SELECT * FROM scores WHERE difficulty = ? ORDER BY achievement DESC`, [chart.difficulty])
      .find(s => sameChart(s, chart));
    plays = sqlite
      .getAllSync<PlayLogRow>(`SELECT * FROM play_log WHERE difficulty = ? ORDER BY played_at DESC`, [chart.difficulty])
      .filter(p => sameChart(p, chart))
      .slice(0, PLAY_LIMIT);
  } catch {
    // SQLite not ready: show the chart without data
  }
  const info = song ? chartOf(song, chart) : undefined;
  const rating = best && info?.constant ? calcSingleRating(info.constant, best.achievement, best.fc).floored : 0;
  return { chart, song, info, best, rating, plays };
}

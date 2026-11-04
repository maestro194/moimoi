/**
 * Chart identity (see GLOSSARY.md): which chart a score, play, goal or row refers to, and which song it belongs to.
 *
 * A chart is identified by its song's normalised title, its type (DX when not stated) and its difficulty.
 * Two songs can share a normalised title (TRUST is STD only, Trust is DX only), so finding the song for a
 * chart also looks at which chart types each song has.
 */
import type { Difficulty, SongType } from './types';
import { normalizeTitle } from './normalize';

export interface ChartRef {
  title: string;
  difficulty: Difficulty;
  /** Always set: DX when the source didn't say. */
  type: SongType;
}

/** Anything that names a chart: a ChartRef, a Score/play (songTitle/songType), a SQLite row (song_title/song_type). */
export type ChartLike = {
  difficulty: string;
  title?: string | null;
  songTitle?: string | null;
  song_title?: string | null;
  type?: string | null;
  songType?: string | null;
  song_type?: string | null;
};

/** The chart a score, play or row refers to, with its type defaulted to DX. */
export function chartRef(x: ChartLike): ChartRef {
  const title = x.songTitle ?? x.song_title ?? x.title ?? '';
  const type = x.songType ?? x.song_type ?? x.type;
  return { title, difficulty: x.difficulty as Difficulty, type: type === 'STD' ? 'STD' : 'DX' };
}

/** The one key for a chart: equal charts always give equal keys, whatever the title spelling or a missing type. */
export function chartKey(x: ChartLike): string {
  const r = chartRef(x);
  return `${normalizeTitle(r.title)}::${r.difficulty}::${r.type}`;
}

/** True when both refer to the same chart. */
export const sameChart = (a: ChartLike, b: ChartLike) => chartKey(a) === chartKey(b);

/** The level fields a song needs for the index; satisfied by both the web Song and the mobile SongRow. */
export interface SongLevels {
  title: string;
  lev_bas?: string | null; lev_adv?: string | null; lev_exp?: string | null; lev_mas?: string | null; lev_remas?: string | null;
  lev_mas_i?: string | null; lev_exp_i?: string | null;
  dx_lev_bas?: string | null; dx_lev_adv?: string | null; dx_lev_exp?: string | null; dx_lev_mas?: string | null; dx_lev_remas?: string | null;
  dx_lev_mas_i?: string | null; dx_lev_exp_i?: string | null;
  lev_utage?: string | null;
}

const set = (v: string | null | undefined) => v != null && v !== '';

/** Whether a song has charts of this type (UTAGE difficulty: whether it has an utage chart). */
function hasCharts(song: SongLevels, type: SongType, difficulty: Difficulty): boolean {
  if (difficulty === 'UTAGE') return set(song.lev_utage);
  return type === 'DX'
    ? set(song.dx_lev_bas) || set(song.dx_lev_adv) || set(song.dx_lev_exp) || set(song.dx_lev_mas) || set(song.dx_lev_remas)
    : set(song.lev_bas) || set(song.lev_adv) || set(song.lev_exp) || set(song.lev_mas) || set(song.lev_remas);
}

/** A song with chart constants beats one without (the old "richest entry wins" rule). */
const hasConstants = (s: SongLevels) => set(s.lev_mas_i) || set(s.dx_lev_mas_i) || set(s.lev_exp_i) || set(s.dx_lev_exp_i);

/** Songs looked up by chart. Build once per song list. */
export class SongIndex<S extends SongLevels> {
  private byTitle = new Map<string, S[]>();

  constructor(private readonly songs: readonly S[]) {
    for (const s of songs) {
      const k = normalizeTitle(s.title);
      const list = this.byTitle.get(k);
      if (list) list.push(s); else this.byTitle.set(k, [s]);
    }
    // Order each title's songs so the first is the best guess when the chart type can't decide
    for (const list of this.byTitle.values()) {
      if (list.length > 1) list.sort((a, b) => Number(hasConstants(b)) - Number(hasConstants(a)));
    }
  }

  /** The song a chart belongs to: among songs with that title, the one that has charts of its type. */
  forChart(x: ChartLike): S | undefined {
    const r = chartRef(x);
    const list = this.byTitle.get(normalizeTitle(r.title));
    if (!list) return undefined;
    if (list.length === 1) return list[0];
    return list.find(s => hasCharts(s, r.type, r.difficulty)) ?? list[0];
  }

  /** Every song with this title (normally one), best guess first. */
  forTitle(title: string): S[] {
    return this.byTitle.get(normalizeTitle(title)) ?? [];
  }

  /** All songs, in the order given. */
  all(): readonly S[] {
    return this.songs;
  }
}

/** Titles a song list has more than once ("Link"): those songs are keyed title#jacket instead of by title. */
export function titlesListedTwice(list: readonly { title: string }[]): Set<string> {
  const seen = new Set<string>();
  const twice = new Set<string>();
  for (const s of list) (seen.has(s.title) ? twice : seen).add(s.title);
  return twice;
}

/** A song's row key: its title, or title#jacket when the title is shared. */
export function songKey(title: string, imageUrl: string | undefined, shared: ReadonlySet<string>): string {
  return shared.has(title) ? `${title}#${imageUrl ?? ''}` : title;
}

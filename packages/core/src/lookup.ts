/**
 * Chart lookup (see GLOSSARY.md: Chart constant, Displayed level, Utage chart): what the song data says about
 * one chart. This is the only place that knows which song field holds which chart's level, and how the
 * sheet list names difficulties and types.
 *
 * One rule everywhere: a value comes from the chart's own fields or not at all. No borrowing the other
 * type's level, no turning a displayed level into a constant (estimateConstant does that, by name), and
 * utage charts never have a constant.
 */
import type { Difficulty, SongType } from './types';
import { chartRef, type ChartLike, type ChartRef, type SongIndex, type SongLevels } from './chart';

/** One entry of a song's sheet list: note counts and designer for one chart. */
export interface Sheet {
  type: string;
  difficulty: string;
  level?: string;
  internalLevelValue?: number;
  noteCounts?: { tap?: number; hold?: number; slide?: number; touch?: number; break?: number; total?: number };
  noteDesigner?: string;
  regions?: Record<string, boolean>;
}

export interface ChartInfo<S extends SongLevels = SongLevels> {
  song: S;
  ref: ChartRef;
  /** Displayed level as the data has it ("13+", utage "13?"). */
  level?: string;
  /** Chart constant (e.g. 13.7). Missing when the data doesn't know it, and always for utage charts. */
  constant?: number;
  /** Note counts and designer, when the sheet list has this chart. */
  sheet?: Sheet;
}

const PLAYABLE: Exclude<Difficulty, 'UTAGE'>[] = ['BAS', 'ADV', 'EXP', 'MAS', 'REMAS'];
const SHEET_DIFFICULTY: Record<Exclude<Difficulty, 'UTAGE'>, string> = {
  BAS: 'basic', ADV: 'advanced', EXP: 'expert', MAS: 'master', REMAS: 'remaster',
};

type Fields = Record<string, unknown>;
const text = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);
const fieldName = (type: SongType, difficulty: Exclude<Difficulty, 'UTAGE'>) =>
  `${type === 'DX' ? 'dx_lev_' : 'lev_'}${difficulty.toLowerCase()}`;

function parseConstant(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : parseFloat(text(v) ?? '');
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Parsed sheet lists per song object. Mobile rows store the list as JSON text; parse each once per data load. */
const parsedSheets = new WeakMap<object, Sheet[]>();

function sheetsOf(song: SongLevels): Sheet[] {
  const raw = (song as unknown as Fields).sheets;
  if (Array.isArray(raw)) return raw as Sheet[];
  if (typeof raw !== 'string' || !raw) return [];
  let list = parsedSheets.get(song);
  if (!list) {
    try { const parsed = JSON.parse(raw); list = Array.isArray(parsed) ? parsed : []; } catch { list = []; }
    parsedSheets.set(song, list);
  }
  return list!;
}

function findSheet(song: SongLevels, ref: ChartRef): Sheet | undefined {
  const sheets = sheetsOf(song);
  if (ref.difficulty === 'UTAGE') return sheets.find(s => String(s.type).toLowerCase().startsWith('utage'));
  const type = ref.type.toLowerCase();
  const difficulty = SHEET_DIFFICULTY[ref.difficulty];
  return sheets.find(s => String(s.type).toLowerCase() === type && s.difficulty === difficulty);
}

/** What the data says about one chart of this song, or undefined when the song has no such chart. */
export function chartOf<S extends SongLevels>(song: S, x: Pick<ChartLike, 'difficulty' | 'type' | 'songType' | 'song_type'>): ChartInfo<S> | undefined {
  const ref: ChartRef = { ...chartRef(x), title: song.title };
  const f = song as unknown as Fields;
  if (ref.difficulty === 'UTAGE') {
    const level = text(f.lev_utage);
    return level ? { song, ref, level, sheet: findSheet(song, ref) } : undefined;
  }
  if (!PLAYABLE.includes(ref.difficulty)) return undefined;
  const name = fieldName(ref.type, ref.difficulty);
  const level = text(f[name]);
  const constant = parseConstant(f[`${name}_i`]);
  if (level === undefined && constant === undefined) return undefined;
  return { song, ref, level, constant, sheet: findSheet(song, ref) };
}

/** Find a chart's song and look the chart up: the one call for "what is this score's chart?". */
export function lookupChart<S extends SongLevels>(songs: SongIndex<S>, x: ChartLike): ChartInfo<S> | undefined {
  const song = songs.forChart(x);
  return song ? chartOf(song, x) : undefined;
}

/** Every chart the song has, DX charts first, then STD, then utage; each in BAS → Re:MAS order. */
export function chartsOf<S extends SongLevels>(song: S): ChartInfo<S>[] {
  const out: ChartInfo<S>[] = [];
  for (const type of ['DX', 'STD'] as const) {
    for (const difficulty of PLAYABLE) {
      const c = chartOf(song, { difficulty, type });
      if (c) out.push(c);
    }
  }
  const utage = chartOf(song, { difficulty: 'UTAGE' });
  if (utage) out.push(utage);
  return out;
}

/**
 * An estimate of a constant from a displayed level ("13" → 13.0, "13+" → 13.7). Not a chart constant:
 * only for recommendations, which need a number for charts the data has no constant for yet.
 */
export function estimateConstant(level: string | undefined): number | undefined {
  const m = text(level)?.match(/^(\d+)(\+)?$/);
  if (!m) return undefined;
  return parseInt(m[1], 10) + (m[2] ? 0.7 : 0);
}

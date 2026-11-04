/**
 * Credit and session grouping (see GLOSSARY.md: Credit, Session): one rule for both apps.
 *
 * A credit is up to four tracks in a row; a session is the credits of one visit. One gap ends both:
 * more than SESSION_GAP_MS between two plays starts a new credit and a new session.
 */
import { chartKey, sameChart, type ChartLike } from './chart';
import { computeRating } from './rating';
import type { SongIndex } from './chart';
import type { Score, Song } from './types';

/** The one gap rule: 20 minutes without a play ends the credit and the session. */
export const SESSION_GAP_MS = 20 * 60 * 1000;

/** A play as either app stores it (web camelCase, mobile snake_case). */
export type PlayLike = ChartLike & {
  id: number | string;
  achievement: number | string;
  track?: number | null;
  playedAt?: Date | string;
  played_at?: string;
  isManual?: boolean | null;
  is_manual?: number | boolean | null;
};

export interface Credit<P extends PlayLike> {
  id: string;
  /** Tracks in play order (track 1 first). */
  plays: P[];
  start: Date;
  end: Date;
}

export interface Session<P extends PlayLike> {
  id: string;
  /** Credits, newest first. */
  credits: Credit<P>[];
  /** Every play, newest first. */
  plays: P[];
  start: Date;
  end: Date;
  durationMinutes: number;
  /** The newest session, with its last play within the gap of `now`. */
  isActive: boolean;
}

const timeOf = (p: PlayLike) => new Date(p.playedAt ?? p.played_at ?? 0).getTime();
const ach = (p: PlayLike) => Number(p.achievement);
const manual = (p: PlayLike) => !!(p.isManual ?? p.is_manual);

/** Same chart, track and achievement: a manual entry and its synced copy. */
function isDuplicate(a: PlayLike, b: PlayLike): boolean {
  return sameChart(a, b) && (a.track ?? null) === (b.track ?? null) && Math.abs(ach(a) - ach(b)) < 0.00005;
}

/**
 * Group plays into credits, newest credit first. A credit ends at track 1, at a track number that
 * doesn't count down, or at a gap over SESSION_GAP_MS. Adjacent duplicates collapse (synced row kept).
 */
export function groupCredits<P extends PlayLike>(plays: readonly P[]): Credit<P>[] {
  const sorted = [...plays].sort((a, b) => timeOf(b) - timeOf(a));
  const deduped: P[] = [];
  for (const p of sorted) {
    const prev = deduped[deduped.length - 1];
    if (prev && isDuplicate(prev, p)) {
      if (manual(prev) && !manual(p)) deduped[deduped.length - 1] = p;
      continue;
    }
    deduped.push(p);
  }

  const credits: Credit<P>[] = [];
  let current: P[] = [];
  const close = () => {
    if (!current.length) return;
    const inOrder = [...current].reverse();
    credits.push({
      id: String(inOrder[inOrder.length - 1].id),
      plays: inOrder,
      start: new Date(timeOf(inOrder[0])),
      end: new Date(timeOf(inOrder[inOrder.length - 1])),
    });
    current = [];
  };
  for (let i = 0; i < deduped.length; i++) {
    const p = deduped[i];
    current.push(p);
    const next = deduped[i + 1];
    if (!next) break;
    const gap = timeOf(p) - timeOf(next) > SESSION_GAP_MS;
    const trackBreak = p.track != null && next.track != null && next.track >= p.track;
    if (p.track === 1 || gap || trackBreak || current.length >= 4) close();
  }
  close();
  return credits;
}

/** Group plays into sessions, newest first: credits with no more than SESSION_GAP_MS between them. */
export function groupSessions<P extends PlayLike>(plays: readonly P[], now = Date.now()): Session<P>[] {
  const sessions: Session<P>[] = [];
  for (const credit of groupCredits(plays)) {
    const last = sessions[sessions.length - 1];
    if (last && last.start.getTime() - credit.end.getTime() <= SESSION_GAP_MS) {
      last.credits.push(credit);
      last.start = credit.start;
    } else {
      sessions.push({ id: `session-${credit.end.getTime()}`, credits: [credit], plays: [], start: credit.start, end: credit.end, durationMinutes: 0, isActive: false });
    }
  }
  sessions.forEach((s, i) => {
    s.plays = s.credits.flatMap(c => [...c.plays].reverse());
    s.durationMinutes = Math.max(1, Math.round((s.end.getTime() - s.start.getTime()) / 60000));
    s.isActive = i === 0 && now - s.end.getTime() <= SESSION_GAP_MS;
  });
  return sessions;
}

/** Plays that set their chart's current personal best (achievement at least the stored best). */
export function newBestPlays<P extends PlayLike>(plays: readonly P[], bests: readonly (ChartLike & { achievement: number | string })[]): P[] {
  const best = new Map(bests.map(b => [chartKey(b), Number(b.achievement)]));
  return plays.filter(p => {
    const b = best.get(chartKey(p));
    return b !== undefined && ach(p) >= b - 0.00005;
  });
}

/**
 * Rating gained by a group of plays: today's rating minus the rating with each chart they set a new
 * best on put back to its best earlier play we know of (or unplayed). Earlier plays are the ones we
 * have, so a best set before we tracked plays can make this an overestimate.
 */
export function ratingGain(
  plays: readonly PlayLike[],
  earlierPlays: readonly PlayLike[],
  scores: readonly Score[],
  songs: SongIndex<Song>,
  currentVersion: number,
): number {
  const improved = new Set(newBestPlays(plays, scores).map(p => chartKey(p)));
  if (improved.size === 0) return 0;
  const before: Score[] = [];
  for (const s of scores) {
    if (!improved.has(chartKey(s))) { before.push(s); continue; }
    const prior = earlierPlays.filter(p => sameChart(p, s)).sort((a, b) => ach(b) - ach(a))[0];
    if (prior) before.push({ ...s, achievement: ach(prior), fc: null, fs: null });
  }
  return computeRating(scores as Score[], songs, currentVersion).totalRating
    - computeRating(before, songs, currentVersion).totalRating;
}

/** Per-note accuracy each judgement costs, from a play's judgement counts (null without break notes). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function judgementDrops(d: any) {
  if (!d?.tap || !d?.break) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sum = (j: any) => (j?.cp ?? 0) + (j?.p ?? 0) + (j?.gr ?? 0) + (j?.go ?? 0) + (j?.miss ?? 0);
  const tap = sum(d.tap), hold = sum(d.hold), slide = sum(d.slide), touch = sum(d.touch);
  // Break counts come in the old 5-field and the 7-field schemas
  const b = d.break;
  const brk = (b.cp ?? 0) + (b.p_high ?? b.p2500 ?? b.p ?? 0) + (b.p_low ?? b.p2000 ?? 0)
    + (b.g_high ?? b.g1500 ?? b.gr ?? 0) + (b.g_mid ?? b.g1250 ?? 0) + (b.g_low ?? b.g1000 ?? b.go ?? 0) + (b.miss ?? 0);
  if (brk === 0) return null;
  const maxBase = tap * 500 + hold * 1000 + slide * 1500 + touch * 500 + brk * 2500;
  if (maxBase === 0) return null;
  const bpb = 1 / brk;        // break bonus share per break note (bonus pool = 1%)
  const bpp = 100 / maxBase;  // accuracy per base point
  const std = { gr: 100 * bpp, go: 250 * bpp, miss: 500 * bpp };
  return {
    tap: std,
    hold: { gr: 200 * bpp, go: 500 * bpp, miss: 1000 * bpp },
    slide: { gr: 300 * bpp, go: 750 * bpp, miss: 1500 * bpp },
    touch: std,
    break: {
      p2500: 0.25 * bpb, p2000: 0.5 * bpb,
      g1500: 0.6 * bpb + 500 * bpp, g1250: 0.6 * bpb + 1000 * bpp, g1000: 0.6 * bpb + 1250 * bpp,
      good: 0.7 * bpb + 1500 * bpp, miss: 1.0 * bpb + 2500 * bpp,
    },
  };
}

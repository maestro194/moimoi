import { describe, expect, it } from 'vitest';
import { SongIndex } from '../src/chart';
import { calcSingleRating } from '../src/rating';
import { groupCredits, groupSessions, judgementDrops, newBestPlays, ratingGain, SESSION_GAP_MS } from '../src/sessions';
import type { Score, Song } from '../src/types';
import fixture from './fixtures/songs.json';

const songs = fixture as unknown as Record<keyof typeof fixture, Song>;
const index = new SongIndex<Song>(Object.values(songs));
const T0 = new Date('2026-11-01T10:00:00Z').getTime();
const min = (m: number) => new Date(T0 + m * 60_000).toISOString();
let id = 0;
const play = (m: number, track: number | null, title = 'Oshama Scramble!', achievement = 97 + m / 100, extra = {}) =>
  ({ id: ++id, songTitle: title, difficulty: 'MAS', songType: 'DX', achievement, track, playedAt: min(m), ...extra });

describe('credits', () => {
  it('split at track 1, keep tracks in play order, newest credit first', () => {
    const c = groupCredits([play(0, 1), play(4, 2), play(8, 3), play(13, 1), play(17, 2)]);
    expect(c.map(x => x.plays.map(p => p.track))).toEqual([[1, 2], [1, 2, 3]]);
  });

  it('split at a gap over 20 minutes, not at exactly 20', () => {
    expect(groupCredits([play(0, null), play(20, null)]).length).toBe(1);
    expect(groupCredits([play(0, null), play(21, null)]).length).toBe(2);
  });

  it('collapse a manual entry and its synced copy, keeping the synced row', () => {
    const synced = play(5, 2, 'Oshama Scramble!', 100.1);
    const manual = { ...play(5, 2, 'Oshama Scramble!', 100.1), isManual: true };
    const c = groupCredits([play(0, 1), manual, synced]);
    expect(c[0].plays.map(p => p.id)).toEqual([c[0].plays[0].id, synced.id]);
  });

  it('read mobile rows (played_at, is_manual)', () => {
    const rows = [{ id: 1, song_title: 'Oshama Scramble!', difficulty: 'MAS', song_type: 'DX', achievement: 99, track: 1, played_at: min(0), is_manual: 0 }];
    expect(groupCredits(rows)[0].plays).toHaveLength(1);
  });
});

describe('sessions', () => {
  it('join credits up to 20 minutes apart and mark the newest active', () => {
    const plays = [play(0, 1), play(5, 2), play(15, 1), play(60, 1)];
    const s = groupSessions(plays, T0 + 70 * 60_000);
    expect(s.map(x => x.credits.length)).toEqual([1, 2]);
    expect(s[0].isActive).toBe(true);
    expect(s[1].isActive).toBe(false);
    expect(s[1].durationMinutes).toBe(15);
    expect(s[1].plays.map(p => p.playedAt)).toEqual([min(15), min(5), min(0)]);
    expect(SESSION_GAP_MS).toBe(20 * 60_000);
  });
});

describe('gains', () => {
  const score = (achievement: number): Score => ({ id: 1, songTitle: songs.dxOnly.title, difficulty: 'MAS', songType: 'DX', achievement, dxScore: null, fc: null, fs: null, playedAt: new Date(min(30)) });

  it('count plays that set the current best', () => {
    const plays = [play(30, 1, songs.dxOnly.title, 100.5), play(34, 2, songs.dxOnly.title, 99)];
    expect(newBestPlays(plays, [score(100.5)]).map(p => p.achievement)).toEqual([100.5]);
  });

  it('rating gain is today\'s rating minus the rating with the earlier best put back', () => {
    const now = [score(100.5)];
    const credit = [play(30, 1, songs.dxOnly.title, 100.5)];
    const earlier = [play(0, 1, songs.dxOnly.title, 99.0)];
    const r = (a: number) => calcSingleRating(13.8, a).floored;
    expect(ratingGain(credit, earlier, now, index, 26500)).toBe(r(100.5) - r(99.0));
    expect(ratingGain(credit, [], now, index, 26500)).toBe(r(100.5));
    expect(ratingGain([play(40, 1, songs.dxOnly.title, 98)], earlier, now, index, 26500)).toBe(0);
  });
});

describe('judgement drops', () => {
  it('reads both break schemas and needs break notes', () => {
    const j = { cp: 0, p: 10, gr: 0, go: 0, miss: 0 };
    const old5 = { tap: j, hold: j, slide: j, touch: j, break: { cp: 0, p: 4, gr: 0, go: 0, miss: 0 } };
    const new7 = { tap: j, hold: j, slide: j, touch: j, break: { cp: 0, p2500: 4, p2000: 0, g1500: 0, g1250: 0, g1000: 0, miss: 0 } };
    expect(judgementDrops(old5)).toEqual(judgementDrops(new7));
    expect(judgementDrops({ ...old5, break: { cp: 0, miss: 0 } })).toBeNull();
  });
});

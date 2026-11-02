import { describe, expect, it } from 'vitest';
import { chartKey, chartRef, sameChart, SongIndex } from '../src/chart';
import { computeRating } from '../src/rating';
import type { Score, Song } from '../src/types';
import fixture from './fixtures/songs.json';

const songs = fixture as Record<keyof typeof fixture, Song>;
const index = new SongIndex<Song>(Object.values(songs));

const score = (songTitle: string, difficulty: Score['difficulty'], songType: Score['songType'], achievement: number, id = 1): Score =>
  ({ id, songTitle, difficulty, songType, achievement, dxScore: null, fc: null, fs: null, playedAt: new Date('2026-10-01') });

describe('chart identity', () => {
  it('defaults a missing type to DX', () => {
    expect(chartRef({ songTitle: 'Trust', difficulty: 'MAS' }).type).toBe('DX');
    expect(chartRef({ song_title: 'Trust', difficulty: 'MAS', song_type: null }).type).toBe('DX');
    expect(chartRef({ title: 'TRUST', difficulty: 'MAS', type: 'STD' }).type).toBe('STD');
  });

  it('gives equal keys for the same chart in any shape or spelling', () => {
    const fw = songs.fullwidth.title;
    const half = fw.normalize('NFKC');
    expect(fw).not.toBe(half);
    expect(chartKey({ songTitle: fw, difficulty: 'MAS', songType: 'DX' })).toBe(chartKey({ song_title: half, difficulty: 'MAS' }));
    expect(chartKey({ title: 'TRUST', difficulty: 'MAS', type: 'STD' })).toBe(chartKey({ songTitle: 'trust', difficulty: 'MAS', songType: 'STD' }));
    expect(sameChart({ songTitle: 'Trust', difficulty: 'MAS' }, { songTitle: 'Trust', difficulty: 'MAS', songType: 'DX' })).toBe(true);
  });

  it('gives different keys for a different type or difficulty', () => {
    const k = chartKey({ songTitle: 'Link', difficulty: 'MAS', songType: 'STD' });
    expect(chartKey({ songTitle: 'Link', difficulty: 'MAS', songType: 'DX' })).not.toBe(k);
    expect(chartKey({ songTitle: 'Link', difficulty: 'REMAS', songType: 'STD' })).not.toBe(k);
  });
});

describe('SongIndex', () => {
  it('finds the song for a chart across title spellings', () => {
    expect(index.forChart({ songTitle: songs.fullwidth.title.normalize('NFKC'), difficulty: 'MAS' })).toBe(songs.fullwidth);
    expect(index.forChart({ songTitle: 'no such song', difficulty: 'MAS' })).toBeUndefined();
  });

  it('tells TRUST (STD only) and Trust (DX only) apart by chart type', () => {
    expect(index.forTitle('trust')).toHaveLength(2);
    expect(index.forChart({ songTitle: 'Trust', difficulty: 'MAS', songType: 'DX' })).toBe(songs.trustDx);
    expect(index.forChart({ songTitle: 'TRUST', difficulty: 'MAS', songType: 'STD' })).toBe(songs.trustStd);
    // the raw title doesn't decide it: SEGA titles are matched after normalisation
    expect(index.forChart({ songTitle: 'TRUST', difficulty: 'MAS' })).toBe(songs.trustDx);
  });

  it('finds an utage song', () => {
    expect(index.forChart({ songTitle: songs.utage.title, difficulty: 'UTAGE' })).toBe(songs.utage);
  });
});

describe('computeRating with chart identity', () => {
  it('rates Trust MAS DX with its own constant (13.6), not TRUST’s', () => {
    const r = computeRating([score('Trust', 'MAS', 'DX', 100.3162)], index, 26500);
    expect(r.allScores[0].internalLevel).toBe(13.6);
    expect(r.allScores[0].rating).toBe(294);
  });

  it('keeps one best per chart, counting a missing type as DX', () => {
    const r = computeRating([
      score(songs.dxOnly.title, 'MAS', 'DX', 99.5, 1),
      score(songs.dxOnly.title, 'MAS', undefined as unknown as Score['songType'], 100.2, 2),
    ], index, 26500);
    expect(r.allScores).toHaveLength(1);
    expect(r.allScores[0].id).toBe(2);
  });

  it('rates the DX and STD charts of the same song separately', () => {
    const r = computeRating([
      score(songs.both.title, 'MAS', 'DX', 100.5, 1),
      score(songs.both.title, 'MAS', 'STD', 100.5, 2),
    ], index, 26500);
    const byId = Object.fromEntries(r.allScores.map(s => [s.id, s.internalLevel]));
    expect(byId).toEqual({ 1: 14.6, 2: 14.4 });
  });
});

import { describe, expect, it } from 'vitest';
import { SongIndex } from '../src/chart';
import { chartOf, chartsOf, estimateConstant, lookupChart } from '../src/lookup';
import { computeRating, getTargetSuggestions } from '../src/rating';
import type { Score, Song } from '../src/types';
import fixture from './fixtures/songs.json';

const songs = fixture as unknown as Record<keyof typeof fixture, Song>;
const index = new SongIndex<Song>(Object.values(songs));

describe('chartOf', () => {
  // [song, difficulty, type, displayed level, constant]; level null = the song has no such chart
  type Case = [keyof typeof songs, Score['difficulty'], 'DX' | 'STD', string | undefined | null, number?];
  const cases: Case[] = [
    ['dxOnly', 'MAS', 'DX', '13+', 13.8],
    ['dxOnly', 'MAS', 'STD', null],                 // no borrowing from the other type
    ['stdOnly', 'MAS', 'STD', '11+', 11.7],
    ['stdOnly', 'MAS', 'DX', null],
    ['both', 'MAS', 'DX', '14+', 14.6],
    ['both', 'MAS', 'STD', '14', 14.4],
    ['both', 'REMAS', 'STD', '14', 14.2],
    ['both', 'REMAS', 'DX', null],                  // STD has Re:MAS, DX doesn't: the old DX lookup used 14.2
    ['dxRemas', 'REMAS', 'DX', '13+', 13.8],
    ['link', 'REMAS', 'STD', undefined, 13.5],      // constant without a displayed level
    ['noConstant', 'MAS', 'DX', '14+', undefined],  // displayed level only: no constant
    ['utage', 'UTAGE', 'DX', '13+?', undefined],    // utage charts never have a constant
  ];

  it.each(cases)('%s %s %s', (key, difficulty, type, level, constant) => {
    const c = chartOf(songs[key], { difficulty, type });
    if (level === null) {
      expect(c).toBeUndefined();
      return;
    }
    expect(c?.level).toBe(level);
    expect(c?.constant).toBe(constant);
    expect(c?.ref).toEqual({ title: songs[key].title, difficulty, type });
  });

  it('finds the sheet by type and difficulty name', () => {
    const dx = chartOf(songs.oshama, { difficulty: 'MAS', type: 'DX' });
    const std = chartOf(songs.oshama, { difficulty: 'MAS', type: 'STD' });
    expect(dx?.sheet).toMatchObject({ type: 'dx', difficulty: 'master' });
    expect(std?.sheet).toMatchObject({ type: 'std', difficulty: 'master' });
    expect(dx?.sheet?.noteCounts?.total).not.toBe(std?.sheet?.noteCounts?.total);
    expect(chartOf(songs.oshama, { difficulty: 'EXP', type: 'STD' })?.sheet?.difficulty).toBe('expert');
  });

  it('reads a sheet list stored as JSON text (mobile rows)', () => {
    const row = { ...songs.oshama, sheets: JSON.stringify(songs.oshama.sheets) } as unknown as Song;
    expect(chartOf(row, { difficulty: 'MAS', type: 'STD' })?.sheet?.difficulty).toBe('master');
  });
});

describe('chartsOf', () => {
  const list = (key: keyof typeof songs) => chartsOf(songs[key]).map(c => `${c.ref.type} ${c.ref.difficulty}`);

  it('lists DX then STD charts, each BAS to Re:MAS', () => {
    expect(list('both')).toEqual([
      'DX BAS', 'DX ADV', 'DX EXP', 'DX MAS',
      'STD BAS', 'STD ADV', 'STD EXP', 'STD MAS', 'STD REMAS',
    ]);
    expect(list('oshama')).toEqual(['DX BAS', 'DX ADV', 'DX EXP', 'DX MAS', 'STD BAS', 'STD ADV', 'STD EXP', 'STD MAS']);
  });

  it('lists only the type a song has, and utage charts', () => {
    expect(list('stdOnly').every(c => c.startsWith('STD'))).toBe(true);
    expect(list('dxRemas')).toContain('DX REMAS');
    expect(list('utage')).toEqual(['DX UTAGE']);
  });
});

describe('lookupChart', () => {
  it('finds the right song for each type of a shared title', () => {
    expect(lookupChart(index, { songTitle: 'TRUST', difficulty: 'MAS', songType: 'STD' })?.constant).toBe(13.1);
    expect(lookupChart(index, { songTitle: 'Trust', difficulty: 'MAS', songType: 'DX' })?.constant).toBe(13.6);
    expect(lookupChart(index, { songTitle: 'no such song', difficulty: 'MAS' })).toBeUndefined();
  });
});

describe('estimateConstant', () => {
  it.each([['13', 13], ['13+', 13.7], ['14+', 14.7], ['13+?', undefined], ['', undefined], [undefined, undefined]])(
    '%s → %s', (level, expected) => expect(estimateConstant(level)).toBe(expected),
  );
});

describe('rating uses only known constants', () => {
  const score = (songTitle: string, difficulty: Score['difficulty'], songType: Score['songType'], achievement: number, id: number): Score =>
    ({ id, songTitle, difficulty, songType, achievement, dxScore: null, fc: null, fs: null, playedAt: new Date('2026-10-01') });

  it('lists a chart without a constant but never rates it', () => {
    const r = computeRating([
      score(songs.noConstant.title, 'MAS', 'DX', 100.5, 1),
      score(songs.utage.title, 'UTAGE', 'DX', 101, 2),
      score(songs.dxOnly.title, 'MAS', 'DX', 100.5, 3),
    ], index, 26500);
    expect([...r.newCharts, ...r.oldCharts].map(s => s.id)).toEqual([3]);
    expect(r.allScores.map(s => s.id)).toEqual([3, 2, 1]);
    expect(r.allScores.find(s => s.id === 1)?.rating).toBe(0);
  });
});

describe('target suggestions', () => {
  it('name the chart type, so an STD target opens the STD chart', () => {
    const at = new Date('2026-10-01');
    const r = computeRating([
      { id: 1, songTitle: songs.both.title, difficulty: 'MAS', songType: 'STD', achievement: 98.2, dxScore: null, fc: null, fs: null, playedAt: at },
    ], index, 26500);
    const t = getTargetSuggestions(r, r.allScores);
    expect(t.map(x => `${x.songType} ${x.difficulty} ${x.internalLevel}`)).toEqual(['STD MAS 14.4']);
  });
});

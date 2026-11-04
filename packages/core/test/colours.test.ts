import { describe, expect, it } from 'vitest';
import { DIFF_COLOR, difficultyColor } from '../src/difficulty-colors';
import { rankGlyphs } from '../src/rank-glyphs';
import { RANK_DEFINITIONS } from '../src/rating';

describe('difficulty colours', () => {
  it('match in either casing and fall back to grey', () => {
    expect(difficultyColor('MAS')).toBe('#9f51dc');
    expect(difficultyColor('remas')).toBe(DIFF_COLOR.REMAS);
    expect(difficultyColor('nope')).toBe('#9ca3af');
    expect(difficultyColor(null, 'x')).toBe('x');
  });
});

describe('rank glyphs', () => {
  it('letter every rank of the ladder', () => {
    for (const r of RANK_DEFINITIONS) expect(rankGlyphs(r.title).map(g => g[0]).join('')).toBe(r.title);
  });
});

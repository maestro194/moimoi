/**
 * How a rank is lettered on a B50 card: each letter in its own colour, the "+" smaller and gold.
 * SSS/SSS+ run gold → sky → pink; SS+ and below are gold; A ranks pink; B ranks sky; C and D grey.
 * One scheme for the B50 image, the web cards and the mobile badges.
 */
export const RANK_COLORS = { gold: '#fcd34d', sky: '#5ec4f5', pink: '#f472a0', grey: '#b4b0c0' } as const;

/** [letter, colour, isPlus] */
export type RankGlyph = [string, string, boolean?];

const { gold: G, sky: K, pink: P, grey: Y } = RANK_COLORS;
const GLYPHS: Record<string, RankGlyph[]> = {
  'SSS+': [['S', G], ['S', K], ['S', P], ['+', G, true]],
  'SSS':  [['S', G], ['S', K], ['S', P]],
  'SS+':  [['S', G], ['S', G], ['+', G, true]],
  'SS':   [['S', G], ['S', G]],
  'S+':   [['S', G], ['+', G, true]],
  'S':    [['S', G]],
  'AAA':  [['A', P], ['A', P], ['A', P]],
  'AA':   [['A', P], ['A', P]],
  'A':    [['A', P]],
  'BBB':  [['B', K], ['B', K], ['B', K]],
  'BB':   [['B', K], ['B', K]],
  'B':    [['B', K]],
  'C':    [['C', Y]],
  'D':    [['D', Y]],
};

/** The letters of a rank title ("SSS+", "AA", …) with their colours; an unknown rank is a white "?". */
export function rankGlyphs(rank: string): RankGlyph[] {
  return GLYPHS[rank] ?? [['?', '#ffffff']];
}

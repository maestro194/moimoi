import { describe, expect, it } from 'vitest';
import { groupCredits, newestPlayFirst, sameOfficialPlay } from '../src/sessions';

// 18 Nov 2026, 12:48 JST: Xaleid◆scopiX EXPERT played as track 1 and track 2 within one minute.
// maimai NET lists the newer play first and gives both the same time.
const at1248 = '2026-11-18T03:48:00.000Z';
const xaleid = (id: number, track: number, achievement: number) =>
  ({ id, songTitle: 'Xaleid◆scopiX', difficulty: 'EXP', songType: 'DX', achievement, track, playedAt: at1248 });
const track2 = xaleid(2, 2, 0);
const track1 = xaleid(1, 1, 0.0518);

describe('two plays of one chart in the same minute', () => {
  it('are different official plays', () => {
    expect(sameOfficialPlay(track1, track2)).toBe(false);
    expect(sameOfficialPlay(track1, { ...track1, id: 9 })).toBe(true);
  });

  it('order by track within the minute, whatever order they arrive in', () => {
    expect([track1, track2].sort(newestPlayFirst).map(p => p.track)).toEqual([2, 1]);
    expect([track2, track1].sort(newestPlayFirst).map(p => p.track)).toEqual([2, 1]);
  });

  it('form one credit in play order', () => {
    for (const input of [[track1, track2], [track2, track1]]) {
      expect(groupCredits(input).map(c => c.plays.map(p => p.track))).toEqual([[1, 2]]);
    }
  });
});

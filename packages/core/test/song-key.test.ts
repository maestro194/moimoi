import { describe, expect, it } from 'vitest';
import { songKey, titlesListedTwice } from '../src/chart';

describe('song key', () => {
  const list = [
    { title: 'Link', image_url: '1e44516a8a3b5a51.png' },   // Clean Tears, maimai PLUS
    { title: 'Link', image_url: 'e90f79d9dcff84df.png' },   // Circle of friends, ORANGE
    { title: 'Oshama Scramble!', image_url: 'a.png' },
  ];
  const shared = titlesListedTwice(list);

  it('keys a title listed once by the title, so existing rows keep their key', () => {
    expect(songKey('Oshama Scramble!', 'a.png', shared)).toBe('Oshama Scramble!');
  });

  it('keys each song of a shared title by title#jacket', () => {
    expect([...shared]).toEqual(['Link']);
    expect(list.filter(s => s.title === 'Link').map(s => songKey(s.title, s.image_url, shared)))
      .toEqual(['Link#1e44516a8a3b5a51.png', 'Link#e90f79d9dcff84df.png']);
  });
});

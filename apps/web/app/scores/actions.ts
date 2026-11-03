'use server';

import { fetchSongs } from '@/lib/song-db';
import { chartsOf, type Difficulty } from '@maimai-suite/core';
import { toRomaji } from '@/lib/romaji';
import { getSetting } from '@/lib/maimai-sync';

export interface MinimalChart {
  title: string;
  searchKey: string;
  diff: Difficulty;
  type: 'DX' | 'STD';
  level: number;
  image: string;
  intl: boolean;
}

export async function getAllCharts(): Promise<MinimalChart[]> {
  const songs = await fetchSongs();
  const charts: MinimalChart[] = [];

  const region = await getSetting('maimai_region') ?? 'intl';
  
  for (const s of songs) {
    if (region === 'intl' && s.intl === false) continue;
    if (region === 'jp' && s.jp === false) continue;

    const searchKey = (toRomaji(s.title_kana || '') + ' ' + s.title).toLowerCase();
    // Charts with a known constant (utage charts never have one)
    for (const c of chartsOf(s)) {
      if (c.constant === undefined) continue;
      charts.push({
        title: s.title,
        searchKey,
        diff: c.ref.difficulty,
        type: c.ref.type,
        level: c.constant,
        image: s.image_url || '',
        intl: s.intl ?? true,
      });
    }
  }

  return charts;
}

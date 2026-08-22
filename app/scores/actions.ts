'use server';

import { fetchSongs } from '@/lib/song-db';
import type { Difficulty } from '@/lib/types';
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

    const processDiffs = (type: 'DX' | 'STD', prefix: string) => {
      const diffs: { name: Difficulty; key: string }[] = [
        { name: 'BAS', key: 'bas_i' },
        { name: 'ADV', key: 'adv_i' },
        { name: 'EXP', key: 'exp_i' },
        { name: 'MAS', key: 'mas_i' },
        { name: 'REMAS', key: 'remas_i' },
      ];

      for (const d of diffs) {
        const valStr = (s as any)[`${prefix}${d.key}`];
        if (valStr) {
          const level = parseFloat(valStr);
          if (!isNaN(level)) {
            charts.push({
              title: s.title,
              searchKey: (toRomaji(s.title_kana || '') + ' ' + s.title).toLowerCase(),
              diff: d.name,
              type,
              level,
              image: s.image_url || '',
              intl: s.intl ?? true,
            });
          }
        }
      }
    };

    if (s.dx_lev_bas_i) processDiffs('DX', 'dx_lev_');
    if (s.lev_bas_i) processDiffs('STD', 'lev_');
  }

  return charts;
}

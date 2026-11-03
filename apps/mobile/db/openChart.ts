/**
 * The one way to open the song modal: pass the chart's identity, nothing else (db/chartDetail.ts loads the rest).
 */
import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { chartRef, type ChartLike } from '@maimai-suite/core';

export function useOpenChart() {
  const router = useRouter();
  return useCallback((chart: ChartLike) => {
    const { title, difficulty, type } = chartRef(chart);
    router.push({ pathname: '/modal', params: { title, difficulty, type } });
  }, [router]);
}

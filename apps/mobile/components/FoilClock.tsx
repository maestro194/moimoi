import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import type { ListViewToken } from 'react-native';
import { useFrameCallback, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useIsFocused } from 'expo-router';
import { useFoilAnimation } from '@/db/foilPref';

/** Keys of the list rows on screen. */
export type VisibleRows = Record<string, true>;

interface FoilClockValue {
  /** Frame time in ms on the UI thread. Every foil card derives its pose from it, so cards stay in phase. */
  clock: SharedValue<number>;
  /** Rows on screen, or null when every card counts as visible (screens without a virtualized list). */
  visible: SharedValue<VisibleRows> | null;
}

const FoilClockContext = createContext<FoilClockValue | null>(null);

export function useFoilClock(): FoilClockValue | null {
  return useContext(FoilClockContext);
}

/**
 * One clock for all foil cards on a screen. It only ticks while the screen is focused, the
 * "Foil animation" setting is on and the system doesn't ask for reduced motion; otherwise the
 * cards hold still.
 */
export function FoilClockProvider({ visible, children }: { visible?: SharedValue<VisibleRows>; children: ReactNode }) {
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const [enabled] = useFoilAnimation();
  const active = focused && !reduced && enabled;

  const clock = useSharedValue(0);
  const ticker = useFrameCallback((frame) => {
    clock.value = frame.timestamp;
  }, false);

  useEffect(() => {
    ticker.setActive(active);
  }, [active, ticker]);

  return <FoilClockContext.Provider value={{ clock, visible: visible ?? null }}>{children}</FoilClockContext.Provider>;
}

/**
 * Tracks which rows of a FlatList are on screen, for FoilClockProvider. Pass `onViewableItemsChanged`
 * to the list (it keeps one identity, as FlatList requires) and `visible` to the provider.
 */
export function useFoilVisibility() {
  const visible = useSharedValue<VisibleRows>({});
  const handler = useRef(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const keys: VisibleRows = {};
    for (const v of viewableItems) if (v.item?.key) keys[(v.item as { key: string }).key] = true;
    visible.value = keys;
  }).current;
  return { visible, onViewableItemsChanged: handler };
}

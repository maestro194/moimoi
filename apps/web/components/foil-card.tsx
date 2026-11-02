'use client';

import { useEffect, useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { foilTagLabel, type FoilInfo } from '@maimai-suite/core';
import styles from './foil-card.module.css';

/** Settings → "Foil animation". Stored per browser; when off, cards keep a still foil. */
const FOIL_PREF_KEY = 'moimoi-foil-animation';

const prefListeners = new Set<() => void>();

function readFoilAnimation(): boolean {
  try { return localStorage.getItem(FOIL_PREF_KEY) !== 'off'; } catch { return true; }
}

function setFoilAnimation(on: boolean) {
  try { localStorage.setItem(FOIL_PREF_KEY, on ? 'on' : 'off'); } catch {}
  document.documentElement.dataset.foil = on ? 'animated' : 'static';
  prefListeners.forEach(l => l());
}

function subscribePref(listener: () => void) {
  prefListeners.add(listener);
  return () => { prefListeners.delete(listener); };
}

/** The "Foil animation" setting as [value, set]. Animated on the server render and until the browser has been read. */
export function useFoilAnimation(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribePref, readFoilAnimation, () => true);
  return [on, setFoilAnimation];
}

/** One observer for every foil card: animations pause while a card is off screen. */
let observer: IntersectionObserver | null = null;
function getObserver() {
  if (!observer && typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) (e.target as HTMLElement).removeAttribute('data-offscreen');
        else (e.target as HTMLElement).setAttribute('data-offscreen', '');
      }
    }, { rootMargin: '200px' });
  }
  return observer;
}

/** Class for the card's rating number so it is printed in the tier's foil colours. */
export function foilRatingClass(foil?: FoilInfo | null) {
  return foil?.tier ? `${styles.rating} ${styles[`rating-${foil.tier}`]}` : '';
}

interface Props {
  foil?: FoilInfo | null;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Wraps a B50 card with its foil: a turning foil edge and a sweeping wave of colour by tier, a fading
 * blue glow for a recent best, and a frame for the B50 #1. Without foil it renders the card as is.
 */
export function FoilCard({ foil, className, style, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fresh = foil?.freshness ?? 0;
  const animated = !!foil?.tier || fresh > 0;

  const [foilAnimated] = useFoilAnimation();
  useEffect(() => {
    document.documentElement.dataset.foil = foilAnimated ? 'animated' : 'static';
  }, [foilAnimated]);

  useEffect(() => {
    const el = ref.current, obs = getObserver();
    if (!animated || !el || !obs) return;
    obs.observe(el);
    return () => obs.unobserve(el);
  }, [animated]);

  const rootStyle = fresh > 0 ? ({ ...style, '--fresh': fresh.toFixed(2) } as CSSProperties) : style;

  return (
    <div ref={ref} className={`${styles.root} ${className ?? ''}`} style={rootStyle}>
      {foil?.isTop1 && <span className={styles.crown}>★ B50 #1</span>}
      {foil?.tagged && <span className={styles.tag}>{foilTagLabel(foil)}</span>}
      {foil?.tier ? (
        <div className={`${styles.frame} ${styles[foil.tier]} ${foil.isTop1 ? styles.top1 : ''}`}>
          <span className={styles.edge} aria-hidden />
          <div className={styles.content}>{children}</div>
          <span className={styles.tint} aria-hidden />
          <span className={styles.band} aria-hidden />
        </div>
      ) : (
        <div className={foil?.isTop1 ? `${styles.top1} rounded-xl` : undefined}>{children}</div>
      )}
      {fresh > 0 && <span className={styles.glow} aria-hidden />}
    </div>
  );
}

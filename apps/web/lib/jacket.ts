// Jacket image sources — pure module (no DB imports) so client components can use it.

/** Community mirror keyed by the same image_url filename Sega uses. Covers JP + INTL songs. */
export const OTOGE_DB_JACKET_BASE = 'https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/jacket';
export const SEGA_INTL_JACKET_BASE = 'https://maimaidx-eng.com/maimai-mobile/img/Music';

/**
 * Ordered jacket candidates for a song, best first.
 * The mirror goes first: when Sega is down its requests time out (slow) rather than fail fast.
 * Sega's INTL server only serves INTL songs, so JP-only songs get the mirror alone.
 */
export function getJacketUrls(imageName?: string | null, intl?: boolean | null): string[] {
  if (!imageName) return [];
  const urls = [`${OTOGE_DB_JACKET_BASE}/${imageName}`];
  if (intl !== false) urls.push(`${SEGA_INTL_JACKET_BASE}/${imageName}`);
  return urls;
}

/** Primary jacket URL (for places that can't fall back, e.g. CSS background-image). */
export function getJacketUrl(imageName?: string | null, intl?: boolean | null): string {
  return getJacketUrls(imageName, intl)[0] ?? '';
}

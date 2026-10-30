import React, { useState } from 'react';
import { Image, View, type ImageStyle, type StyleProp } from 'react-native';

/** Community mirror keyed by the same image_url filename Sega uses. Covers JP + INTL songs. */
const OTOGE_DB_JACKET_BASE = 'https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/jacket';
const SEGA_INTL_JACKET_BASE = 'https://maimaidx-eng.com/maimai-mobile/img/Music';

/**
 * Ordered jacket candidates, best first (keep in sync with apps/web/lib/jacket.ts).
 * The mirror goes first: when Sega is down its requests time out (slow) rather than fail fast.
 */
export function getJacketUrls(imageName?: string | null): string[] {
  if (!imageName) return [];
  return [`${OTOGE_DB_JACKET_BASE}/${imageName}`, `${SEGA_INTL_JACKET_BASE}/${imageName}`];
}

interface JacketImageProps {
  imageName?: string | null;
  style?: StyleProp<ImageStyle>;
}

/** Image that steps through the jacket source chain on load error; an empty box if all fail. */
export function JacketImage({ imageName, style }: JacketImageProps) {
  const urls = getJacketUrls(imageName);
  // Failure count is keyed to the song so a recycled list row restarts the chain
  const key = urls.join('|');
  const [failed, setFailed] = useState({ key, count: 0 });
  const index = failed.key === key ? failed.count : 0;

  const uri = urls[index];
  if (!uri) return <View style={style} />;

  return <Image source={{ uri }} style={style} onError={() => setFailed({ key, count: index + 1 })} />;
}

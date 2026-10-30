'use client';

import React, { useState } from 'react';
import { getJacketUrls } from '@/lib/jacket';

interface JacketImgProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  imageName?: string | null;
  intl?: boolean | null;
  /** Rendered when there is no image_url or every source failed. */
  fallback?: React.ReactNode;
}

/** <img> that steps through the jacket source chain on load error, then renders `fallback`. */
export function JacketImg({ imageName, intl, fallback = null, ...imgProps }: JacketImgProps) {
  const urls = getJacketUrls(imageName, intl);
  // Failure count is keyed to the song so a reused component (lists/modals) restarts the chain
  const key = urls.join('|');
  const [failed, setFailed] = useState({ key, count: 0 });
  const index = failed.key === key ? failed.count : 0;

  const src = urls[index];
  if (!src) return <>{fallback}</>;

  return (
    <img
      alt=""
      {...imgProps}
      src={src}
      onError={() => setFailed({ key, count: index + 1 })}
    />
  );
}

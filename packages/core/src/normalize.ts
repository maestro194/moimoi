/**
 * Normalize song titles for reliable matching between play logs and song DB.
 * 
 * maimai NET HTML often uses halfwidth ASCII characters for punctuation,
 * while otoge-db and the song DB use fullwidth equivalents. This function
 * normalizes both directions so lookups always match.
 */
export function normalizeTitle(t: string): string {
  if (!t) return '';
  return t
    .toLowerCase()
    // NFKC normalization decomposes circled katakana (㋰→ム), circled
    // digits (⑨→9), fullwidth ASCII (Ａ→A, ：→:), etc. into their
    // canonical equivalents in one pass.
    .normalize('NFKC')
    // Fullwidth space → normal space (not always covered by NFKC)
    .replace(/\u3000/g, ' ')
    .trim();
}

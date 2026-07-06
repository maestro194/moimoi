/**
 * Normalize song titles for reliable matching between play logs and song DB.
 */
export function normalizeTitle(t: string): string {
  if (!t) return '';
  return t
    .toLowerCase()
    .replace(/！/g, '!')
    .replace(/？/g, '?')
    .replace(/　/g, ' ')
    .replace(/～/g, '~')
    .trim();
}

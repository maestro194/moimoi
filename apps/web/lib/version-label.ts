/**
 * Maps a raw song.version number (string) to its human-readable version name.
 *
 * Versions are stored as arbitrary numbers within a range, not just the
 * boundary values — e.g. a CiRCLE song might have version "26043", not "26000".
 * So we use a threshold-based range lookup instead of an exact key match.
 *
 * INTL versions start at 20000; JP-only versions are below 20000.
 */

// Each entry: [minimumVersionNumber, displayName]
// Sorted highest-first so the first match wins.
const VERSION_RANGES: [number, string][] = [
  // ── INTL ──────────────────────────────────────────────────
  [26500, 'CiRCLE PLUS'],
  [26000, 'CiRCLE'],
  [25500, 'PRiSM PLUS'],
  [25000, 'PRiSM'],
  [24500, 'BUDDiES PLUS'],
  [24000, 'BUDDiES'],
  [23500, 'FESTiVAL PLUS'],
  [23000, 'FESTiVAL'],
  [22500, 'UNiVERSE PLUS'],
  [22000, 'UNiVERSE'],
  [21500, 'Splash PLUS'],
  [21000, 'Splash'],
  [20500, 'DX PLUS'],
  [20000, 'maimai DX'],
  // ── JP-only (legacy) ─────────────────────────────────────
  [19900, 'CiRCLE (JP)'],
  [19500, 'PRiSM PLUS (JP)'],
  [19000, 'PRiSM (JP)'],
  [18500, 'BUDDiES PLUS (JP)'],
  [18000, 'BUDDiES (JP)'],
  [17000, 'FESTiVAL PLUS (JP)'],
  [16000, 'FESTiVAL (JP)'],
  [15000, 'UNiVERSE PLUS (JP)'],
  [14000, 'UNiVERSE (JP)'],
  [13000, 'Splash PLUS (JP)'],
  [12000, 'Splash (JP)'],
  [11000, 'DX PLUS (JP)'],
  [10000, 'maimai DX (JP)'],
];

export function versionLabel(v: string | number | undefined | null): string {
  if (v == null || v === '') return 'Unknown';
  const n = typeof v === 'number' ? v : parseInt(v, 10);
  if (isNaN(n)) return String(v);
  for (const [threshold, name] of VERSION_RANGES) {
    if (n >= threshold) return name;
  }
  return String(v);
}

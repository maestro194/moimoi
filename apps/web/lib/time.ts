// Display times are hardcoded to UTC+7, 24-hour — independent of the server's or browser's time zone
// (keep in sync with apps/mobile/constants/time.ts).

const OFFSET_MS = 7 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type DateInput = Date | string | number;

/** The instant shifted so its UTC fields read as UTC+7 wall-clock time. */
function shifted(input: DateInput): Date {
  return new Date(new Date(input).getTime() + OFFSET_MS);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "19:35" */
export function formatTime(input: DateInput): string {
  const d = shifted(input);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "Oct 29" */
export function formatShortDate(input: DateInput): string {
  const d = shifted(input);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "Thursday, October 29, 2026" */
export function formatLongDate(input: DateInput): string {
  const d = shifted(input);
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "2026-10-29" */
export function formatIsoDate(input: DateInput): string {
  const d = shifted(input);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** "Oct 29, 2026 19:35" */
export function formatDateTime(input: DateInput): string {
  const d = shifted(input);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} ${formatTime(input)}`;
}

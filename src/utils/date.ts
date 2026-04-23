// Date utility — timezone-safe helpers
// Never use new Date(dateStr).toISOString().slice(0,10) for date-only strings,
// as it can shift the day during DST transitions.

/**
 * Get today's date as YYYY-MM-DD using local time (no UTC/DST shift).
 */
export function getTodayStr(): string {
  const d = new Date();
  return toLocalDateStr(d);
}

/**
 * Format a Date object as YYYY-MM-DD using local components.
 */
export function toLocalDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Navigate a date string (YYYY-MM-DD) by a number of days.
 * Returns a new YYYY-MM-DD string using local time.
 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00'); // noon to avoid DST boundary
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

/**
 * Navigate a date string by a number of months.
 * Returns a new YYYY-MM-DD string using local time.
 */
export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  return toLocalDateStr(d);
}
/**
 * Locale-stable date/number formatting (audit Low: date/locale utils).
 *
 * Bare `toLocaleDateString()` / `toLocaleString()` calls format with the
 * *viewer's* OS/browser locale, so the same field rendered "1/5/2026",
 * "5 janv. 2026" or "5.1.26" depending on who was looking, and the
 * in-house recipes (`'en-US', { month: 'short', day: 'numeric' }` …)
 * were re-declared in a dozen components with small drift between them.
 *
 * The product ships one language, so every formatter here pins 'en-US'
 * once. Output is deterministic across browsers, server and client, and
 * if a locale picker ever ships, this is the one file that changes.
 *
 * Invalid inputs behave exactly like the old inline calls ("Invalid
 * Date") — callers that already guard against null/undefined keep doing
 * so.
 */

const LOCALE = 'en-US';

type DateInput = Date | string | number;

/** "Jan 5" — short date without a year (chips, tables, comments). */
export function formatDate(value: DateInput): string {
  return new Date(value).toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' });
}

/** "Jan 5, 2026" — short date with a year (goals, legal, records). */
export function formatDateWithYear(value: DateInput): string {
  return new Date(value).toLocaleDateString(LOCALE, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "3:04 PM" — time of day. */
export function formatTime(value: DateInput): string {
  return new Date(value).toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** "Jan 5, 3:04 PM" — date + time, no year (comments, inbox, activity). */
export function formatDateTime(value: DateInput): string {
  return new Date(value).toLocaleString(LOCALE, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** "Jan 5, 2026, 3:04 PM" — full timestamp for audit-style records. */
export function formatTimestamp(value: DateInput): string {
  return new Date(value).toLocaleString(LOCALE, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/** 12,345 — grouped number, pinned locale. Extra Intl options optional. */
export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  return value.toLocaleString(LOCALE, options);
}

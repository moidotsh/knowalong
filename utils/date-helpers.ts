// utils/date-helpers.ts
// Date utilities for consistent parsing/formatting. Complements the
// lighter-weight formatters in shared/utils/formatters.ts (which depend
// on date-fns directly); these helpers handle the local-vs-UTC edge
// cases that bite date-only strings.

import { parseISO, startOfDay, format, isYesterday } from 'date-fns';

/**
 * Parse a date string as local time to avoid UTC timezone issues.
 * When date is just "2024-03-20", `new Date()` interprets as UTC midnight
 * which can shift to the previous day in some timezones.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();

  const parsed = parseISO(dateStr);

  if (!isNaN(parsed.getTime())) {
    if (parsed.getTime() === startOfDay(parsed).getTime()) {
      const parts = dateStr.split(/[-T:]/);
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return parsed;
  }

  return new Date(dateStr);
}

/**
 * Coerce a Date | string to a Date, parsing date-only strings as local
 * midnight (avoids the UTC-offset drift that `new Date('2024-03-20')` causes
 * in western longitudes). Pass everything through here when the input is
 * user-controlled or comes in as a date-only ISO string.
 */
function toDate(date: Date | string): Date {
  return typeof date === 'string' ? parseLocalDate(date) : date;
}

/**
 * Format a date for display in the UI using Intl.DateTimeFormat.
 */
export function formatDateForDisplay(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  },
): string {
  const d = toDate(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', options);
}

/**
 * Compact month-year label: 'Jun 2025' | '' (invalid).
 */
export function formatMonthYear(date: Date | string): string {
  const d = toDate(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Format a date with time for display.
 */
export function formatDateTimeForDisplay(date: Date | string): string {
  const d = toDate(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format time only (no date).
 */
export function formatTimeForDisplay(date: Date | string): string {
  const d = toDate(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Parse a date string safely. Returns null if invalid.
 */
export function parseDateString(dateString: string): Date | null {
  if (!dateString) return null;
  const d = parseLocalDate(dateString);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * True when the given date is the same calendar day as today.
 */
export function isToday(date: Date | string): boolean {
  const d = toDate(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/**
 * Whole days between two dates (can be negative if end < start).
 * Times are normalized to midnight so partial-day diffs don't drift.
 */
export function getDaysBetween(start: Date | string, end: Date | string): number {
  const startDate = toDate(start);
  const endDate = toDate(end);

  const startMidnight = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );
  const endMidnight = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );

  const diffTime = endMidnight.getTime() - startMidnight.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Relative time string ("2 hours ago", "in 3 days").
 * Returns '' for invalid dates.
 */
export function getRelativeTime(date: Date | string, relativeTo: Date = new Date()): string {
  const d = toDate(date);
  if (isNaN(d.getTime())) return '';

  const diffMs = d.getTime() - relativeTo.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  const isPast = diffMs < 0;
  const absDiffSec = Math.abs(diffSeconds);
  const absDiffMin = Math.abs(diffMinutes);
  const absDiffHour = Math.abs(diffHours);
  const absDiffDay = Math.abs(diffDays);

  if (absDiffSec < 60) {
    return isPast ? 'just now' : 'in a few seconds';
  }
  if (absDiffMin < 60) {
    return isPast
      ? `${absDiffMin} minute${absDiffMin > 1 ? 's' : ''} ago`
      : `in ${absDiffMin} minute${absDiffMin > 1 ? 's' : ''}`;
  }
  if (absDiffHour < 24) {
    return isPast
      ? `${absDiffHour} hour${absDiffHour > 1 ? 's' : ''} ago`
      : `in ${absDiffHour} hour${absDiffHour > 1 ? 's' : ''}`;
  }
  if (absDiffDay < 7) {
    return isPast
      ? `${absDiffDay} day${absDiffDay > 1 ? 's' : ''} ago`
      : `in ${absDiffDay} day${absDiffDay > 1 ? 's' : ''}`;
  }

  return formatDateForDisplay(d);
}

/** Midnight of the given date (or now). */
export function getStartOfDay(date: Date | string = new Date()): Date {
  const d = toDate(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** End of day (23:59:59.999) of the given date. */
export function getEndOfDay(date: Date | string = new Date()): Date {
  const d = toDate(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Add days to a date (negative subtracts). Returns a new Date. */
export function addDays(date: Date | string, days: number): Date {
  const d = toDate(date);
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/** True when the date is in the past. */
export function isPast(date: Date | string): boolean {
  const d = toDate(date);
  return d.getTime() < Date.now();
}

/** True when the date is in the future. */
export function isFuture(date: Date | string): boolean {
  const d = toDate(date);
  return d.getTime() > Date.now();
}

/**
 * Eyebrow-style group label: 'TODAY' | 'YESTERDAY' | 'JUN 15'.
 * Used as section headers above date-grouped lists.
 */
export function formatDateGroupLabel(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  if (isToday(d)) return 'TODAY';
  if (isYesterday(d)) return 'YESTERDAY';
  return format(d, 'MMM d').toUpperCase();
}

/**
 * Sentence-case variant of `formatDateGroupLabel` for inline row use.
 */
export function formatSessionDateLabel(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

/**
 * Long-form duration: "2 hr 30 min" | "45 min".
 */
export function formatDurationLong(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${mins} min`;
}

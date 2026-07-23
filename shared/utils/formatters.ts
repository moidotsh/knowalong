// shared/utils/formatters.ts
// Canonical formatting helpers — UUID validation/truncation and date
// formatting. Domain-agnostic; used wherever compact date/UUID display
// is needed.

import { format, formatDistanceToNow } from 'date-fns';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True when the string is a valid RFC 4122 UUID (v1-v5). */
export function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

/** Truncate a UUID (or any long string) to `prefix…suffix` for compact display. */
export function truncateUUID(uuid: string, prefixChars = 8, suffixChars = 8): string {
  if (!uuid || uuid.length <= prefixChars + suffixChars) {
    return uuid;
  }
  return `${uuid.substring(0, prefixChars)}...${uuid.substring(uuid.length - suffixChars)}`;
}

/** Format a date using a date-fns format string (default "MMM d, yyyy"). */
export function formatDate(date: string | Date, formatStr = 'MMM d, yyyy'): string {
  return format(new Date(date), formatStr);
}

/**
 * Human-readable relative time: "Just now", "X minutes ago",
 * or a date-fns distance string for older timestamps.
 */
export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Compact relative time for space-constrained rows: "now", "34m", "2h",
 * "3d", then "MMM d" (e.g. "Jun 17") for anything older than a week.
 */
export function formatCompactRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 60) return 'now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return format(d, 'MMM d');
}

import { describe, it, expect } from 'vitest';
import {
  parseLocalDate,
  parseDateString,
  isToday,
  getDaysBetween,
  getStartOfDay,
  getEndOfDay,
  addDays,
  isPast,
  isFuture,
  formatDurationLong,
  formatDateGroupLabel,
  formatSessionDateLabel,
} from '../../utils/date-helpers';

describe('parseLocalDate', () => {
  it('returns today for empty input', () => {
    const result = parseLocalDate('');
    expect(result).toBeInstanceOf(Date);
    // Just verify it's recent — don't compare exact ms.
    expect(Date.now() - result.getTime()).toBeLessThan(1000);
  });

  it('parses a date-only string as local midnight (not UTC)', () => {
    // The classic bug: '2024-03-20' parsed by `new Date()` is UTC midnight,
    // which shifts to the previous day in western longitudes. parseLocalDate
    // must use local time so the day stays 20.
    const result = parseLocalDate('2024-03-20');
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(2); // March
    expect(result.getDate()).toBe(20);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it('passes through datetime strings that include time', () => {
    const result = parseLocalDate('2024-03-20T15:30:00');
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(20);
    expect(result.getHours()).toBe(15);
    expect(result.getMinutes()).toBe(30);
  });

  it('falls back to Date constructor for non-ISO strings', () => {
    const result = parseLocalDate('March 20, 2024');
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(20);
  });
});

describe('parseDateString', () => {
  it('returns null for empty input', () => {
    expect(parseDateString('')).toBeNull();
    expect(parseDateString(null as unknown as string)).toBeNull();
  });

  it('returns null for invalid date strings', () => {
    expect(parseDateString('not a date')).toBeNull();
    expect(parseDateString('2024-13-99')).toBeNull();
  });

  it('returns a Date for valid input', () => {
    const result = parseDateString('2024-03-20');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
  });
});

describe('isToday', () => {
  it('returns true for the current time', () => {
    expect(isToday(new Date())).toBe(true);
  });

  it('returns true for a date-only string of today', () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(isToday(today)).toBe(true);
  });

  it('returns false for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });
});

describe('getDaysBetween', () => {
  it('returns 0 for the same day', () => {
    expect(getDaysBetween('2024-03-20', '2024-03-20')).toBe(0);
  });

  it('returns positive days when end is after start', () => {
    expect(getDaysBetween('2024-03-20', '2024-03-25')).toBe(5);
  });

  it('returns negative days when end is before start', () => {
    expect(getDaysBetween('2024-03-25', '2024-03-20')).toBe(-5);
  });

  it('normalizes times to midnight so partial days do not drift', () => {
    // Same calendar day, different times — should still be 0.
    expect(getDaysBetween('2024-03-20T00:00:00', '2024-03-20T23:59:59')).toBe(0);
  });

  it('handles month boundaries', () => {
    expect(getDaysBetween('2024-02-28', '2024-03-01')).toBe(2); // 2024 is a leap year
  });
});

describe('getStartOfDay / getEndOfDay', () => {
  it('getStartOfDay returns midnight of the same day', () => {
    const start = getStartOfDay('2024-03-20T15:30:00');
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getDate()).toBe(20);
  });

  it('getEndOfDay returns 23:59:59.999 of the same day', () => {
    const end = getEndOfDay('2024-03-20T15:30:00');
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
    expect(end.getDate()).toBe(20);
  });
});

describe('addDays', () => {
  it('adds positive days', () => {
    const result = addDays('2024-03-20', 5);
    expect(result.getDate()).toBe(25);
    expect(result.getMonth()).toBe(2);
  });

  it('subtracts when given negative days', () => {
    const result = addDays('2024-03-20', -5);
    expect(result.getDate()).toBe(15);
  });

  it('handles month rollover', () => {
    const result = addDays('2024-03-31', 1);
    expect(result.getMonth()).toBe(3); // April
    expect(result.getDate()).toBe(1);
  });
});

describe('isPast / isFuture', () => {
  it('isPast returns true for old dates', () => {
    expect(isPast('2020-01-01')).toBe(true);
  });

  it('isPast returns false for future dates', () => {
    expect(isPast('2099-01-01')).toBe(false);
  });

  it('isFuture returns true for future dates', () => {
    expect(isFuture('2099-01-01')).toBe(true);
  });

  it('isFuture returns false for past dates', () => {
    expect(isFuture('2020-01-01')).toBe(false);
  });
});

describe('formatDurationLong', () => {
  it('returns "<n> min" for durations under an hour', () => {
    expect(formatDurationLong(0)).toBe('0 min');
    expect(formatDurationLong(45)).toBe('45 min');
    expect(formatDurationLong(59)).toBe('59 min');
  });

  it('returns "<n> hr" for exact hours', () => {
    expect(formatDurationLong(60)).toBe('1 hr');
    expect(formatDurationLong(120)).toBe('2 hr');
  });

  it('returns "<n> hr <m> min" for mixed durations', () => {
    expect(formatDurationLong(90)).toBe('1 hr 30 min');
    expect(formatDurationLong(150)).toBe('2 hr 30 min');
  });
});

describe('formatDateGroupLabel / formatSessionDateLabel', () => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  it('formatDateGroupLabel returns TODAY for today', () => {
    expect(formatDateGroupLabel(todayStr)).toBe('TODAY');
  });

  it('formatSessionDateLabel returns "Today" for today', () => {
    expect(formatSessionDateLabel(todayStr)).toBe('Today');
  });

  it('formatDateGroupLabel returns YESTERDAY for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    expect(formatDateGroupLabel(yStr)).toBe('YESTERDAY');
  });

  it('formatDateGroupLabel returns uppercased "MMM D" for older dates', () => {
    // March 15 of last year — guaranteed not today/yesterday.
    expect(formatDateGroupLabel('2020-03-15')).toBe('MAR 15');
  });

  it('formatSessionDateLabel returns sentence-case "MMM D" for older dates', () => {
    expect(formatSessionDateLabel('2020-03-15')).toBe('Mar 15');
  });
});

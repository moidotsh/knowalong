// __tests__/utils/activityGrid.test.ts
// Pure-function tests for the ActivityGrid data helpers. No React, no DOM.
// Covers: value sanitization, date aggregation, calendar-range construction
// with leading/trailing padding, level derivation, level-resolution pipeline.

import { describe, it, expect } from 'vitest';
import {
  aggregateActivityByDate,
  buildCalendarCells,
  clampLevel,
  defaultCellLabel,
  deriveLevel,
  resolveLevels,
  resolveMaxValue,
  sanitizeValue,
} from '../../utils/activityGrid';

describe('sanitizeValue', () => {
  it('passes through non-negative finite values', () => {
    expect(sanitizeValue(0)).toBe(0);
    expect(sanitizeValue(1)).toBe(1);
    expect(sanitizeValue(3.7)).toBe(3.7);
  });

  it('rejects NaN', () => {
    expect(sanitizeValue(NaN)).toBe(0);
  });

  it('rejects negative values', () => {
    expect(sanitizeValue(-1)).toBe(0);
    expect(sanitizeValue(-0.5)).toBe(0);
  });

  it('rejects non-finite values including Infinity (item 4 correction: Infinity → 0, not 4)', () => {
    expect(sanitizeValue(Infinity)).toBe(0);
    expect(sanitizeValue(-Infinity)).toBe(0);
  });

  it('rejects non-number inputs defensively', () => {
    expect(sanitizeValue('5' as unknown as number)).toBe(0);
    expect(sanitizeValue(undefined as unknown as number)).toBe(0);
    expect(sanitizeValue(null as unknown as number)).toBe(0);
  });
});

describe('aggregateActivityByDate', () => {
  it('returns empty map for empty input', () => {
    expect(aggregateActivityByDate([]).size).toBe(0);
  });

  it('returns single-key map for single entry', () => {
    const m = aggregateActivityByDate([{ date: '2026-03-15', value: 3 }]);
    expect(m.get('2026-03-15')?.value).toBe(3);
  });

  it('sums values for duplicate dates and keeps the last label', () => {
    const m = aggregateActivityByDate([
      { date: '2026-03-15', value: 2, label: 'first' },
      { date: '2026-03-15', value: 3, label: 'second' },
    ]);
    expect(m.get('2026-03-15')?.value).toBe(5);
    expect(m.get('2026-03-15')?.label).toBe('second');
  });

  it('keeps the existing label when the duplicate omits one', () => {
    const m = aggregateActivityByDate([
      { date: '2026-03-15', value: 2, label: 'kept' },
      { date: '2026-03-15', value: 3 },
    ]);
    expect(m.get('2026-03-15')?.label).toBe('kept');
  });

  it('silently drops malformed date strings (documented normalization policy)', () => {
    const m = aggregateActivityByDate([
      { date: 'not-a-date', value: 5 },
      { date: '2026-13-40', value: 5 }, // invalid month/day
      { date: '2026-03-15', value: 1 },
    ]);
    expect(m.size).toBe(1);
    expect(m.has('2026-03-15')).toBe(true);
  });

  it('sanitizes values during aggregation', () => {
    const m = aggregateActivityByDate([
      { date: '2026-03-15', value: -3 },
      { date: '2026-03-15', value: NaN },
      { date: '2026-03-15', value: Infinity },
      { date: '2026-03-15', value: 4 },
    ]);
    expect(m.get('2026-03-15')?.value).toBe(4);
  });
});

describe('buildCalendarCells', () => {
  it('returns [] when start > end', () => {
    const cells = buildCalendarCells('2026-03-20', '2026-03-15', new Map(), { weekStartsOn: 0 });
    expect(cells).toEqual([]);
  });

  it('returns [] for malformed endpoint dates', () => {
    expect(buildCalendarCells('not-a-date', '2026-03-15', new Map(), { weekStartsOn: 0 })).toEqual([]);
    expect(buildCalendarCells('2026-03-15', 'not-a-date', new Map(), { weekStartsOn: 0 })).toEqual([]);
  });

  it('returns [] for invalid calendar dates', () => {
    expect(buildCalendarCells('2026-13-01', '2026-13-10', new Map(), { weekStartsOn: 0 })).toEqual([]);
  });

  it('single-day range produces one date cell plus padding to fill the row', () => {
    // 2026-03-15 is a Sunday. weekStartsOn=0 → 0 leading pad, 6 trailing pad.
    const cells = buildCalendarCells('2026-03-15', '2026-03-15', new Map(), { weekStartsOn: 0 });
    expect(cells.length).toBe(7);
    expect(cells[0].kind).toBe('date');
    expect(cells[0].date).toBe('2026-03-15');
    expect(cells.slice(1).every((c) => c.kind === 'trailingPad')).toBe(true);
  });

  it('weekStartsOn=0 with Sunday start produces zero leading pad', () => {
    // 2026-03-15 is a Sunday.
    const cells = buildCalendarCells('2026-03-15', '2026-03-21', new Map(), { weekStartsOn: 0 });
    expect(cells.length).toBe(7);
    expect(cells.every((c) => c.kind === 'date')).toBe(true);
  });

  it('weekStartsOn=0 with Wednesday start produces 3 leading pad cells', () => {
    // 2026-03-18 is a Wednesday.
    const cells = buildCalendarCells('2026-03-18', '2026-03-24', new Map(), { weekStartsOn: 0 });
    expect(cells.length).toBe(14); // 3 pad + 7 date + 4 trailing pad? No — 7 date, remainder to next multiple of 7.
    // Actually 3 pad + 7 date = 10; trailing pad to next multiple of 7 = 4. Total 14.
    expect(cells.slice(0, 3).every((c) => c.kind === 'leadingPad')).toBe(true);
    expect(cells.slice(3, 10).every((c) => c.kind === 'date')).toBe(true);
    expect(cells.slice(10).every((c) => c.kind === 'trailingPad')).toBe(true);
  });

  it('weekStartsOn=1 (Monday-first) with Sunday start produces 6 leading pad cells', () => {
    // 2026-03-15 is a Sunday. In a Monday-first calendar, Sunday is the last column.
    const cells = buildCalendarCells('2026-03-15', '2026-03-21', new Map(), { weekStartsOn: 1 });
    // 6 pad + 7 date = 13; trailing pad = 1. Total 14.
    expect(cells.length).toBe(14);
    expect(cells.slice(0, 6).every((c) => c.kind === 'leadingPad')).toBe(true);
    expect(cells.slice(6, 13).every((c) => c.kind === 'date')).toBe(true);
    expect(cells.slice(13).every((c) => c.kind === 'trailingPad')).toBe(true);
  });

  it('crosses month boundary correctly (Jan 28 → Feb 3, 2026)', () => {
    const cells = buildCalendarCells('2026-01-28', '2026-02-03', new Map(), { weekStartsOn: 0 });
    const dateCells = cells.filter((c) => c.kind === 'date');
    expect(dateCells.length).toBe(7);
    expect(dateCells[0].date).toBe('2026-01-28');
    expect(dateCells[3].date).toBe('2026-01-31');
    expect(dateCells[4].date).toBe('2026-02-01');
    expect(dateCells[6].date).toBe('2026-02-03');
  });

  it('crosses year boundary correctly (Dec 29, 2025 → Jan 4, 2026)', () => {
    const cells = buildCalendarCells('2025-12-29', '2026-01-04', new Map(), { weekStartsOn: 0 });
    const dateCells = cells.filter((c) => c.kind === 'date');
    expect(dateCells.length).toBe(7);
    expect(dateCells[0].date).toBe('2025-12-29');
    expect(dateCells[3].date).toBe('2026-01-01');
    expect(dateCells[6].date).toBe('2026-01-04');
  });

  it('handles leap day (Feb 29, 2024)', () => {
    const cells = buildCalendarCells('2024-02-28', '2024-03-01', new Map(), { weekStartsOn: 0 });
    const dateCells = cells.filter((c) => c.kind === 'date');
    expect(dateCells.length).toBe(3);
    expect(dateCells[0].date).toBe('2024-02-28');
    expect(dateCells[1].date).toBe('2024-02-29');
    expect(dateCells[2].date).toBe('2024-03-01');
  });

  it('total length is always a multiple of 7', () => {
    for (const range of [
      { start: '2026-03-01', end: '2026-03-31' },
      { start: '2026-01-01', end: '2026-03-31' },
      { start: '2026-03-15', end: '2026-03-15' },
      { start: '2026-03-13', end: '2026-03-20' },
    ]) {
      const cells = buildCalendarCells(range.start, range.end, new Map(), { weekStartsOn: 0 });
      expect(cells.length % 7).toBe(0);
    }
  });

  it('90-day range produces 90 date cells plus padding to a multiple of 7', () => {
    // Dec 16 2025 → Mar 15 2026 inclusive = 90 days.
    const cells = buildCalendarCells('2025-12-16', '2026-03-15', new Map(), { weekStartsOn: 0 });
    const dateCells = cells.filter((c) => c.kind === 'date');
    expect(dateCells.length).toBe(90);
    expect(cells.length % 7).toBe(0);
    expect(cells.length).toBeGreaterThanOrEqual(90);
  });

  it('missing dates inside the range produce zero-value date cells', () => {
    const cells = buildCalendarCells('2026-03-15', '2026-03-21', new Map(), { weekStartsOn: 0 });
    expect(cells.every((c) => c.kind === 'date' && c.value === 0 && c.level === 0)).toBe(true);
  });

  it('aggregated values are written onto matching date cells', () => {
    const agg = new Map([['2026-03-17', { date: '2026-03-17', value: 5 }]]);
    const cells = buildCalendarCells('2026-03-15', '2026-03-21', agg, { weekStartsOn: 0 });
    const wed = cells.find((c) => c.date === '2026-03-17');
    expect(wed?.value).toBe(5);
  });

  it('padding cells never carry a date', () => {
    const cells = buildCalendarCells('2026-03-15', '2026-03-25', new Map(), { weekStartsOn: 0 });
    const pads = cells.filter((c) => c.kind !== 'date');
    expect(pads.every((p) => p.date === undefined && p.value === 0 && p.level === 0)).toBe(true);
  });
});

describe('deriveLevel', () => {
  it('returns 0 for value 0', () => {
    expect(deriveLevel(0, 10)).toBe(0);
  });

  it('returns 1 for value just above 0', () => {
    expect(deriveLevel(1, 10)).toBe(1); // 10% < 25%
  });

  it('returns 2 in the [25%, 50%) interval', () => {
    expect(deriveLevel(3, 10)).toBe(2); // 30%
    expect(deriveLevel(4, 10)).toBe(2); // 40%
  });

  it('returns 3 at exactly 50% and through the (50%, 75%) interval', () => {
    expect(deriveLevel(5, 10)).toBe(3); // 50% is NOT < 50%, advances to next branch
    expect(deriveLevel(6, 10)).toBe(3); // 60%
    expect(deriveLevel(7, 10)).toBe(3); // 70%
  });

  it('returns 4 at exactly maxValue', () => {
    expect(deriveLevel(10, 10)).toBe(4);
  });

  it('clamps values above maxValue to 4', () => {
    expect(deriveLevel(15, 10)).toBe(4);
    expect(deriveLevel(1000, 10)).toBe(4);
  });

  it('treats Infinity value as sanitized 0 (item 4 correction)', () => {
    expect(deriveLevel(Infinity, 10)).toBe(0);
  });

  it('treats negative value as sanitized 0', () => {
    expect(deriveLevel(-5, 10)).toBe(0);
  });

  it('floors maxValue to 1 internally so positive value on zero-max yields 4', () => {
    expect(deriveLevel(0, 0)).toBe(0);
    expect(deriveLevel(5, 0)).toBe(4); // 5/1 = 5 ≥ 1
  });
});

describe('clampLevel', () => {
  it('clamps below 0 to 0', () => {
    expect(clampLevel(-1)).toBe(0);
    expect(clampLevel(-100)).toBe(0);
  });

  it('clamps above 4 to 4', () => {
    expect(clampLevel(5)).toBe(4);
    expect(clampLevel(100)).toBe(4);
  });

  it('passes through valid integers unchanged', () => {
    expect(clampLevel(0)).toBe(0);
    expect(clampLevel(1)).toBe(1);
    expect(clampLevel(2)).toBe(2);
    expect(clampLevel(3)).toBe(3);
    expect(clampLevel(4)).toBe(4);
  });

  it('floors fractional values', () => {
    expect(clampLevel(2.7)).toBe(2);
    expect(clampLevel(3.9)).toBe(3);
  });

  it('rejects NaN with 0', () => {
    expect(clampLevel(NaN)).toBe(0);
  });

  it('rejects Infinity with 0 (defensive — consumer getLevel returns are clamped)', () => {
    expect(clampLevel(Infinity)).toBe(0);
  });
});

describe('resolveLevels', () => {
  const baseCells = buildCalendarCells('2026-03-15', '2026-03-21', new Map(), { weekStartsOn: 0 });

  it('derives levels from maxValue when no getLevel is supplied', () => {
    const resolved = resolveLevels(baseCells, 10);
    // All values are 0 → all levels 0.
    expect(resolved.every((c) => c.level === 0)).toBe(true);
  });

  it('calls getLevel only on date cells and clamps the return', () => {
    const resolved = resolveLevels(baseCells, 10, () => 7 as 0); // illegal value, should clamp
    const dateCells = resolved.filter((c) => c.kind === 'date');
    const padCells = resolved.filter((c) => c.kind !== 'date');
    expect(dateCells.every((c) => c.level === 4)).toBe(true); // 7 clamps to 4
    expect(padCells.every((c) => c.level === 0)).toBe(true);
  });

  it('does not mutate the input array', () => {
    const snapshot = baseCells.map((c) => ({ ...c }));
    resolveLevels(baseCells, 10, () => 4);
    expect(baseCells).toEqual(snapshot);
  });
});

describe('resolveMaxValue', () => {
  it('returns the explicit value when valid', () => {
    expect(resolveMaxValue(new Map(), 5)).toBe(5);
  });

  it('ignores non-positive explicit values', () => {
    expect(resolveMaxValue(new Map(), 0)).toBe(1);
    expect(resolveMaxValue(new Map(), -1)).toBe(1);
  });

  it('ignores non-finite explicit values', () => {
    expect(resolveMaxValue(new Map(), NaN)).toBe(1);
    expect(resolveMaxValue(new Map(), Infinity)).toBe(1);
  });

  it('defaults to the largest aggregated value, floored to 1', () => {
    const m = new Map([
      ['2026-03-15', { date: '2026-03-15', value: 3 }],
      ['2026-03-16', { date: '2026-03-16', value: 7 }],
      ['2026-03-17', { date: '2026-03-17', value: 2 }],
    ]);
    expect(resolveMaxValue(m)).toBe(7);
  });

  it('floors to 1 when the aggregated max is 0', () => {
    const m = new Map([['2026-03-15', { date: '2026-03-15', value: 0 }]]);
    expect(resolveMaxValue(m)).toBe(1);
  });

  it('returns 1 for an empty aggregated map', () => {
    expect(resolveMaxValue(new Map())).toBe(1);
  });
});

describe('defaultCellLabel', () => {
  it('uses singular "activity" for value 1', () => {
    const label = defaultCellLabel('2026-03-15', 1);
    expect(label).toContain('1 activity');
    expect(label).not.toContain('1 activities');
  });

  it('uses plural "activities" for value 0 and value > 1', () => {
    expect(defaultCellLabel('2026-03-15', 0)).toContain('0 activities');
    expect(defaultCellLabel('2026-03-15', 5)).toContain('5 activities');
  });

  it('includes a human-readable date', () => {
    const label = defaultCellLabel('2026-03-15', 2);
    // formatShortDate produces e.g. "Mar 15, 2026" — assert the day appears.
    expect(label).toMatch(/15/);
  });
});

// utils/activityGrid.ts
// Pure, domain-neutral helpers for the ActivityGrid primitive. No React, no
// Supabase, no logger, no side effects — every function is deterministic
// against its inputs and safe to call from tests or render.
//
// Pipeline:
//   raw ActivityGridDatum[]
//     → sanitizeValue (NaN / negative / Infinity → 0)
//     → aggregateActivityByDate (sum by date, last label wins, malformed drop)
//     → buildCalendarCells (inclusive range + leading/trailing padding)
//     → level resolution (consumer getLevel callback OR deriveLevel)
//
// Timezone note: every date string is a local-calendar 'YYYY-MM-DD'. Parsing
// goes through utils/date-helpers.parseLocalDate (integer date parts, local
// midnight) — never `new Date('YYYY-MM-DD')`, which shifts a day in western
// longitudes.

import { addDays, formatDateForDisplay, parseLocalDate } from './date-helpers';

/** Activity intensity bucket. 0 = no activity, 4 = max. */
export type ActivityGridLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Raw consumer input. No per-record level field — level is derived from the
 * aggregated value (or supplied via a `getLevel` callback at the component
 * layer, which runs after aggregation).
 */
export interface ActivityGridDatum {
  /** Local calendar date, 'YYYY-MM-DD'. */
  date: string;
  /** Raw activity amount. Sanitized before use (NaN/negative/Infinity → 0). */
  value: number;
  /** Optional accessible/tooltip label. */
  label?: string;
}

/** Discriminated cell kind for the rendered array. */
export type ActivityGridCellKind = 'date' | 'leadingPad' | 'trailingPad';

/**
 * A single rendered cell. Date cells carry semantic activity; padding cells
 * are layout-only (no date, no value, no interaction, no a11y label).
 */
export interface ActivityGridCell {
  readonly kind: ActivityGridCellKind;
  /** Present only when kind === 'date'. */
  readonly date?: string;
  /** Sanitized value. Always 0 for padding cells. */
  readonly value: number;
  /** Resolved intensity bucket. Always 0 for padding cells. */
  readonly level: ActivityGridLevel;
  /** Optional accessible label (date cells only). */
  readonly label?: string;
}

/**
 * Sanitize a raw value per the documented normalization policy:
 * negative, NaN, and non-finite values resolve to 0. Non-negative finite
 * values pass through unchanged.
 */
export function sanitizeValue(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

/**
 * Aggregate duplicate dates by summing sanitized values. Malformed date
 * strings are silently dropped (documented normalization policy — logging
 * here would make this helper side-effectful and harder to test/reuse).
 *
 * On duplicate dates: value sums; the last-seen `label` wins.
 */
export function aggregateActivityByDate(
  data: readonly ActivityGridDatum[],
): Map<string, ActivityGridDatum> {
  const out = new Map<string, ActivityGridDatum>();
  for (const d of data) {
    if (!isValidDate(d.date)) continue;
    const sanitized = sanitizeValue(d.value);
    const existing = out.get(d.date);
    if (existing) {
      out.set(d.date, {
        date: d.date,
        value: existing.value + sanitized,
        label: d.label ?? existing.label,
      });
    } else {
      out.set(d.date, { date: d.date, value: sanitized, label: d.label });
    }
  }
  return out;
}

/**
 * Build the full rendered cell array for [startDate, endDate] inclusive.
 * Returns [] for an invalid range (start > end, malformed endpoints).
 *
 * Layout:
 *   [leadingPad × N] [date cells] [trailingPad × M]
 * where N aligns startDate to the column for `weekStartsOn` and M completes
 * the final row. Total length is always a multiple of 7.
 */
export function buildCalendarCells(
  startDate: string,
  endDate: string,
  aggregated: Map<string, ActivityGridDatum>,
  options: { weekStartsOn: 0 | 1 },
): ActivityGridCell[] {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return [];

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  if (end.getTime() < start.getTime()) return [];

  const cells: ActivityGridCell[] = [];

  // Leading pad: shift startDate's column to its weekday slot.
  // JS getDay(): 0=Sun..6=Sat. weekStartsOn=0 → Sunday-first; =1 → Monday-first.
  const startDow = start.getDay();
  const leadingPad = ((startDow - options.weekStartsOn) % 7 + 7) % 7;
  for (let i = 0; i < leadingPad; i++) {
    cells.push({ kind: 'leadingPad', value: 0, level: 0 });
  }

  // Date cells, inclusive.
  // Use Math.round (not floor) for the day count so DST transitions inside
  // the range don't shift the inclusive count by one. Same approach as
  // utils/date-helpers.getDaysBetween.
  const totalDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  for (let i = 0; i <= totalDays; i++) {
    const d = addDays(start, i);
    const dateStr = toISODate(d);
    const source = aggregated.get(dateStr);
    cells.push({
      kind: 'date',
      date: dateStr,
      value: source?.value ?? 0,
      level: 0, // resolved later by resolveLevels
      label: source?.label,
    });
  }

  // Trailing pad: complete the final row.
  const trailingPad = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < trailingPad; i++) {
    cells.push({ kind: 'trailingPad', value: 0, level: 0 });
  }

  return cells;
}

/**
 * Derive a level from a sanitized value and a max value. Thresholds:
 *   0 / .25 / .5 / .75 / 1.0 of maxValue.
 *
 * `maxValue` is floored to 1 internally — a zero/missing max yields level 0
 * for value 0 and level 4 for any positive value (since value/1 ≥ 1).
 */
export function deriveLevel(value: number, maxValue: number): ActivityGridLevel {
  const v = sanitizeValue(value);
  const max = Math.max(1, sanitizeValue(maxValue));
  if (v <= 0) return 0;
  const ratio = v / max;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

/**
 * Resolve levels on a built cell array. Date cells with explicit consumer
 * `getLevel` use the callback's return (clamped to [0,4]); other date cells
 * fall back to `deriveLevel(cell.value, maxValue)`. Padding cells stay at 0.
 *
 * Returns a new array; does not mutate input.
 */
export function resolveLevels(
  cells: readonly ActivityGridCell[],
  maxValue: number,
  getLevel?: (datum: Readonly<Pick<ActivityGridCell, 'date' | 'value' | 'label'>>) => ActivityGridLevel,
): ActivityGridCell[] {
  return cells.map((c) => {
    if (c.kind !== 'date') return c;
    let level: ActivityGridLevel;
    if (getLevel && c.date !== undefined) {
      level = clampLevel(
        getLevel({ date: c.date, value: c.value, label: c.label }),
      );
    } else {
      level = deriveLevel(c.value, maxValue);
    }
    return level === c.level ? c : { ...c, level };
  });
}

/** Clamp an arbitrary number into the valid ActivityGridLevel range. */
export function clampLevel(raw: number): ActivityGridLevel {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
  const n = Math.floor(raw);
  if (n <= 0) return 0;
  if (n >= 4) return 4;
  return n as ActivityGridLevel;
}

/** Resolve the effective max value for level derivation. Floors to 1. */
export function resolveMaxValue(
  aggregated: Map<string, ActivityGridDatum>,
  explicit?: number,
): number {
  if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }
  let max = 0;
  for (const d of aggregated.values()) {
    if (d.value > max) max = d.value;
  }
  return Math.max(1, max);
}

/**
 * Default accessible label for a date cell that has no explicit `label`.
 * Format: 'July 19, 2026: 2 activities'. Zero-value dates still announce.
 */
export function defaultCellLabel(date: string, value: number): string {
  const formatted = formatDateForDisplay(date) || date;
  return `${formatted}: ${value} ${value === 1 ? 'activity' : 'activities'}`;
}

// --- internal helpers (not exported) ---

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(dateStr: string): boolean {
  if (typeof dateStr !== 'string' || !ISO_DATE_RE.test(dateStr)) return false;
  const d = parseLocalDate(dateStr);
  return !isNaN(d.getTime());
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// hooks/useActivityGridLayout.ts
// Pure responsive-layout math + a thin React memo wrapper. Pure core is
// unit-testable without React; the hook just applies useMemo.
//
// Two modes:
//   'calendar'         — fixed column count (default 7; override via
//                        `columns`). Cells always fill the container width;
//                        there is no upper clamp. Compact mode below the
//                        feasible threshold reduces gap (down to minGap)
//                        then cell size (below cellMinSize if necessary).
//   'responsive-matrix' — dev-preview only. Considers candidate column
//                         counts of baseColumns*2^n that keep rows ≥ 2 and
//                         whose UNCLAMPED cell size lands in [min, max];
//                         picks the largest-cell candidate.
//
// Invariant across both modes and all widths:
//   totalWidth ≤ availableWidth
//   gap ≥ minGap ≥ 0
//   cells are square (single cellSize)
//   calendar: columns === input.columns (default 7)
//   matrix:   columns is a multiple of baseColumns

import { useMemo } from 'react';

export type ActivityGridLayoutMode = 'calendar' | 'responsive-matrix';

export interface ActivityGridLayout {
  readonly mode: ActivityGridLayoutMode;
  readonly columns: number;
  readonly rows: number;
  readonly cellSize: number;
  readonly gap: number;
  readonly totalWidth: number;
  /** True iff calendar mode departed from preferred geometry (gap < preferred OR cellSize < min). */
  readonly compact: boolean;
}

export interface ActivityGridLayoutInput {
  /** Measured container width, NOT viewport width. */
  readonly availableWidth: number;
  /** Total cells to lay out (date cells + leading/trailing padding). */
  readonly renderedCells: number;
  readonly mode?: ActivityGridLayoutMode;
  readonly cellMinSize?: number;
  /** Max cell size — only consulted in responsive-matrix mode. Calendar mode fills the container. */
  readonly cellMaxSize?: number;
  /** Preferred gap; default 4. */
  readonly gap?: number;
  /** Compact-mode floor for gap; default 0. */
  readonly minGap?: number;
  /** Matrix-mode base column count; default 7. */
  readonly baseColumns?: number;
  /** Calendar-mode column count; default 7. Ignored in responsive-matrix. */
  readonly columns?: number;
}

const DEFAULTS = {
  mode: 'calendar' as const,
  cellMinSize: 14,
  cellMaxSize: 28,
  gap: 4,
  minGap: 0,
  baseColumns: 7,
  columns: 7,
};

/**
 * Pure deterministic layout computation. Safe to call from tests.
 */
export function computeActivityGridLayout(
  input: ActivityGridLayoutInput,
): ActivityGridLayout {
  const mode = input.mode ?? DEFAULTS.mode;
  const cellMinSize = input.cellMinSize ?? DEFAULTS.cellMinSize;
  const cellMaxSize = input.cellMaxSize ?? DEFAULTS.cellMaxSize;
  const preferredGap = input.gap ?? DEFAULTS.gap;
  const minGap = input.minGap ?? DEFAULTS.minGap;
  const baseColumns = input.baseColumns ?? DEFAULTS.baseColumns;
  const columns = input.columns ?? DEFAULTS.columns;
  const W = Math.max(0, input.availableWidth);
  const N = Math.max(0, Math.floor(input.renderedCells));

  if (W <= 0 || N <= 0 || cellMaxSize <= 0 || cellMinSize <= 0 || preferredGap < 0 || minGap < 0 || minGap > preferredGap) {
    return {
      mode,
      columns: mode === 'calendar' ? columns : baseColumns,
      rows: 0,
      cellSize: 0,
      gap: preferredGap,
      totalWidth: 0,
      compact: false,
    };
  }

  if (mode === 'calendar') {
    return computeCalendar(W, N, columns, cellMinSize, preferredGap, minGap);
  }
  return computeMatrixMode(W, N, cellMinSize, cellMaxSize, preferredGap, baseColumns);
}

/**
 * Memoized hook for use inside ActivityGrid. Pure core is `computeActivityGridLayout`.
 */
export function useActivityGridLayout(input: ActivityGridLayoutInput): ActivityGridLayout {
  const {
    availableWidth,
    renderedCells,
    mode,
    cellMinSize,
    cellMaxSize,
    gap,
    minGap,
    baseColumns,
    columns,
  } = input;
  return useMemo(
    () =>
      computeActivityGridLayout({
        availableWidth,
        renderedCells,
        mode,
        cellMinSize,
        cellMaxSize,
        gap,
        minGap,
        baseColumns,
        columns,
      }),
    [
      availableWidth,
      renderedCells,
      mode,
      cellMinSize,
      cellMaxSize,
      gap,
      minGap,
      baseColumns,
      columns,
    ],
  );
}

// --- internal ---

function computeCalendar(
  W: number,
  N: number,
  columns: number,
  cellMinSize: number,
  preferredGap: number,
  minGap: number,
): ActivityGridLayout {
  const rows = Math.ceil(N / columns) || 0;

  // Preferred candidate at preferred gap. Cells always fill the container —
  // no upper clamp. cellMaxSize is intentionally ignored in calendar mode;
  // it remains in the input type for responsive-matrix use.
  const preferred = Math.floor((W - (columns - 1) * preferredGap) / columns);

  if (preferred >= cellMinSize) {
    return {
      mode: 'calendar',
      columns,
      rows,
      cellSize: preferred,
      gap: preferredGap,
      totalWidth: columns * preferred + (columns - 1) * preferredGap,
      compact: false,
    };
  }

  // Below min — compact mode. Reduce gap first, down to minGap.
  // Solve for the largest gap in [minGap, preferredGap] that keeps cell ≥ cellMinSize:
  //   cellMinSize ≤ (W - (columns-1)*gap) / columns
  //   gap ≤ (W - columns*cellMinSize) / (columns-1)
  const gapBudgetForCellMin = Math.floor((W - columns * cellMinSize) / (columns - 1));
  const reducedGap = Math.max(minGap, Math.min(preferredGap, gapBudgetForCellMin));

  if (reducedGap >= minGap && gapBudgetForCellMin >= minGap) {
    // Reduced gap rescued cell to cellMinSize.
    return {
      mode: 'calendar',
      columns,
      rows,
      cellSize: cellMinSize,
      gap: reducedGap,
      totalWidth: columns * cellMinSize + (columns - 1) * reducedGap,
      compact: reducedGap < preferredGap,
    };
  }

  // Even at gap=minGap cellSize falls below cellMinSize. Compute the floor.
  const compactCell = Math.max(1, Math.floor((W - (columns - 1) * minGap) / columns));
  return {
    mode: 'calendar',
    columns,
    rows,
    cellSize: compactCell,
    gap: minGap,
    totalWidth: columns * compactCell + (columns - 1) * minGap,
    compact: true,
  };
}

function computeMatrixMode(
  W: number,
  N: number,
  cellMinSize: number,
  cellMaxSize: number,
  gap: number,
  baseColumns: number,
): ActivityGridLayout {
  type Candidate = { cols: number; cellSize: number; rows: number };
  const candidates: Candidate[] = [];

  let n = 0;
  // Cap exponent to avoid pathological loops; 2^10 = 1024 cols is well past
  // any realistic render.
  while (n <= 10) {
    const cols = baseColumns * 2 ** n;
    if (cols < 1) break;
    const rowsIfChosen = Math.ceil(N / cols);
    if (rowsIfChosen < 2) break;

    const unclamped = Math.floor((W - (cols - 1) * gap) / cols);
    if (unclamped < cellMinSize) break;

    if (unclamped <= cellMaxSize) {
      candidates.push({ cols, cellSize: unclamped, rows: rowsIfChosen });
    }
    n += 1;
  }

  if (candidates.length > 0) {
    // Largest cellSize wins; tie-break larger cols.
    let best = candidates[0];
    for (const c of candidates) {
      if (c.cellSize > best.cellSize || (c.cellSize === best.cellSize && c.cols > best.cols)) {
        best = c;
      }
    }
    return {
      mode: 'responsive-matrix',
      columns: best.cols,
      rows: best.rows,
      cellSize: best.cellSize,
      gap,
      totalWidth: best.cols * best.cellSize + (best.cols - 1) * gap,
      compact: false,
    };
  }

  // No candidate landed inside [min, max] — fall back to base, clamped.
  const cols = baseColumns;
  const rows = Math.ceil(N / cols) || 0;
  const raw = Math.floor((W - (cols - 1) * gap) / cols);
  const cellSize = Math.max(cellMinSize, Math.min(cellMaxSize, raw));
  return {
    mode: 'responsive-matrix',
    columns: cols,
    rows,
    cellSize,
    gap,
    totalWidth: cols * cellSize + (cols - 1) * gap,
    compact: false,
  };
}

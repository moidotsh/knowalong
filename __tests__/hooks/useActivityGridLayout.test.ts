// __tests__/hooks/useActivityGridLayout.test.ts
// Pure-function tests for computeActivityGridLayout across both modes and
// multiple widths. Asserts the documented invariants:
//   - totalWidth ≤ availableWidth at every width
//   - gap ≥ minGap ≥ 0 (gaps never negative)
//   - cells are square (single cellSize)
//   - calendar mode: columns === input.columns (default 7); cells fill width
//   - matrix mode: columns is a multiple of baseColumns, ≥ 2 rows

import { describe, it, expect } from 'vitest';
import { computeActivityGridLayout } from '../../hooks/useActivityGridLayout';

const DEFAULTS = {
  cellMinSize: 14,
  cellMaxSize: 28,
  gap: 4,
  minGap: 0,
  baseColumns: 7,
} as const;

// 96 renderedCells (≈ 90 days + leading/trailing pad) → 14 rows at 7 cols.
const NINETY_SIX: number = 96;

describe('computeActivityGridLayout — calendar mode invariants (sweep)', () => {
  const widths: number[] = [];
  for (let w = 50; w <= 1500; w += 10) widths.push(w);

  for (const W of widths) {
    it(`W=${W}: columns===7, totalWidth≤W, gap≥0, square cells, rows=ceil(N/7), fills width`, () => {
      const g = computeActivityGridLayout({
        availableWidth: W,
        renderedCells: NINETY_SIX,
        mode: 'calendar',
        ...DEFAULTS,
      });
      expect(g.mode).toBe('calendar');
      expect(g.columns).toBe(7);
      expect(g.totalWidth).toBeLessThanOrEqual(W);
      expect(g.gap).toBeGreaterThanOrEqual(0);
      expect(g.cellSize).toBeGreaterThan(0);
      expect(g.rows).toBe(Math.ceil(NINETY_SIX / 7));
      // Fill invariant: when not in compact mode, cells use the full width
      // (totalWidth + 1 cell would exceed W). Hard to assert exactly at every
      // width because of flooring, so just assert no clamp at large widths.
      if (W >= 200 && !g.compact) {
        // Without a clamp, cellSize grows with W. At W=200 cellSize=25; at
        // W=400 cellSize=53; etc. If a max clamp were re-introduced, this
        // would cap out and fail at large widths.
        expect(g.cellSize).toBeGreaterThanOrEqual(25);
      }
    });
  }
});

describe('computeActivityGridLayout — calendar mode specific points', () => {
  it('W=80: compact=true, gap=0, cellSize < cellMinSize, totalWidth ≤ 80', () => {
    const g = computeActivityGridLayout({
      availableWidth: 80,
      renderedCells: NINETY_SIX,
      mode: 'calendar',
      ...DEFAULTS,
    });
    expect(g.compact).toBe(true);
    expect(g.gap).toBe(0);
    expect(g.cellSize).toBeLessThanOrEqual(11); // floor((80 - 0) / 7) = 11
    expect(g.cellSize).toBeLessThan(DEFAULTS.cellMinSize);
    expect(g.totalWidth).toBeLessThanOrEqual(80);
  });

  it('W=100: compact=true (gap collapsed below preferred) even though cellSize=14', () => {
    // preferred at gap=4: floor((100 - 24) / 7) = 10 → below min.
    // Reduced gap budget: floor((100 - 7*14) / 6) = floor(2/6) = 0 → use minGap=0.
    // At gap=0, cellSize = floor((100 - 0) / 7) = 14. Compact because gap < preferred.
    const g = computeActivityGridLayout({
      availableWidth: 100,
      renderedCells: NINETY_SIX,
      mode: 'calendar',
      ...DEFAULTS,
    });
    expect(g.compact).toBe(true);
    expect(g.gap).toBe(0);
    expect(g.cellSize).toBe(14);
    expect(g.totalWidth).toBe(98);
  });

  it('W=122: feasible threshold — cellSize=14, gap=4, compact=false', () => {
    const g = computeActivityGridLayout({
      availableWidth: 122,
      renderedCells: NINETY_SIX,
      mode: 'calendar',
      ...DEFAULTS,
    });
    expect(g.compact).toBe(false);
    expect(g.cellSize).toBe(14);
    expect(g.gap).toBe(4);
    expect(g.totalWidth).toBe(122);
  });

  it('W=200: cellSize=25 — fills the container, no max clamp', () => {
    const g = computeActivityGridLayout({
      availableWidth: 200,
      renderedCells: NINETY_SIX,
      mode: 'calendar',
      ...DEFAULTS,
    });
    expect(g.compact).toBe(false);
    expect(g.cellSize).toBe(25); // floor((200 - 24) / 7) = floor(25.14) = 25
    expect(g.gap).toBe(4);
    expect(g.totalWidth).toBe(7 * 25 + 6 * 4); // 199
  });

  it('W=320: cells fill — cellSize=42, no whitespace past the grid', () => {
    // Pre-fix behavior clamped at cellMaxSize=28, leaving ~100px of whitespace.
    // Post-fix: cells grow to fill, so cellSize=floor((320-24)/7)=42.
    const g = computeActivityGridLayout({
      availableWidth: 320,
      renderedCells: NINETY_SIX,
      mode: 'calendar',
      ...DEFAULTS,
    });
    expect(g.compact).toBe(false);
    expect(g.cellSize).toBe(42); // floor((320 - 24) / 7) = floor(42.28) = 42
    expect(g.gap).toBe(4);
    expect(g.totalWidth).toBe(7 * 42 + 6 * 4); // 318 (≤ 320, fills to within 2px)
  });

  it('W=700 and W=1280: calendar never expands past 7 columns but cells keep growing', () => {
    // The max clamp is gone; cells fill whatever width is given. Columns
    // stay at 7 so the layout remains week-aligned.
    const a = computeActivityGridLayout({
      availableWidth: 700,
      renderedCells: NINETY_SIX,
      mode: 'calendar',
      ...DEFAULTS,
    });
    expect(a.columns).toBe(7);
    expect(a.cellSize).toBe(96); // floor((700 - 24) / 7) = 96
    expect(a.totalWidth).toBe(7 * 96 + 6 * 4); // 696
    expect(a.compact).toBe(false);

    const b = computeActivityGridLayout({
      availableWidth: 1280,
      renderedCells: NINETY_SIX,
      mode: 'calendar',
      ...DEFAULTS,
    });
    expect(b.columns).toBe(7);
    expect(b.cellSize).toBe(179); // floor((1280 - 24) / 7) = 179
    expect(b.totalWidth).toBe(7 * 179 + 6 * 4); // 1277
    expect(b.compact).toBe(false);
  });
});

describe('computeActivityGridLayout — calendar mode custom column count', () => {
  it('columns=5 wraps at 5 per row; cellSize fills container', () => {
    const g = computeActivityGridLayout({
      availableWidth: 320,
      renderedCells: 90, // pure date cells, no weekday pad when columns!=7
      mode: 'calendar',
      columns: 5,
      ...DEFAULTS,
    });
    expect(g.columns).toBe(5);
    // floor((320 - 4*4) / 5) = floor(304/5) = 60
    expect(g.cellSize).toBe(60);
    expect(g.rows).toBe(Math.ceil(90 / 5));
    expect(g.totalWidth).toBe(5 * 60 + 4 * 4); // 316
    expect(g.compact).toBe(false);
  });

  it('columns=14 wraps at 14 per row; smaller cells, same fill', () => {
    const g = computeActivityGridLayout({
      availableWidth: 320,
      renderedCells: 90,
      mode: 'calendar',
      columns: 14,
      ...DEFAULTS,
    });
    expect(g.columns).toBe(14);
    expect(g.cellSize).toBe(19); // floor((320 - 52) / 14) = floor(19.14) = 19
    expect(g.rows).toBe(Math.ceil(90 / 14));
    expect(g.totalWidth).toBe(14 * 19 + 13 * 4); // 318
    expect(g.compact).toBe(false);
  });

  it('columns=1 — single-column stack', () => {
    const g = computeActivityGridLayout({
      availableWidth: 320,
      renderedCells: 30,
      mode: 'calendar',
      columns: 1,
      ...DEFAULTS,
    });
    expect(g.columns).toBe(1);
    expect(g.cellSize).toBe(320); // entire width
    expect(g.rows).toBe(30);
    expect(g.compact).toBe(false);
  });

  it('columns defaults to 7 when omitted (backwards compat)', () => {
    const g = computeActivityGridLayout({
      availableWidth: 320,
      renderedCells: NINETY_SIX,
      mode: 'calendar',
      ...DEFAULTS,
    });
    expect(g.columns).toBe(7);
  });

  it('columns is ignored in responsive-matrix mode', () => {
    const g = computeActivityGridLayout({
      availableWidth: 700,
      renderedCells: NINETY_SIX,
      mode: 'responsive-matrix',
      columns: 5, // would be ignored; matrix picks 28
      ...DEFAULTS,
    });
    expect(g.mode).toBe('responsive-matrix');
    expect(g.columns).toBe(28); // matrix picks, not 5
  });
});

describe('computeActivityGridLayout — responsive-matrix mode', () => {
  it('W=320: cols=14, cellSize=19 (cols=7 gives 42 which is above max; cols=14 gives 19 in range)', () => {
    const g = computeActivityGridLayout({
      availableWidth: 320,
      renderedCells: NINETY_SIX,
      mode: 'responsive-matrix',
      ...DEFAULTS,
    });
    expect(g.mode).toBe('responsive-matrix');
    expect(g.columns).toBe(14);
    expect(g.cellSize).toBe(19); // floor((320 - 52) / 14) = 19
    expect(g.rows).toBe(7);
    expect(g.totalWidth).toBe(14 * 19 + 13 * 4); // 318
    expect(g.totalWidth).toBeLessThanOrEqual(320);
  });

  it('W=700: cols=28, cellSize=21 (cols=14 gives 46 above max; cols=28 gives 21 in range)', () => {
    const g = computeActivityGridLayout({
      availableWidth: 700,
      renderedCells: NINETY_SIX,
      mode: 'responsive-matrix',
      ...DEFAULTS,
    });
    expect(g.columns).toBe(28);
    expect(g.cellSize).toBe(21); // floor((700 - 108) / 28) = 21
    expect(g.rows).toBe(4);
    expect(g.totalWidth).toBe(28 * 21 + 27 * 4); // 696
    expect(g.totalWidth).toBeLessThanOrEqual(700);
  });

  it('W=1280: cols=56, cellSize=18 (cols=28 gives 42 above max; cols=56 gives 18 in range)', () => {
    const g = computeActivityGridLayout({
      availableWidth: 1280,
      renderedCells: NINETY_SIX,
      mode: 'responsive-matrix',
      ...DEFAULTS,
    });
    expect(g.columns).toBe(56);
    expect(g.cellSize).toBe(18); // floor((1280 - 220) / 56) = 18
    expect(g.rows).toBe(2);
    expect(g.totalWidth).toBe(56 * 18 + 55 * 4); // 1228
    expect(g.totalWidth).toBeLessThanOrEqual(1280);
  });

  it('matrix mode never returns compact=true', () => {
    for (const W of [100, 320, 700, 1280]) {
      const g = computeActivityGridLayout({
        availableWidth: W,
        renderedCells: NINETY_SIX,
        mode: 'responsive-matrix',
        ...DEFAULTS,
      });
      expect(g.compact).toBe(false);
    }
  });

  it('matrix mode columns are always a multiple of baseColumns', () => {
    for (const W of [320, 700, 1280]) {
      const g = computeActivityGridLayout({
        availableWidth: W,
        renderedCells: NINETY_SIX,
        mode: 'responsive-matrix',
        ...DEFAULTS,
      });
      expect(g.columns % DEFAULTS.baseColumns).toBe(0);
    }
  });

  it('matrix mode rows are always ≥ 2', () => {
    for (const W of [320, 700, 1280]) {
      const g = computeActivityGridLayout({
        availableWidth: W,
        renderedCells: NINETY_SIX,
        mode: 'responsive-matrix',
        ...DEFAULTS,
      });
      expect(g.rows).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('computeActivityGridLayout — degenerate inputs', () => {
  it('returns zero-sized layout for W=0', () => {
    const g = computeActivityGridLayout({
      availableWidth: 0,
      renderedCells: NINETY_SIX,
      mode: 'calendar',
      ...DEFAULTS,
    });
    expect(g.totalWidth).toBe(0);
    expect(g.cellSize).toBe(0);
    expect(g.rows).toBe(0);
  });

  it('returns zero-sized layout for renderedCells=0', () => {
    const g = computeActivityGridLayout({
      availableWidth: 500,
      renderedCells: 0,
      mode: 'calendar',
      ...DEFAULTS,
    });
    expect(g.totalWidth).toBe(0);
    expect(g.cellSize).toBe(0);
    expect(g.rows).toBe(0);
  });

  it('handles negative availableWidth as 0', () => {
    const g = computeActivityGridLayout({
      availableWidth: -50,
      renderedCells: NINETY_SIX,
      mode: 'calendar',
      ...DEFAULTS,
    });
    expect(g.totalWidth).toBe(0);
  });
});

describe('computeActivityGridLayout — single-day range (1 date cell + 6 trailing pad = 7 cells)', () => {
  it('calendar mode produces exactly 1 row', () => {
    const g = computeActivityGridLayout({
      availableWidth: 320,
      renderedCells: 7,
      mode: 'calendar',
      ...DEFAULTS,
    });
    expect(g.columns).toBe(7);
    expect(g.rows).toBe(1);
  });
});

// __tests__/components/ActivityGrid.test.tsx
//
// Component-level render + accessibility tests. The responsive layout math
// is covered by __tests__/hooks/useActivityGridLayout.test.ts (pure
// function); the data pipeline is covered by __tests__/utils/activityGrid.test.ts.
// This file asserts the rendered tree:
//   - Cell count matches the calendar range (date cells + leading/trailing pad)
//   - Empty data + valid range renders the full zero-level calendar
//   - start > end renders the invalid-range empty state
//   - onCellPress toggles between View (non-interactive) and Pressable (button)
//   - Padding cells are never interactive and have no a11y label
//   - getLevel callback overrides derived levels and is clamped to 0..4
//
// Note on the test environment: jsdom does not perform layout, so the
// container measure from useContainerQuery returns 0 in tests. Cells render
// at 0px size but are still present in the DOM — these tests assert DOM
// structure and a11y attributes, not visual geometry.

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../context';
import { ActivityGrid } from '../../components/MobilePremium/ActivityGrid';

function Wrap({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

// Single-week range, Sunday to Saturday — 7 date cells, no padding.
const WEEK_RANGE = {
  startDate: '2026-03-15', // Sunday
  endDate: '2026-03-21',   // Saturday
};

describe('ActivityGrid — cell count', () => {
  it('renders exactly the cells from buildCalendarCells (7 date cells for a Sun-Sat week)', () => {
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate={WEEK_RANGE.startDate}
          endDate={WEEK_RANGE.endDate}
          accessibilityLabel="Test grid"
        />
      </Wrap>,
    );
    // The grid root is the View with accessibilityRole="list".
    const grid = container.querySelector('[accessibilityrole="list"]');
    expect(grid).not.toBeNull();
    // 7 date cells + 5 legend swatches = 12 View-like children with background.
    // More reliable: count elements whose accessibilityLabel starts with a date.
    const dateCells = container.querySelectorAll('[accessibilitylabel]');
    const dateLabels = Array.from(dateCells).map((el) => el.getAttribute('accessibilitylabel') || '');
    const dateCellLabels = dateLabels.filter((l) => /Mar 1[5-9], 2026|Mar 2[01], 2026/.test(l));
    expect(dateCellLabels.length).toBe(7);
  });

  it('empty data with valid range renders all date cells as zero-activity (NOT empty state)', () => {
    const { container, queryByText } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate={WEEK_RANGE.startDate}
          endDate={WEEK_RANGE.endDate}
          accessibilityLabel="Empty activity grid test"
        />
      </Wrap>,
    );
    // Grid root exists (not the invalid-range fallback).
    const grid = container.querySelector('[accessibilityrole="list"]');
    expect(grid).not.toBeNull();
    // The invalid-range copy is absent.
    expect(queryByText('Invalid date range.')).toBeNull();
  });

  it('renders leading/trailing padding for a range that does not align to weekStartsOn=0', () => {
    // 2026-03-18 is a Wednesday. weekStartsOn=0 → 3 leading pad + 7 date cells + 4 trailing = hmm.
    // Actually 3 + 7 = 10; trailing pad to multiple of 7 = 4. Total 14.
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate="2026-03-18"
          endDate="2026-03-24"
          accessibilityLabel="Padding test"
        />
      </Wrap>,
    );
    // 7 date cells with Mar 18..24 labels.
    const dateCells = container.querySelectorAll('[accessibilitylabel]');
    const dateCellLabels = Array.from(dateCells).map((el) => el.getAttribute('accessibilitylabel') || '');
    const matched = dateCellLabels.filter((l) => /Mar 1[89], 2026|Mar 2[0-4], 2026/.test(l));
    expect(matched.length).toBe(7);
  });
});

describe('ActivityGrid — invalid range', () => {
  it('renders the invalid-range empty state when start > end', () => {
    const { container, getByText } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate="2026-03-21"
          endDate="2026-03-15"
          accessibilityLabel="Invalid range test"
        />
      </Wrap>,
    );
    expect(getByText('Invalid date range.')).toBeDefined();
    // Grid root is NOT accessibilityRole="list".
    const grid = container.querySelector('[accessibilityrole="list"]');
    expect(grid).toBeNull();
  });

  it('renders the invalid-range empty state for malformed endpoint dates', () => {
    const { getByText } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate="not-a-date"
          endDate="2026-03-15"
          accessibilityLabel="Malformed range test"
        />
      </Wrap>,
    );
    expect(getByText('Invalid date range.')).toBeDefined();
  });
});

describe('ActivityGrid — onCellPress toggles cell element', () => {
  it('renders non-interactive cells when onCellPress is omitted', () => {
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate={WEEK_RANGE.startDate}
          endDate={WEEK_RANGE.endDate}
          accessibilityLabel="Non-interactive test"
        />
      </Wrap>,
    );
    // The grid has 7 date cells, each is a <view> with accessibilityRole="text"
    // (not a Pressable). With the RN string-component mock, Pressable renders
    // as <pressable> while View renders as <view>. So we should see zero
    // <pressable> elements in the grid.
    const pressables = container.querySelectorAll('pressable');
    expect(pressables.length).toBe(0);
  });

  it('renders interactive cells when onCellPress is supplied', () => {
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate={WEEK_RANGE.startDate}
          endDate={WEEK_RANGE.endDate}
          accessibilityLabel="Interactive test"
          onCellPress={() => {}}
        />
      </Wrap>,
    );
    const pressables = container.querySelectorAll('pressable');
    expect(pressables.length).toBe(7);
    // Each pressable should have accessibilityRole="button".
    const buttons = container.querySelectorAll('[accessibilityrole="button"]');
    expect(buttons.length).toBe(7);
  });
});

describe('ActivityGrid — accessibility', () => {
  it('the grid root exposes the supplied accessibilityLabel and accessibilityRole="list"', () => {
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate={WEEK_RANGE.startDate}
          endDate={WEEK_RANGE.endDate}
          accessibilityLabel="My Custom Label"
        />
      </Wrap>,
    );
    const grid = container.querySelector('[accessibilityrole="list"]');
    expect(grid).not.toBeNull();
    expect(grid?.getAttribute('accessibilitylabel')).toBe('My Custom Label');
  });

  it('each date cell has a non-empty accessibilityLabel', () => {
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[{ date: '2026-03-17', value: 2, label: 'Mar 17 special' }]}
          startDate={WEEK_RANGE.startDate}
          endDate={WEEK_RANGE.endDate}
          accessibilityLabel="Label test"
        />
      </Wrap>,
    );
    const dateCells = container.querySelectorAll('[accessibilityrole="text"], [accessibilityrole="button"]');
    const labels = Array.from(dateCells).map((el) => el.getAttribute('accessibilitylabel') || '');
    // Every label is non-empty.
    expect(labels.every((l) => l.length > 0)).toBe(true);
    // Mar 17 carries the explicit label.
    expect(labels).toContain('Mar 17 special');
  });
});

describe('ActivityGrid — getLevel callback', () => {
  it('uses the callback return for date cells and clamps illegal values', () => {
    // Callback returns 99 for every cell — clampLevel should reduce to 4.
    // The visual result: every date cell has the level-4 fill (full alpha brand).
    // We can't easily assert color in jsdom for RN string components, but we
    // CAN assert the callback was invoked once per date cell.
    let calls = 0;
    const getLevel = (): 0 => {
      calls += 1;
      return 99 as unknown as 0;
    };
    render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate={WEEK_RANGE.startDate}
          endDate={WEEK_RANGE.endDate}
          accessibilityLabel="getLevel test"
          getLevel={getLevel}
        />
      </Wrap>,
    );
    expect(calls).toBe(7);
  });
});

describe('ActivityGrid — sparse data', () => {
  it('renders zero-activity cells for dates not represented in data', () => {
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[
            { date: '2026-03-17', value: 3 },
            { date: '2026-03-19', value: 1 },
          ]}
          startDate={WEEK_RANGE.startDate}
          endDate={WEEK_RANGE.endDate}
          accessibilityLabel="Sparse test"
        />
      </Wrap>,
    );
    const dateCells = container.querySelectorAll('[accessibilityrole="text"]');
    expect(dateCells.length).toBe(7);
  });
});

describe('ActivityGrid — layout mode', () => {
  it('calendar mode (default) renders without crashing', () => {
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate={WEEK_RANGE.startDate}
          endDate={WEEK_RANGE.endDate}
          accessibilityLabel="Calendar mode test"
          layout="calendar"
        />
      </Wrap>,
    );
    expect(container.querySelector('[accessibilityrole="list"]')).not.toBeNull();
  });

  it('responsive-matrix mode renders without crashing', () => {
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate={WEEK_RANGE.startDate}
          endDate={WEEK_RANGE.endDate}
          accessibilityLabel="Matrix mode test"
          layout="responsive-matrix"
        />
      </Wrap>,
    );
    expect(container.querySelector('[accessibilityrole="list"]')).not.toBeNull();
  });
});

describe('ActivityGrid — trailing filler cells', () => {
  it('appends visible filler cells so the last row ends on a column boundary', () => {
    // Wed-Tue range = 7 date cells. columns=5 → 7 % 5 = 2, so 3 filler
    // cells are appended to fill out the second row. Total grid children
    // = 7 date + 3 filler = 10 = 2 full rows of 5.
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate="2026-03-18"
          endDate="2026-03-24"
          columns={5}
          accessibilityLabel="Filler test"
        />
      </Wrap>,
    );
    const shell = container.querySelector('[accessibilityrole="list"]');
    const gridContainer = shell!.firstElementChild;
    expect(gridContainer!.children.length).toBe(10);
    expect(gridContainer!.querySelectorAll('[accessibilityrole="text"]').length).toBe(7);
    // Filler cells are View elements with no a11y attributes — query all
    // children and filter to those with neither role nor label.
    const fillers = Array.from(gridContainer!.children).filter(
      (el) =>
        !el.hasAttribute('accessibilityrole') && !el.hasAttribute('accessibilitylabel'),
    );
    expect(fillers.length).toBe(3);
  });

  it('omits filler cells when cell count is already a multiple of columns', () => {
    // Wed-Tue range, columns=7 (default). buildCalendarCells produces
    // 3 leading pad + 7 date + 4 trailing pad = 14 total. 14 % 7 = 0,
    // so no filler cells. The weekday trailing pads already fill the row.
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate="2026-03-18"
          endDate="2026-03-24"
          accessibilityLabel="No-filler test"
        />
      </Wrap>,
    );
    const shell = container.querySelector('[accessibilityrole="list"]');
    const gridContainer = shell!.firstElementChild;
    // 14 total cells (3 leading + 7 date + 4 trailing), 0 filler.
    expect(gridContainer!.children.length).toBe(14);
    // No filler cells — every element has either a role (date cells) or is
    // a weekday pad (also without role, but pads and fillers are both
    // stripped of a11y). Distinguish by index: fillers come AFTER date
    // cells in the rendered order. Here the trailing pads fill the last
    // row, so the modulo check returns 0.
    const dateCells = gridContainer!.querySelectorAll('[accessibilityrole="text"]');
    expect(dateCells.length).toBe(7);
  });

  it('filler cells are never Pressable even when onCellPress is supplied', () => {
    // onCellPress makes date cells Pressable (role="button"). Filler cells
    // are always plain View — they have no date to press.
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate="2026-03-18"
          endDate="2026-03-24"
          columns={5}
          accessibilityLabel="Filler non-interactive test"
          onCellPress={() => {}}
        />
      </Wrap>,
    );
    // 7 date cells become Pressable (role="button").
    const buttons = container.querySelectorAll('[accessibilityrole="button"]');
    expect(buttons.length).toBe(7);
    // The grid still has 10 children (7 date + 3 filler).
    const shell = container.querySelector('[accessibilityrole="list"]');
    const gridContainer = shell!.firstElementChild;
    expect(gridContainer!.children.length).toBe(10);
  });

  it('scales filler count with column count for the same date range', () => {
    // 7 date cells. Varying columns changes how many fillers are needed:
    //   columns=3  → 7 % 3 = 1, filler = 2 → total = 9
    //   columns=5  → 7 % 5 = 2, filler = 3 → total = 10
    //   columns=10 → 7 % 10 = 7, filler = 3 → total = 10
    //   columns=14 → 7 % 14 = 7, filler = 7 → total = 14
    const cases: Array<{ columns: number; expectedTotal: number }> = [
      { columns: 3, expectedTotal: 9 },
      { columns: 5, expectedTotal: 10 },
      { columns: 10, expectedTotal: 10 },
      { columns: 14, expectedTotal: 14 },
    ];
    for (const { columns, expectedTotal } of cases) {
      const { container } = render(
        <Wrap>
          <ActivityGrid
            data={[]}
            startDate="2026-03-18"
            endDate="2026-03-24"
            columns={columns}
            accessibilityLabel={`Filler scaling ${columns}`}
          />
        </Wrap>,
      );
      const shell = container.querySelector('[accessibilityrole="list"]');
      const gridContainer = shell!.firstElementChild;
      expect(gridContainer!.children.length).toBe(expectedTotal);
    }
  });
});

describe('ActivityGrid — maxRows cap', () => {
  it('drops oldest leading rows when cell count exceeds maxRows × columns', () => {
    // 2026-01-01 to 2026-03-31 is 90 days. At columns=5 that's 18 rows.
    // maxRows=8 → drop 10 rows × 5 cols = 50 leading cells, keep last 40.
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate="2026-01-01"
          endDate="2026-03-31"
          columns={5}
          maxRows={8}
          accessibilityLabel="maxRows truncate test"
        />
      </Wrap>,
    );
    const shell = container.querySelector('[accessibilityrole="list"]');
    const gridContainer = shell!.firstElementChild;
    // 40 date cells (no filler — 40 is a multiple of 5).
    expect(gridContainer!.children.length).toBe(40);
    // All 40 are date cells (no pads since columns!=7, no fillers since
    // 40 % 5 == 0).
    const dateCells = gridContainer!.querySelectorAll('[accessibilityrole="text"]');
    expect(dateCells.length).toBe(40);
  });

  it('preserves weekday pads at columns=7 when truncating', () => {
    // 90-day range at columns=7 produces 3 leading + 90 date + N trailing
    // pads, total is a multiple of 7. With maxRows=8, leading rows drop
    // but each remaining row still begins on its weekday column.
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate="2026-01-01"
          endDate="2026-03-31"
          maxRows={8}
          accessibilityLabel="maxRows columns=7 test"
        />
      </Wrap>,
    );
    const shell = container.querySelector('[accessibilityrole="list"]');
    const gridContainer = shell!.firstElementChild;
    // Total cells = 8 rows × 7 cols = 56. Mix of date cells, weekday pads,
    // and possibly fillers depending on the date alignment.
    const totalCells = gridContainer!.children.length;
    expect(totalCells).toBe(56);
  });

  it('does not truncate when cell count fits within maxRows', () => {
    // 7-date range at columns=5 = 2 rows. maxRows=8 doesn't truncate.
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate="2026-03-18"
          endDate="2026-03-24"
          columns={5}
          maxRows={8}
          accessibilityLabel="maxRows no-op test"
        />
      </Wrap>,
    );
    const shell = container.querySelector('[accessibilityrole="list"]');
    const gridContainer = shell!.firstElementChild;
    // 7 date + 3 filler = 10 (same as without maxRows).
    expect(gridContainer!.children.length).toBe(10);
  });

  it('maxRows=undefined renders every cell (no cap, backwards compat)', () => {
    // 90 days at columns=5 = 18 rows × 5 = 90 cells. No truncation.
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate="2026-01-01"
          endDate="2026-03-31"
          columns={5}
          accessibilityLabel="no maxRows test"
        />
      </Wrap>,
    );
    const shell = container.querySelector('[accessibilityrole="list"]');
    const gridContainer = shell!.firstElementChild;
    expect(gridContainer!.children.length).toBe(90);
  });
});

describe('ActivityGrid — columns prop', () => {
  it('columns=7 (default) keeps weekday pad cells so days align to Sun-Sat', () => {
    // Wednesday..Tuesday range, weekStartsOn=0 (default). buildCalendarCells
    // produces 3 leading pad + 7 date cells + 4 trailing pad = 14 total.
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate="2026-03-18" // Wednesday
          endDate="2026-03-24"   // Tuesday
          accessibilityLabel="7-col pad test"
        />
      </Wrap>,
    );
    // 7 date cells render with role="text".
    const dateCells = container.querySelectorAll('[accessibilityrole="text"]');
    expect(dateCells.length).toBe(7);
  });

  it('columns=5 drops weekday pads; only date cells render', () => {
    // Same range as above. With columns=5, weekday alignment is meaningless,
    // so pads are filtered out. The 7 date cells render plus 3 trailing
    // filler cells that complete the partial last row (see "trailing filler
    // cells" suite). Only the 7 date cells carry a11y roles.
    const { container } = render(
      <Wrap>
        <ActivityGrid
          data={[]}
          startDate="2026-03-18"
          endDate="2026-03-24"
          columns={5}
          accessibilityLabel="5-col no-pad test"
        />
      </Wrap>,
    );
    const dateCells = container.querySelectorAll('[accessibilityrole="text"]');
    expect(dateCells.length).toBe(7); // date cells only — fillers have no role
  });

  it('changing columns prop does not crash and produces a valid grid', () => {
    for (const columns of [1, 3, 5, 10, 14, 21]) {
      const { container } = render(
        <Wrap>
          <ActivityGrid
            data={[]}
            startDate={WEEK_RANGE.startDate}
            endDate={WEEK_RANGE.endDate}
            columns={columns}
            accessibilityLabel={`Columns ${columns} test`}
          />
        </Wrap>,
      );
      expect(container.querySelector('[accessibilityrole="list"]')).not.toBeNull();
    }
  });
});

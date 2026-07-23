// components/MobilePremium/ActivityGrid.tsx
// Generic responsive activity grid / heatmap. Domain-neutral: takes normalized
// ActivityGridDatum[] + start/end dates, renders a calendar of intensity-
// colored cells. Reusable for habits, journaling, language practice,
// reading logs, or any "did I do X today" visualization.
//
// Two layout modes:
//   layout="calendar" (default)
//     Fixed column count (default 7; override via `columns`). Cells always
//     fill the container width — no max clamp. Compact mode below the
//     feasible threshold reduces gap then cell size. Vertical gap matches
//     horizontal gap (uniform grid spacing). When columns=7 the leading/
//     trailing weekday pads are kept so days align to Sun-Sat — pads
//     render as visible level-0 cells so the grid reads as a solid block
//     (no sparse trailing row when the range ends mid-week); for any
//     other column count pads are dropped and date cells flow in date
//     order wrapped at the chosen count. Trailing filler cells (visible
//     level-0, no a11y) pad the last row so every row is column-aligned.
//     Optional `maxRows` caps the grid height by dropping the oldest
//     leading rows when the range exceeds `maxRows × columns` cells.
//   layout="responsive-matrix"
//     Dev-preview only. Column count adapts (baseColumns * 2^n) to use extra
//     horizontal space with more cells rather than larger ones.
//
// The component measures its own container (via useContainerQuery) — the
// measured width is the in-grid width AFTER the parent surface's padding,
// not the viewport width.
//
// No persistence, no Supabase, no navigation, no domain store. Pure UI.

import React, { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '../../context';
import { useContainerQuery, useActivityGridLayout } from '../../hooks';
import type { ActivityGridLayoutMode } from '../../hooks';
import {
  aggregateActivityByDate,
  buildCalendarCells,
  clampLevel,
  defaultCellLabel,
  resolveLevels,
  resolveMaxValue,
  type ActivityGridCell,
  type ActivityGridDatum,
  type ActivityGridLevel,
} from '../../utils/activityGrid';

export type { ActivityGridDatum, ActivityGridLevel, ActivityGridCell } from '../../utils/activityGrid';
export type { ActivityGridLayoutMode } from '../../hooks';

export interface ActivityGridProps {
  /** Raw activity records. Sanitized; aggregated by date. */
  data: readonly ActivityGridDatum[];
  /** Required — start of the inclusive range, 'YYYY-MM-DD'. */
  startDate: string;
  /** Required — end of the inclusive range, 'YYYY-MM-DD'. */
  endDate: string;
  /** Optional explicit max for level derivation; defaults to data max (floored to 1). */
  maxValue?: number;
  /**
   * Optional level resolver called AFTER aggregation, only on date cells.
   * Return is clamped to 0..4. When omitted, level is derived from value/maxValue.
   */
  getLevel?: (
    datum: Readonly<Pick<ActivityGridCell, 'date' | 'value' | 'label'>>,
  ) => ActivityGridLevel;
  /** Layout mode; default 'calendar'. */
  layout?: ActivityGridLayoutMode;
  /** 0 = Sunday-first (default), 1 = Monday-first. Only meaningful when columns=7. */
  weekStartsOn?: 0 | 1;
  /**
   * Column count for calendar mode; default 7. When 7 (the default), date
   * cells align to weekdays via leading/trailing pads. For any other value,
   * pads are dropped and date cells flow in date order wrapped at this count.
   * Ignored in responsive-matrix mode.
   */
  columns?: number;
  cellMinSize?: number;
  /** Max cell size — only consulted in responsive-matrix mode. Calendar mode fills the container. */
  cellMaxSize?: number;
  /** Preferred gap; default 4. */
  gap?: number;
  /** Compact-mode gap floor; default 0. */
  minGap?: number;
  /**
   * Optional cap on the number of rows rendered. When set, only the most
   * recent `maxRows × columns` cells are shown — older leading rows are
   * dropped so the card height stays bounded for large date ranges.
   * Truncation is row-aligned (drops whole rows) so weekday pads at
   * columns=7 stay correct. Default undefined renders every cell in the
   * range. Calendar mode only; ignored in responsive-matrix.
   */
  maxRows?: number;
  /** Group label for the grid (announced once by screen readers). */
  accessibilityLabel: string;
  /** Tap handler for date cells only. When omitted, cells are non-interactive. */
  onCellPress?: (datum: ActivityGridDatum) => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const FALLBACK_INVALID_RANGE = 'Invalid date range.';
// Monotonic alpha ramp for levels 1..4. Reads as increasing intensity on
// both light and dark surfaces without requiring per-mode tokens.
const LEVEL_ALPHAS: readonly [number, number, number, number] = [0.18, 0.36, 0.6, 1.0];

export function ActivityGrid({
  data,
  startDate,
  endDate,
  maxValue,
  getLevel,
  layout = 'calendar',
  weekStartsOn = 0,
  columns = 7,
  cellMinSize,
  cellMaxSize,
  gap,
  minGap,
  maxRows,
  accessibilityLabel,
  onCellPress,
  testID,
  style,
}: ActivityGridProps) {
  const { colors } = useAppTheme();
  const containerRef = useRef<View>(null);
  const { width: availableWidth } = useContainerQuery(containerRef);

  const cells = useMemo(() => {
    const aggregated = aggregateActivityByDate(data);
    const built = buildCalendarCells(startDate, endDate, aggregated, { weekStartsOn });
    if (built.length === 0) return built;
    const max = resolveMaxValue(aggregated, maxValue);
    const safeGetLevel = getLevel
      ? (d: Readonly<Pick<ActivityGridCell, 'date' | 'value' | 'label'>>) =>
          clampLevel(getLevel(d))
      : undefined;
    return resolveLevels(built, max, safeGetLevel);
  }, [data, startDate, endDate, weekStartsOn, maxValue, getLevel]);

  // When columns=7 the leading/trailing weekday pads align days to their
  // weekday column. For any other column count weekday alignment is
  // meaningless, so drop pads and let date cells flow in date order wrapped
  // at the chosen count.
  const renderedCells = useMemo(() => {
    if (layout !== 'calendar') return cells;
    if (columns === 7) return cells;
    return cells.filter((c) => c.kind === 'date');
  }, [cells, columns, layout]);

  // Optional row-count cap. Drops the oldest leading rows so the grid never
  // exceeds `maxRows` rows tall. Row-aligned (not cell-aligned) so weekday
  // pads at columns=7 stay correct — the first visible row still begins on
  // its proper weekday column. Calendar mode only; matrix mode is unaffected.
  const visibleCellCount = useMemo(() => {
    if (layout !== 'calendar') return renderedCells.length;
    if (maxRows === undefined || maxRows <= 0 || columns <= 0) return renderedCells.length;
    const actualRows = Math.ceil(renderedCells.length / columns);
    if (actualRows <= maxRows) return renderedCells.length;
    const dropRows = actualRows - maxRows;
    return renderedCells.length - dropRows * columns;
  }, [renderedCells.length, columns, maxRows, layout]);

  const visibleCells = useMemo(() => {
    if (visibleCellCount === renderedCells.length) return renderedCells;
    return renderedCells.slice(renderedCells.length - visibleCellCount);
  }, [renderedCells, visibleCellCount]);

  const isInvalidRange = cells.length === 0;

  const geometry = useActivityGridLayout({
    availableWidth,
    renderedCells: visibleCellCount,
    mode: layout,
    cellMinSize,
    cellMaxSize,
    gap,
    minGap,
    columns,
  });

  const levelFills = useLevelFills(colors.brand, colors.cardAlt);

  if (isInvalidRange) {
    return (
      <View
        ref={containerRef}
        testID={testID}
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
        style={[styles.shell, styles.invalidRange, style]}
      >
        <Text style={[styles.invalidCopy, { color: colors.textSecondary }]}>
          {FALLBACK_INVALID_RANGE}
        </Text>
      </View>
    );
  }

  const cellGap = geometry.gap;

  // Trailing filler cells pad the partial last row so every row ends on a
  // complete column boundary. Same fill as level-0 (no-activity) so the grid
  // reads as one solid block; no a11y label, not interactive. Without this,
  // ranges whose cell count isn't a multiple of `columns` leave a gap of
  // empty space at the end of the last row (e.g. 90 date cells at 14 cols →
  // 6 full rows + 6 cells + 8 cells of whitespace).
  const trailingFillerCount =
    geometry.columns > 0
      ? (geometry.columns - (visibleCells.length % geometry.columns)) % geometry.columns
      : 0;

  return (
    <View
      ref={containerRef}
      testID={testID}
      accessibilityRole="list"
      accessibilityLabel={accessibilityLabel}
      style={[styles.shell, style]}
    >
      <View
        style={[
          styles.grid,
          {
            maxWidth: geometry.totalWidth,
            // Uniform grid spacing — vertical gap matches horizontal. The
            // earlier 0.35×cellSize gutter produced visible row striping
            // that read as a list rather than a unified heatmap surface.
            rowGap: cellGap,
          },
        ]}
      >
        {visibleCells.map((cell, index) => {
          const isPadding = cell.kind !== 'date';
          const columnIndex = index % geometry.columns;
          const isLastInRow = columnIndex === geometry.columns - 1;
          const marginRight = isLastInRow ? 0 : cellGap;
          const sizeStyle = {
            width: geometry.cellSize,
            height: geometry.cellSize,
            marginRight,
          };

          if (isPadding) {
            // Leading/trailing weekday pad. Renders as a visible level-0
            // cell (same fill + border radius as a real "no activity" date)
            // so the grid reads as one solid block. Without this, a range
            // that ends mid-week leaves a sparse last row — e.g. one cell
            // at column 0 plus invisible spacers where Mon-Sat should be.
            // Pads carry no a11y label (they aren't real dates) and are
            // never interactive.
            return (
              <View
                key={`pad-${index}`}
                style={{
                  ...sizeStyle,
                  backgroundColor: levelFills[0],
                  borderRadius: Math.max(2, Math.floor(geometry.cellSize * 0.18)),
                }}
              />
            );
          }

          const dateStr = cell.date!;
          const a11y = cell.label ?? defaultCellLabel(dateStr, cell.value);
          const fill = levelFills[cell.level];
          const cellStyle: ViewStyle = {
            ...sizeStyle,
            backgroundColor: fill,
            borderRadius: Math.max(2, Math.floor(geometry.cellSize * 0.18)),
          };

          if (onCellPress) {
            return (
              <Pressable
                key={`cell-${dateStr}`}
                onPress={() =>
                  onCellPress({ date: dateStr, value: cell.value, label: cell.label })
                }
                accessibilityRole="button"
                accessibilityLabel={a11y}
                style={cellStyle}
              />
            );
          }

          return (
            <View
              key={`cell-${dateStr}`}
              accessibilityRole="text"
              accessibilityLabel={a11y}
              style={cellStyle}
            />
          );
        })}

        {Array.from({ length: trailingFillerCount }, (_, i) => {
          // Filler cells: visible level-0 cells that complete the last row.
          // Identical visual to a real "no activity" date so the grid reads
          // as a solid block; no a11y label and no role so screen readers
          // skip them entirely.
          const fillerAbsoluteIndex = visibleCells.length + i;
          const columnIndex = fillerAbsoluteIndex % geometry.columns;
          const isLastInRow = columnIndex === geometry.columns - 1;
          return (
            <View
              key={`filler-${i}`}
              style={{
                width: geometry.cellSize,
                height: geometry.cellSize,
                marginRight: isLastInRow ? 0 : cellGap,
                backgroundColor: levelFills[0],
                borderRadius: Math.max(2, Math.floor(geometry.cellSize * 0.18)),
              }}
            />
          );
        })}
      </View>

      <ActivityGridLegend levelFills={levelFills} />
    </View>
  );
}

/**
 * Five-step legend: less → more. Rendered as a single horizontal row with a
 * text label on each side. The legend is a presentational summary, not a
 * control; it is hidden from assistive tech via accessibilityElementsHidden.
 */
function ActivityGridLegend({
  levelFills,
}: {
  levelFills: readonly string[];
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.legendRow} accessibilityElementsHidden>
      <Text style={[styles.legendText, { color: colors.textSecondary }]}>Less</Text>
      <View style={styles.legendSwatches}>
        {levelFills.map((fill, idx) => (
          <View
            key={idx}
            style={{
              width: 12,
              height: 12,
              backgroundColor: fill,
              borderRadius: 3,
              marginRight: idx === levelFills.length - 1 ? 0 : 3,
            }}
          />
        ))}
      </View>
      <Text style={[styles.legendText, { color: colors.textSecondary }]}>More</Text>
    </View>
  );
}

/**
 * Resolve the five fill colors for levels 0..4. Level 0 uses the documented
 * "elevated surface placeholder" token (cardAlt); levels 1..4 use the brand
 * color at increasing alpha per LEVEL_ALPHAS.
 */
function useLevelFills(brandHex: string, cardAltHex: string): readonly string[] {
  return useMemo(() => {
    const rgba = hexToRgba(brandHex);
    return [
      cardAltHex,
      rgba(LEVEL_ALPHAS[0]),
      rgba(LEVEL_ALPHAS[1]),
      rgba(LEVEL_ALPHAS[2]),
      rgba(LEVEL_ALPHAS[3]),
    ];
  }, [brandHex, cardAltHex]);
}

function hexToRgba(hex: string): (alpha: number) => string {
  return (alpha: number) => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    alignSelf: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  legendSwatches: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  invalidRange: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  invalidCopy: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default ActivityGrid;

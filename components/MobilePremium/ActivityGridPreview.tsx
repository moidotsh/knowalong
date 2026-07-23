// components/MobilePremium/ActivityGridPreview.tsx
// Dev-only preview host for ActivityGrid. Demonstrates BOTH layout modes,
// the `columns` prop (with a live selector so visitors can watch cells
// dynamically resize to fill the container), and the four states a
// consumer needs to design for: populated, empty (valid range), invalid
// range, and the responsive-matrix auto-sizing.
//
// This is NOT a production component — it exists so consumers can see the
// primitive in the design-system showcase at /dev/premium. The sample data
// is deliberately synthetic; no domain data, no persistence, no navigation.

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../context';
import { addDays, parseLocalDate } from '../../utils/date-helpers';
import type { ActivityGridDatum } from '../../utils/activityGrid';
import { ActivityGrid } from './ActivityGrid';
import { MobileSurface } from './MobileSurface';

const TODAY_ANCHOR = '2026-03-15'; // fixed so sample data is deterministic across runs
const COLUMN_OPTIONS: readonly number[] = [5, 7, 10, 14, 21];

/**
 * Build ~90 days of synthetic activity ending at TODAY_ANCHOR. Distribution
 * is hand-tuned to show every intensity level + gaps:
 *   - ~20% zero days
 *   - ~30% low (1 unit)
 *   - ~20% medium (3 units)
 *   - ~15% high (6 units)
 *   - ~15% complete (10 units)
 */
function useSampleData(): readonly ActivityGridDatum[] {
  return useMemo(() => {
    const end = parseLocalDate(TODAY_ANCHOR);
    const start = addDays(end, -89);
    const out: ActivityGridDatum[] = [];
    for (let i = 0; i < 90; i++) {
      const d = addDays(start, i);
      const dateStr = toISODate(d);
      const seed = (i * 7) % 20;
      let value = 0;
      if (seed < 4) value = 0;
      else if (seed < 10) value = 1;
      else if (seed < 14) value = 3;
      else if (seed < 17) value = 6;
      else value = 10;
      if (value > 0) {
        out.push({ date: dateStr, value, label: `${dateStr}: ${value} sample units` });
      }
    }
    return out;
  }, []);
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Pill-style column-count selector. Selected pill takes the brand fill +
 * textOnBrand label; inactive pills are card-on-border. Same visual
 * language as the ThemeSelector above so the showcase reads as one kit.
 */
function ColumnSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      style={styles.chipRow}
      accessibilityRole="radiogroup"
      accessibilityLabel="Column count"
    >
      {COLUMN_OPTIONS.map((c) => {
        const active = c === value;
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.brand : colors.card,
                borderColor: active ? colors.brand : colors.border,
              },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={`${c} columns`}
          >
            <Text
              style={[
                styles.chipLabel,
                { color: active ? colors.textOnBrand : colors.textSecondary },
              ]}
            >
              {c}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ActivityGridPreview() {
  const { colors } = useAppTheme();
  const data = useSampleData();
  const [columns, setColumns] = useState<number>(7);
  const start = addDays(parseLocalDate(TODAY_ANCHOR), -89);
  const startDate = toISODate(start);
  const endDate = TODAY_ANCHOR;

  return (
    <View>
      <MobileSurface>
        <Text style={[styles.heading, { color: colors.text }]}>Calendar mode — dynamic columns</Text>
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          Pick a column count. Cells always fill the container width with uniform grid
          spacing (vertical gap matches horizontal). The card is height-bounded to 8
          rows — when the 90-day range exceeds that, the oldest leading rows drop so
          smaller column counts stay compact instead of growing tall. At 7 columns
          weekday alignment is preserved (leading pad keeps Sun-Sat semantics); other
          counts drop the pad and flow date cells in order. Trailing filler cells
          complete the last row so the grid always reads as a solid block.
        </Text>
        <View style={styles.spacer} />
        <ColumnSelector value={columns} onChange={setColumns} />
        <View style={styles.spacer} />
        <ActivityGrid
          data={data}
          startDate={startDate}
          endDate={endDate}
          columns={columns}
          maxRows={8}
          accessibilityLabel="Sample activity grid with selectable column count"
        />
        <View style={styles.spacer} />
        <Text style={[styles.readout, { color: colors.textSecondary }]}>
          {columns} {columns === 1 ? 'column' : 'columns'} · max 8 rows ·
          cells size to fill the surface
        </Text>
      </MobileSurface>

      <View style={styles.spacer} />

      <MobileSurface>
        <Text style={[styles.heading, { color: colors.text }]}>Empty activity history</Text>
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          Empty input with a valid date range still renders the full calendar at zero intensity —
          the empty state is reserved for an invalid range.
        </Text>
        <View style={styles.spacer} />
        <ActivityGrid
          data={[]}
          startDate={startDate}
          endDate={endDate}
          accessibilityLabel="Sample empty activity grid"
        />
      </MobileSurface>

      <View style={styles.spacer} />

      <MobileSurface>
        <Text style={[styles.heading, { color: colors.text }]}>Responsive-matrix mode</Text>
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          Dev-preview only. Matrix mode holds cell size in [14, 28]px and lets
          column count grow with the available width — 7 → 14 → 28 → 56 cols
          as width grows. On desktop, resize your browser window and watch
          the column count adapt live (narrower → fewer larger cells, wider →
          more smaller cells). On mobile the surface width is fixed by the
          device so the adaptation is less vivid, but the grid still picks
          the largest column count whose cell size lands in [14, 28]px for
          the current surface. Not weekday-aligned; do not use for calendar
          visualization.
        </Text>
        <View style={styles.spacer} />
        <ActivityGrid
          data={data}
          startDate={startDate}
          endDate={endDate}
          layout="responsive-matrix"
          accessibilityLabel="Sample activity grid in responsive-matrix mode"
        />
      </MobileSurface>

      <View style={styles.spacer} />

      <MobileSurface>
        <Text style={[styles.heading, { color: colors.text }]}>Invalid range</Text>
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          start &gt; end renders the documented invalid-range empty state — the only empty-state
          path. Malformed endpoint dates resolve to the same state.
        </Text>
        <View style={styles.spacer} />
        <ActivityGrid
          data={data}
          startDate={TODAY_ANCHOR}
          endDate={startDate}
          accessibilityLabel="Sample invalid-range activity grid"
        />
      </MobileSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 14,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  spacer: {
    height: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 44,
    alignItems: 'center',
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  readout: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});

export default ActivityGridPreview;

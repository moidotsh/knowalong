// components/MobilePremium/CalendarGrid.tsx
//
// Domain-neutral month-grid calendar. The visual alternative to a native
// `<input type="date">` — a compact 7-column grid with month navigation,
// min/max enforcement, a today affordance, and a clear highlight on the
// current value. Used by DatePickerField on every platform (the native
// community picker still ships as the spinner fallback inside MobileSheet;
// the grid is what renders on web).
//
// API: dates cross the boundary as YYYY-MM-DD strings only. Internally a
// transient Date is constructed via local components (`new Date(y, m-1, d)`)
// so negative-UTC-offset users never see their selection shift backward a
// day. See `utils/validation.ts → normalizeDateToISO` for the S12-blessed
// YYYY-MM-DD validation site.
//
// Accessibility contract:
//   • Container is accessibilityRole="list" with a composed label. RN's
//     AccessibilityRole enum does not include "grid" or "row"; "list" is
//     the closest available cross-platform role. Consumers that want
//     strict WAI-ARIA grid semantics on web can layer host-level
//     aria-role="grid" / aria-role="row" attributes themselves (same
//     pattern the showcase documents for tabpanel at
//     components/MobilePremium/showcase.tsx in the SegmentedControl
//     `variant="tabs"` demo).
//   • Each day cell is role="button" (Pressable) with accessibilityState={{
//     selected }} for the active day and accessibilityState={{ disabled }}
//     for out-of-range days. Min 40×40 tap target.
//   • Day-of-week headers are decorative (accessibilityElementsHidden) —
//     the day cells carry the full semantics.
//
// No animation in v1. The grid swaps instantly when the month advances; the
// MobileSheet that hosts the grid owns enter/exit motion.

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons-2';
import {
  addMonths,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { format } from 'date-fns';
import { theme } from '../../constants';
import { useAppTheme } from '../../context';
import { usePressedStyle } from '../premium/shared';
import { normalizeDateToISO } from '../../utils/validation';

export interface CalendarGridProps {
  /** Current value as YYYY-MM-DD or null. */
  value: string | null;
  /** Fires with YYYY-MM-DD when the user taps an enabled day. */
  onChange: (value: string) => void;
  /** Min YYYY-MM-DD inclusive. Days before this date render disabled. */
  min?: string;
  /** Max YYYY-MM-DD inclusive. Days after this date render disabled. */
  max?: string;
  /** Override the brand accent color. */
  accentColor?: string;
  /** Override the composed a11y label for the grid container. */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const DOW_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const EYEBROW: Pick<
  typeof theme.typography.mobileEyebrow,
  'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing'
> = {
  fontSize: theme.typography.mobileEyebrow.fontSize,
  fontWeight: theme.typography.mobileEyebrow.fontWeight as any,
  lineHeight: theme.typography.mobileEyebrow.lineHeight,
  letterSpacing: theme.typography.mobileEyebrow.letterSpacing,
};

function toLocalDate(ymd: string | null | undefined): Date | null {
  const normalized = ymd ? normalizeDateToISO(ymd) : null;
  if (!normalized) return null;
  const [y, m, d] = normalized.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function clampInitialMonth(value: Date | null, min: Date | null, max: Date | null): Date {
  const today = startOfDay(new Date());
  if (value) return startOfMonth(value);
  if (min && isBefore(today, min)) return startOfMonth(min);
  if (max && isAfter(today, max)) return startOfMonth(max);
  return startOfMonth(today);
}

export function CalendarGrid({
  value,
  onChange,
  min,
  max,
  accentColor,
  accessibilityLabel,
  testID,
  style,
}: CalendarGridProps) {
  const { colors } = useAppTheme();
  const accent = accentColor ?? colors.brand;
  const pressedStyle = usePressedStyle();

  const valueDate = useMemo(() => toLocalDate(value), [value]);
  const minDate = useMemo(() => (min ? toLocalDate(min) : null), [min]);
  const maxDate = useMemo(() => (max ? toLocalDate(max) : null), [max]);

  const [displayMonth, setDisplayMonth] = useState<Date>(() =>
    clampInitialMonth(valueDate, minDate, maxDate),
  );

  const days = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(new Date(year, month, day));
    }
    // Pad to a multiple of 7 so the grid rows are uniform.
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [displayMonth]);

  const isDayDisabled = (day: Date): boolean => {
    const d = startOfDay(day);
    if (minDate && isBefore(d, startOfDay(minDate))) return true;
    if (maxDate && isAfter(d, startOfDay(maxDate))) return true;
    return false;
  };

  const prevDisabled = !!minDate && isBefore(
    addMonths(startOfMonth(displayMonth), -1),
    startOfMonth(minDate),
  );
  const nextDisabled = !!maxDate && isAfter(
    addMonths(startOfMonth(displayMonth), 1),
    startOfMonth(maxDate),
  );

  const handlePrev = () => {
    if (prevDisabled) return;
    setDisplayMonth((m) => addMonths(m, -1));
  };
  const handleNext = () => {
    if (nextDisabled) return;
    setDisplayMonth((m) => addMonths(m, 1));
  };
  const handleToday = () => {
    const today = new Date();
    if (isDayDisabled(today)) return;
    setDisplayMonth(startOfMonth(today));
    onChange(toYmd(today));
  };

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const composedLabel =
    accessibilityLabel ?? `Calendar, ${format(displayMonth, 'MMMM yyyy')}`;

  return (
    <View
      testID={testID}
      accessibilityRole="list"
      accessibilityLabel={composedLabel}
      style={[styles.shell, style]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={handlePrev}
          disabled={prevDisabled}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          accessibilityState={{ disabled: prevDisabled }}
          style={[
            styles.navButton,
            prevDisabled ? { opacity: 0.3 } : null,
          ]}
        >
          <ChevronLeft size={20} color={colors.text} />
        </Pressable>
        <Text
          style={[styles.monthLabel, { color: colors.text }]}
          accessibilityRole="header"
        >
          {format(displayMonth, 'MMMM yyyy')}
        </Text>
        <Pressable
          onPress={handleNext}
          disabled={nextDisabled}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: nextDisabled }}
          style={[
            styles.navButton,
            nextDisabled ? { opacity: 0.3 } : null,
          ]}
        >
          <ChevronRight size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.dowRow} accessibilityElementsHidden>
        {DOW_HEADERS.map((d) => (
          <Text key={d} style={[styles.dowLabel, { color: colors.textMuted }]}>
            {d}
          </Text>
        ))}
      </View>

      {weeks.map((week, rowIdx) => (
        <View key={`week-${rowIdx}`} style={styles.weekRow}>
          {week.map((day, colIdx) => {
            if (!day) {
              return <View key={`blank-${rowIdx}-${colIdx}`} style={styles.dayCell} />;
            }
            const disabled = isDayDisabled(day);
            const selected = valueDate ? isSameDay(day, valueDate) : false;
            const inMonth = isSameMonth(day, displayMonth);
            const isToday = isSameDay(day, new Date());
            return (
              <Pressable
                key={`day-${rowIdx}-${colIdx}`}
                onPress={() => !disabled && onChange(toYmd(day))}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={format(day, 'EEEE, MMMM d, yyyy')}
                accessibilityState={{ selected, disabled }}
                style={({ pressed }) => [
                  styles.dayCell,
                  styles.dayCellButton,
                  selected ? { backgroundColor: accent } : null,
                  isToday && !selected ? { borderColor: accent, borderWidth: 1.5 } : null,
                  disabled ? { opacity: 0.3 } : null,
                  pressed && !disabled ? pressedStyle : null,
                ]}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    {
                      color: selected
                        ? colors.textOnBrand
                        : inMonth
                          ? colors.text
                          : colors.textMuted,
                      fontWeight: selected ? '700' : '500',
                    },
                  ]}
                >
                  {format(day, 'd')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      <Pressable
        onPress={handleToday}
        accessibilityRole="button"
        accessibilityLabel="Jump to today"
        style={({ pressed }) => [
          styles.todayButton,
          { borderColor: accent },
          pressed ? pressedStyle : null,
        ]}
      >
        <Text style={[styles.todayLabel, { color: accent }]}>Today</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    padding: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  dowRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dowLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    gap: 2,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
  },
  dayCellButton: {
    borderRadius: 20,
  },
  dayLabel: {
    fontSize: 14,
  },
  todayButton: {
    marginTop: 12,
    marginHorizontal: 4,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CalendarGrid;

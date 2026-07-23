// components/MobilePremium/DatePickerField.tsx
//
// Single-date picker. The public API carries dates as YYYY-MM-DD strings
// end-to-end — no Date object crosses the boundary. This is load-bearing:
// constructing `new Date('YYYY-MM-DD')` lands at midnight UTC, which shifts
// backward one day for users in negative UTC offsets. We use local-component
// extraction (`getFullYear/Month/Date`) whenever a Date object must be
// produced transiently (for the native picker or the calendar grid) so users
// never see their selection drift across timezones.
//
// Composition: every platform renders the same styled trigger (Pressable),
// then opens a MobileSheet hosting the platform-appropriate picker:
//   • Web — <CalendarGrid>: a domain-neutral month grid with min/max
//     enforcement, today affordance, and a clear highlight on value.
//     Replaces the previous `<input type="date">` whose native chrome varied
//     wildly across browsers and read as visually off-kit.
//   • Native — @react-native-community/datetimepicker in `display="spinner"`.
//     The spinner is the only mode that renders consistently across iOS and
//     Android without further platform branching.
//
// The native branch's import of @react-native-community/datetimepicker is
// static (the package's web entry returns null with a warning); the render
// gate below ensures it is never actually mounted on web. The package is the
// first source consumer — installed at 8.4.4 with zero prior consumers.

import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronDown } from '@tamagui/lucide-icons-2';
import { isWeb } from '../../utils';
import { normalizeDateToISO } from '../../utils/validation';
import { theme, MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';
import { useAppTheme } from '../../context';
import { MobileSheet } from './MobileSheet';
import { CalendarGrid } from './CalendarGrid';
import { MobilePrimaryButton } from './MobilePrimaryButton';
import { useFocusRing, usePressedStyle } from '../premium/shared';

export interface DatePickerFieldProps {
  /** Field label. */
  label?: string;
  /** Current value as YYYY-MM-DD or null. */
  value: string | null;
  /** Fires with YYYY-MM-DD or null when cleared. */
  onChange: (value: string | null) => void;
  /** Min YYYY-MM-DD inclusive (native: maps to minimumDate). */
  min?: string;
  /** Max YYYY-MM-DD inclusive (native: maps to maximumDate). */
  max?: string;
  /** Placeholder when value is null. Default 'Select a date'. */
  placeholder?: string;
  /** Helper copy below the trigger / input. */
  helperText?: string;
  /** Error copy below the trigger / input (renders in the error color). */
  errorText?: string;
  /** Accent color (default theme brand). */
  accentColor?: string;
  /** Test ID. */
  testID?: string;
  /** Outer style pass-through. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Local-timezone-safe YYYY-MM-DD builder from a Date. Uses getFullYear /
 * getMonth / getDate (NOT toISOString) so negative-offset users never see
 * their selected date shift backward a day.
 */
function formatLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse YYYY-MM-DD into a local-midnight Date. Falls back to "now" on
 * malformed input — the native picker requires a valid Date object.
 * Uses `normalizeDateToISO` (the canonical S12-blessed regex site) for
 * YYYY-MM-DD validation, then constructs via local components so
 * `new Date('YYYY-MM-DD')`'s UTC-midnight parse never shifts the day
 * backward in negative UTC offsets.
 */
function parseLocalYmd(value: string | null | undefined): Date {
  const normalized = value ? normalizeDateToISO(value) : null;
  if (normalized) {
    const [y, m, d] = normalized.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}

const FIELD_LABEL_STYLE: Pick<
  typeof theme.typography.mobileFieldLabel,
  'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing'
> = {
  fontSize: theme.typography.mobileFieldLabel.fontSize,
  fontWeight: theme.typography.mobileFieldLabel.fontWeight as any,
  lineHeight: theme.typography.mobileFieldLabel.lineHeight,
  letterSpacing: theme.typography.mobileFieldLabel.letterSpacing,
};

/**
 * Single-date picker. YYYY-MM-DD in and out — no Date object crosses the
 * public API. Web opens MobileSheet hosting <CalendarGrid>; native opens
 * MobileSheet hosting the community DateTimePicker in spinner mode.
 */
export function DatePickerField({
  label,
  value,
  onChange,
  min,
  max,
  placeholder = 'Select a date',
  helperText,
  errorText,
  accentColor,
  testID,
  style,
}: DatePickerFieldProps) {
  const { colors } = useAppTheme();
  const accent = accentColor ?? colors.brand;
  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState<string | null>(value);
  const pressedStyle = usePressedStyle();
  const { ringStyle, glowStyle } = useFocusRing({ color: accent, focused: open });
  const hasError = !!errorText;

  const borderColor = open ? `${accent}66` : colors.glass.emptyInputBorder;
  const triggerBg = open ? colors.glass.inputFocusBackground : colors.glass.inputBackground;
  const labelColor = hasError ? colors.status.error : open ? accent : colors.text;

  const nativeInitial = useMemo(() => parseLocalYmd(value), [value]);
  const nativeMin = useMemo(() => (min ? parseLocalYmd(min) : undefined), [min]);
  const nativeMax = useMemo(() => (max ? parseLocalYmd(max) : undefined), [max]);

  const openSheet = () => {
    setDraftValue(value);
    setOpen(true);
  };

  const closeSheet = () => setOpen(false);

  const commitDraft = () => {
    onChange(draftValue);
    setOpen(false);
  };

  const handleNativeChange: (
    event: { type: 'set' | 'dismissed' | 'neutral' },
    date?: Date,
  ) => void = (event, date) => {
    if (event.type !== 'set') {
      setOpen(false);
      return;
    }
    if (date) {
      onChange(formatLocalYmd(date));
    }
    setOpen(false);
  };

  const triggerLabel = value ?? placeholder;
  const isPlaceholder = !value;
  const sheetTitle = label ?? placeholder;

  return (
    <View style={[styles.group, style]} testID={testID}>
      {label ? (
        <Text style={[FIELD_LABEL_STYLE as any, { color: labelColor }]}>{label}</Text>
      ) : null}

      <View style={styles.triggerWrap}>
        <View style={glowStyle}>
          <Pressable
            onPress={openSheet}
            accessibilityRole="button"
            accessibilityLabel={label ?? placeholder}
            accessibilityValue={value ? { text: value } : undefined}
            style={({ pressed }) => [
              styles.trigger,
              {
                borderColor: hasError ? colors.status.error : borderColor,
                backgroundColor: triggerBg,
              },
              pressed ? pressedStyle : null,
            ]}
          >
            <Text
              style={[
                styles.triggerLabel,
                { color: isPlaceholder ? colors.textColors.tertiary : colors.text },
              ]}
              numberOfLines={1}
            >
              {triggerLabel}
            </Text>
            <ChevronDown size={20} color={open ? accent : colors.textColors.muted} />
          </Pressable>
        </View>
        {/* Focus ring overlay — matches MobileInput / MobileSelect rhythm. */}
        <View pointerEvents="none" style={ringStyle} />
      </View>

      <MobileSheet
        open={open}
        onOpenChange={setOpen}
        title={sheetTitle}
        accentColor={accent}
      >
        {isWeb ? (
          <View style={styles.calendarWrap}>
            <CalendarGrid
              value={draftValue}
              onChange={setDraftValue}
              min={min}
              max={max}
              accentColor={accent}
            />
            <View style={styles.actionRow}>
              <MobilePrimaryButton onPress={closeSheet} variant="ghost">
                Cancel
              </MobilePrimaryButton>
              <View style={styles.actionGap} />
              <MobilePrimaryButton onPress={commitDraft}>Done</MobilePrimaryButton>
            </View>
          </View>
        ) : (
          <DateTimePicker
            value={nativeInitial}
            mode="date"
            display="spinner"
            minimumDate={nativeMin}
            maximumDate={nativeMax}
            onChange={handleNativeChange as any}
            textColor={colors.text}
          />
        )}
      </MobileSheet>

      {hasError ? (
        <Text style={[styles.errorText, { color: colors.status.error }]} numberOfLines={2}>
          {errorText}
        </Text>
      ) : helperText ? (
        <Text style={[styles.helperText, { color: colors.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 6,
    ...MOBILE_CONTENT_WIDTH_STYLE,
    marginBottom: 16,
  },
  triggerWrap: {
    position: 'relative',
  },
  trigger: {
    height: 54,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    paddingRight: 8,
  },
  calendarWrap: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  actionGap: {
    width: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 2,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});

export default DatePickerField;

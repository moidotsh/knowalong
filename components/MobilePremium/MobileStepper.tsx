// components/MobilePremium/MobileStepper.tsx
// Premium large-value stepper for mobile wizard steps.
//
// Big-number treatment always on — fontSize 48 / weight 800 /
// letterSpacing -2, matching the value-input hero rhythm.
//
// Long-press + debounce + fast-interval interaction. R4a-compliant timer
// cleanup: setTimeout paired with clearTimeout, setInterval paired with
// clearInterval, both torn down on unmount.
//
// Backward-compat: the original arqavellum API (onIncrement/onDecrement +
// decrementDisabled/incrementDisabled + suffix) is preserved by mapping
// to the new min/max/step/onChange/decimalPlaces API when those props
// are provided instead.

import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Minus, Plus } from '@tamagui/lucide-icons-2';
import { usePressedStyle } from '../premium/shared';
import { ANIMATION } from '../../constants';
import { useAppTheme } from '../../context';

export interface MobileStepperProps {
  /** Current value. */
  value: number;
  /** Minimum allowed value (default Number.NaN = no lower bound). */
  min?: number;
  /** Maximum allowed value (default Number.NaN = no upper bound). */
  max?: number;
  /** Step size for a single tap (default 1). */
  step?: number;
  /** Step size for long-press / fast increment (default 10). */
  fastStep?: number;
  /** Accent color (default theme brand). */
  accentColor?: string;
  /** Optional unit label rendered under the value (e.g. 'cm', 'in', 'degrees'). */
  unitLabel?: string;
  /** Suffix appended to the value (e.g. '×', ' units'). Legacy alias of unitLabel. */
  suffix?: string;
  /** Decimal places to display (default 0). */
  decimalPlaces?: number;
  /** Change handler (preferred — works with min/max/step). */
  onChange?: (value: number) => void;
  /** Legacy increment handler. Used when `onChange` is not provided. */
  onIncrement?: () => void;
  /** Legacy decrement handler. Used when `onChange` is not provided. */
  onDecrement?: () => void;
  /** Legacy: disable the decrement button. */
  decrementDisabled?: boolean;
  /** Legacy: disable the increment button. */
  incrementDisabled?: boolean;
  /** Test ID. */
  testID?: string;
  /** Outer style pass-through. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Premium large-value stepper. Long-press a button to accelerate; release to
 * stop. The value display is a single big number with an optional unit
 * label, centered in the containing surface.
 */
export function MobileStepper({
  value,
  min = Number.NaN,
  max = Number.NaN,
  step = 1,
  fastStep = 10,
  accentColor,
  unitLabel,
  suffix,
  decimalPlaces = 0,
  onChange,
  onIncrement,
  onDecrement,
  decrementDisabled = false,
  incrementDisabled = false,
  testID,
  style,
}: MobileStepperProps) {
  const { colors } = useAppTheme();
  const accent = accentColor ?? colors.brand;
  const pressedStyle = usePressedStyle();

  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fastIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Timestamp of the last single-tap action to debounce touch bounce.
  const lastTapRef = useRef(0);

  // Ref mirror of the current value so the interval callbacks always read
  // fresh state and never close over a stale `value`.
  const valueRef = useRef(value);
  valueRef.current = value;

  const cleanup = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    if (fastIntervalRef.current) {
      clearInterval(fastIntervalRef.current);
      fastIntervalRef.current = null;
    }
  }, []);

  // R4a: pair every timer with its clearer and tear down on unmount.
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Single-tap actions — branch on whether the consumer is using the new
  // min/max/step/onChange API or the legacy onIncrement/onDecrement API.
  const decrement = useCallback(() => {
    if (onChange) {
      const next = Number.isNaN(min) ? valueRef.current - step : Math.max(min, valueRef.current - step);
      onChange(next);
    } else {
      onDecrement?.();
    }
  }, [onChange, onDecrement, min, step]);

  const increment = useCallback(() => {
    if (onChange) {
      const next = Number.isNaN(max) ? valueRef.current + step : Math.min(max, valueRef.current + step);
      onChange(next);
    } else {
      onIncrement?.();
    }
  }, [onChange, onIncrement, max, step]);

  const fastDecrement = useCallback(() => {
    if (!onChange) return;
    const next = Number.isNaN(min) ? valueRef.current - fastStep : Math.max(min, valueRef.current - fastStep);
    onChange(next);
  }, [onChange, min, fastStep]);

  const fastIncrement = useCallback(() => {
    if (!onChange) return;
    const next = Number.isNaN(max) ? valueRef.current + fastStep : Math.min(max, valueRef.current + fastStep);
    onChange(next);
  }, [onChange, max, fastStep]);

  const startLongPress = useCallback(
    (action: () => void, fastAction: () => void) => {
      const now = Date.now();
      // Debounce: ignore presses arriving within 300ms of the last single-tap.
      if (now - lastTapRef.current < 300) return;
      lastTapRef.current = now;

      // Initial press triggers the single action immediately.
      action();

      // Fast acceleration is only meaningful with the new onChange API
      // (legacy onIncrement has no value-awareness).
      if (!onChange) return;

      // After the long-press delay, fire the fast action once, then repeat.
      longPressTimeoutRef.current = setTimeout(() => {
        fastAction();
        fastIntervalRef.current = setInterval(fastAction, ANIMATION.FAST_INTERVAL);
      }, ANIMATION.LONG_PRESS_DELAY);
    },
    [onChange],
  );

  const endLongPress = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const canDecrement = onChange ? value > min : !decrementDisabled;
  const canIncrement = onChange ? value < max : !incrementDisabled;

  const displayValue =
    decimalPlaces === 0 ? Math.round(value).toString() : value.toFixed(decimalPlaces);
  const resolvedUnitLabel = unitLabel ?? suffix;

  return (
    <View testID={testID} style={[styles.container, style]}>
      {/* Large value display */}
      <View style={styles.valueBlock}>
        <Text style={[styles.value, { color: accent }]}>
          {displayValue}
          {resolvedUnitLabel && !unitLabel ? resolvedUnitLabel : null}
        </Text>
        {unitLabel ? (
          <Text style={[styles.unit, { color: colors.textColors.secondary }]}>
            {unitLabel}
          </Text>
        ) : null}
      </View>

      {/* +/- buttons */}
      <View style={styles.buttons}>
        <Pressable
          onPressIn={() => canDecrement && startLongPress(decrement, fastDecrement)}
          onPressOut={endLongPress}
          disabled={!canDecrement}
          accessibilityRole="button"
          accessibilityLabel="decrement"
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: canDecrement ? `${accent}18` : colors.cardAlt,
              opacity: canDecrement ? 1 : 0.4,
            },
            pressed && canDecrement ? pressedStyle : null,
          ]}
        >
          <Minus size={28} color={canDecrement ? accent : colors.textColors.muted} strokeWidth={3} />
        </Pressable>

        <Pressable
          onPressIn={() => canIncrement && startLongPress(increment, fastIncrement)}
          onPressOut={endLongPress}
          disabled={!canIncrement}
          accessibilityRole="button"
          accessibilityLabel="increment"
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: canIncrement ? `${accent}18` : colors.cardAlt,
              opacity: canIncrement ? 1 : 0.4,
            },
            pressed && canIncrement ? pressedStyle : null,
          ]}
        >
          <Plus size={28} color={canIncrement ? accent : colors.textColors.muted} strokeWidth={3} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: 32,
    paddingVertical: 16,
  },
  valueBlock: {
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontSize: 48,
    fontWeight: '800' as any,
    lineHeight: 52,
    letterSpacing: -2,
  },
  unit: {
    fontSize: 18,
    fontWeight: '500' as any,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MobileStepper;

// components/MobilePremium/SegmentedControl.tsx
// Pill-track segmented control with two explicit accessibility variants.
// The variants have the same visual treatment but distinct a11y contracts
// — pick by content semantics, not by visual preference:
//
//   variant="selection" (default)
//     Mutually-exclusive VALUE selection. Filter scope, period picker,
//     view density. Container role="radiogroup"; each segment role="radio"
//     with accessibilityState.checked. A radio announces "selected from N
//     options" — correct for value-picking.
//
//   variant="tabs"
//     Content-region switching. Detail tabs, message threads tabs.
//     Container role="tablist"; each segment role="tab" with
//     accessibilityState.selected. A tab announces "controls a panel."
//
// Why two variants: merging them into one ambiguous API produces wrong
// screen-reader output (a value picker announced as a tab controller, or
// vice versa). The visual primitive is identical; the semantic primitive
// is not.
//
// Panel composition for the `tabs` variant is consumer-owned end-to-end.
// The shell does NOT wire `aria-controls` via a shell-managed id — an
// arbitrary id strategy is unverified across RN-iOS, RN-Android, and web
// accessibility tooling. The consumer is responsible for rendering the
// matching panel and wiring platform-appropriate panel association. The
// shell ships the tablist + tab semantics only.
//
// No slide animation in v1 — the active state changes instantly. The
// chromeless flag drops the track fill + border for inline affordances
// inside a hero surface (matches the PeriodSelector pattern).

import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable, usePressedStyle } from '../premium/shared';
import { useAppTheme } from '../../context';
import { MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';

export interface Segment<T> {
  /** Visible label on the segment. */
  label: string;
  /** Value the segment represents. */
  value: T;
  /** Optional custom screen-reader label for the segment. Defaults to `label`. */
  accessibilityLabel?: string;
}

export interface SegmentedControlProps<T> {
  /** Semantic variant — see file header for the contract each one carries. */
  variant: 'selection' | 'tabs';
  /** The available segments. */
  segments: readonly Segment<T>[];
  /** Currently selected value. */
  value: T;
  /** Called with the new value when a segment is tapped. */
  onChange: (next: T) => void;
  /** Drop the track fill + border. Default false. */
  chromeless?: boolean;
  /** Distribute segments evenly across the available width. Default true. */
  fullWidth?: boolean;
  /** Size preset. 'md' (default) is 44px tall; 'sm' is 36px. */
  size?: 'sm' | 'md';
  /** Optional group label for screen readers. */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T>({
  variant,
  segments,
  value,
  onChange,
  chromeless = false,
  fullWidth = true,
  size = 'md',
  accessibilityLabel,
  testID,
  style,
}: SegmentedControlProps<T>) {
  const { colors } = useAppTheme();
  const pressedStyle = usePressedStyle();

  const containerRole = variant === 'tabs' ? 'tablist' : 'radiogroup';
  const segmentRole = variant === 'tabs' ? 'tab' : 'radio';
  const height = size === 'sm' ? 36 : 44;

  return (
    <View
      testID={testID}
      accessibilityRole={containerRole}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        {
          height,
          backgroundColor: chromeless ? 'transparent' : colors.cardAlt,
          borderColor: chromeless ? 'transparent' : colors.border,
          paddingHorizontal: chromeless ? 0 : 4,
        },
        style,
      ]}
    >
      {segments.map((segment) => {
        const active = segment.value === value;
        const segmentState = variant === 'tabs' ? { selected: active } : { checked: active };
        return (
          <Pressable
            key={String(segment.value)}
            onPress={() => onChange(segment.value)}
            accessibilityRole={segmentRole as any}
            accessibilityState={segmentState}
            accessibilityLabel={segment.accessibilityLabel ?? segment.label}
            style={({ pressed }) => [
              {
                flex: fullWidth ? 1 : 0,
                height: chromeless && size === 'md' ? height - 8 : height - (chromeless ? 0 : 8),
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 12,
                borderRadius: (height - (chromeless ? 0 : 8)) / 2,
                backgroundColor: active
                  ? colors.brand
                  : chromeless
                    ? 'transparent'
                    : 'transparent',
                opacity: pressed ? 0.7 : 1,
              },
              pressed ? pressedStyle : null,
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: active
                    ? colors.textOnBrand
                    : chromeless
                      ? colors.text
                      : colors.textSecondary,
                  fontWeight: active ? '600' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    gap: 2,
    ...MOBILE_CONTENT_WIDTH_STYLE,
  },
  label: {
    fontSize: 13,
    letterSpacing: 0,
  },
});

export default SegmentedControl;

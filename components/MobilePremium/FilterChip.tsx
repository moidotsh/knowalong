// components/MobilePremium/FilterChip.tsx
// Interactive pill primitive. One chip — label, optional icon, selected
// state, tap handler. Domain-neutral: no copy, no schema, no list state.
//
// Accessibility state MUST match the chosen role:
//   • role="button" (default) → accessibilityState.selected
//   • role="radio"             → accessibilityState.checked
//   • role="checkbox"          → accessibilityState.checked
// The component maps the role to the correct state key. Do not extend the
// API to take both keys at once — `radio`/`checkbox` use `checked`, a
// toggle `button` uses `selected`. Setting both produces wrong screen-reader
// output ("selected" + "checked" announced together).
//
// The icon node is consumer-supplied and consumer-tinted — read the active
// palette from `useAppTheme()` at the call site and pass the right color
// to the icon's `color` prop. Keeping the icon untinted here preserves the
// consumer's ability to use any icon component (lucide, custom SVG, emoji).
//
// For the surrounding layout container, see FilterChipGroup. FilterChip is
// the interactive primitive; FilterChipGroup is purely presentational.

import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable, usePressedStyle } from '../premium/shared';
import { useAppTheme } from '../../context';

export type FilterChipAccessibilityRole = 'button' | 'radio' | 'checkbox';

export interface FilterChipProps {
  /** Chip label. */
  label: string;
  /** Whether the chip is in the selected/checked/active state. */
  selected: boolean;
  /** Tap handler. */
  onPress: () => void;
  /** Optional icon rendered before the label. Consumer-owned and consumer-tinted. */
  icon?: React.ReactNode;
  /** Disables interaction and dims the chip. */
  disabled?: boolean;
  /** Optional custom screen-reader label. Defaults to `label`. */
  accessibilityLabel?: string;
  /**
   * Accessibility role. 'button' (default) announces `selected`;
   * 'radio' and 'checkbox' announce `checked`. Pick by the semantic use
   * case: single-select cluster → radio; multi-select cluster → checkbox;
   * standalone toggle → button. The state key is mapped from this prop.
   */
  accessibilityRole?: FilterChipAccessibilityRole;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function FilterChip({
  label,
  selected,
  onPress,
  icon,
  disabled = false,
  accessibilityLabel,
  accessibilityRole = 'button',
  testID,
  style,
}: FilterChipProps) {
  const { colors } = useAppTheme();
  const pressedStyle = usePressedStyle();

  const useChecked = accessibilityRole === 'radio' || accessibilityRole === 'checkbox';
  const a11yState = useChecked ? { checked: selected } : { selected };

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={a11yState}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.brand : colors.card,
          borderColor: selected ? colors.brand : colors.border,
          opacity: disabled ? 0.5 : 1,
        },
        pressed && !disabled ? pressedStyle : null,
        style,
      ]}
    >
      {icon ? <View style={styles.iconSlot}>{icon}</View> : null}
      <Text style={[styles.label, { color: selected ? colors.textOnBrand : colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
  },
  iconSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
  },
});

export default FilterChip;

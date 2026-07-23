// components/MobilePremium/FilterChipGroup.tsx
// Purely presentational layout container for FilterChip children. Wraps N
// chips in a flex row; that's it. The group deliberately does NOT:
//
//   • render a ScrollView
//   • own horizontal scroll when `wrap: false` — `wrap: false` only changes
//     flex behavior; chips lay out in one row and may overflow the
//     container. Consumers wrap the group in their own `<ScrollView
//     horizontal>` when they need horizontal overflow.
//   • own sticky placement — consumers render the group outside their
//     ScrollView, or use `stickyHeaderIndices` on native, or
//     `position: sticky` on web. All consumer decisions.
//   • own a search slot, filters state, or any business logic
//   • carry an a11y role of its own — presentational only. The semantic
//     grouping (e.g. `role="radiogroup"` for a single-select cluster) is
//     owned by the consumer's surrounding wrapper if needed.
//
// Why the strict scope: scroll behavior, sticky placement, and overflow
// handling all have platform-specific shapes (RN ScrollView vs web
// overflow-x vs CSS sticky). A shared primitive that tried to own any of
// them would either lie about its contract or grow an unbounded surface.
// Consumers who need overflow wrap this group in the platform primitive
// they already use for overflow.

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export interface FilterChipGroupProps {
  /** Typically a row of FilterChip, but accepts any children. */
  children: React.ReactNode;
  /**
   * Default true: chips flex-wrap to additional rows. false: chips lay out
   * in a single row and may overflow the container. The group does NOT
   * render or own a ScrollView in either mode.
   */
  wrap?: boolean;
  /** Gap between children. Default 8. */
  gap?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function FilterChipGroup({
  children,
  wrap = true,
  gap = 8,
  testID,
  style,
}: FilterChipGroupProps) {
  return (
    <View
      testID={testID}
      style={[styles.row, { flexWrap: wrap ? 'wrap' : 'nowrap', gap }, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});

export default FilterChipGroup;

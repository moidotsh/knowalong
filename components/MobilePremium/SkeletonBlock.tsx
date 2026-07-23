// components/MobilePremium/SkeletonBlock.tsx
// The placeholder primitive for loading skeletons. Reads `colors.cardAlt`
// (the documented "elevated surface" tone — reads as a placeholder, not
// as content) and pulses opacity via useShimmer. Uses Animated.View (not
// ActivityIndicator) so the C4 audit doesn't apply by construction.
//
// Pair with consumer-composed skeletons (e.g. a `DashboardSkeleton` or
// `ListSkeleton` composed primitive) for screen-level loading states.
// The primitive stays domain-agnostic — every consumer gets the
// same block + the same pulse, and composes per-screen shapes locally.

import React, { memo } from 'react';
import {
  Animated,
  type DimensionValue,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { theme } from '../../constants';
import { useAppTheme } from '../../context';
import { useShimmer } from '../../hooks';

export interface SkeletonBlockProps {
  /** Width. Default '100%'. Pass a number for px or a string for '%'. */
  width?: DimensionValue;
  /** Height in px. Default 16. */
  height?: number;
  /** Corner radius. Default theme.borderRadius.small (8). Pass height/2
   *  for circular shapes, or theme.borderRadius.pill for full pills. */
  borderRadius?: number;
  /** Optional top margin — convenience for stacked layouts. */
  marginTop?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function SkeletonBlockInner({
  width = '100%',
  height = 16,
  borderRadius = theme.borderRadius.small,
  marginTop,
  style,
  testID,
}: SkeletonBlockProps) {
  const { colors } = useAppTheme();
  const opacity = useShimmer();
  return (
    <Animated.View
      testID={testID}
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.cardAlt,
          opacity,
          marginTop,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    // Layout-neutral — caller composes via props + style. Width/height
    // come from props so the block can be sized to its eventual content.
  },
});

export const SkeletonBlock = memo(SkeletonBlockInner);

export default SkeletonBlock;

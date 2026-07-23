// components/MobilePremium/MobileStepRail.tsx
// Thin horizontal rail at the top of the content area — a 2px line that
// fills as the user advances. Replaces dot-row progress indicators.
//
// Costs less vertical space than dot rows (2px vs 12-16px for dots) and
// reads as more designed. The fill travels across the track with a
// subtle accent-tinted glow on web.
//
// Under `prefers-reduced-motion`, the fill snaps instead of animating.

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { isWeb } from '../../utils';
import { usePlatformAnimation, useReducedMotion } from '../../hooks';
import { useAppTheme } from '../../context';
import { MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';

export interface MobileStepRailProps {
  /** Current step (0-indexed). `current` is the primary prop name. */
  current?: number;
  /** Total number of steps. `total` is the primary prop name. */
  total?: number;
  /** Current step (1-indexed). Alternative alias — converted internally to 0-indexed. */
  step?: number;
  /** Total number of steps. Alternative alias for `total`. */
  totalSteps?: number;
  /** Accent color for the fill (default theme brand). */
  accentColor?: string;
  /** Override the rail fill color (defaults to accent). Legacy alias. */
  fillColor?: string;
  /** Override the track height (default 2). */
  height?: number;
  /** Override the rail's outer style. */
  style?: StyleProp<ViewStyle>;
  /** Test ID. */
  testID?: string;
}

/**
 * Thin horizontal progress rail.
 *
 * Place at the top of the content area, below MobileHeader. Renders as
 * a full-width track (2px tall) with a fill that animates from 0% to
 * (current+1)/total of the width.
 *
 * Accepts both `current/total` (0-indexed) and `step/totalSteps` (1-indexed)
 * prop pairs. The 0-indexed pair is the primary API; the 1-indexed pair is
 * converted internally.
 */
export function MobileStepRail({
  current,
  total,
  step,
  totalSteps,
  accentColor,
  fillColor,
  height = 2,
  style,
  testID,
}: MobileStepRailProps) {
  const { colors } = useAppTheme();
  const accent = fillColor ?? accentColor ?? colors.brand;
  const { useNativeDriver } = usePlatformAnimation();
  const reduced = useReducedMotion();

  // Normalize the two API shapes into a 0-1 fill ratio.
  const resolvedTotal = total ?? totalSteps ?? 0;
  const resolvedCurrent = current != null ? current : (step != null ? step - 1 : 0);
  const fillRatio =
    resolvedTotal > 0 ? Math.max(0, Math.min(1, (resolvedCurrent + 1) / resolvedTotal)) : 0;

  // Animated width — animate a 0-1 number, interpolate to % at render.
  const progress = useRef(new Animated.Value(fillRatio)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: fillRatio,
      duration: reduced ? 0 : 320,
      useNativeDriver: false, // width is not transform/opacity
    });
    anim.start();
    return () => anim.stop();
  }, [fillRatio, progress, reduced, useNativeDriver]);

  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const fillStyle: ViewStyle = useMemo(
    () => ({
      width: fillWidth as any,
      backgroundColor: accent,
    }),
    [accent, fillWidth],
  );

  const glowStyle: ViewStyle | undefined = useMemo(() => {
    if (!isWeb) return undefined;
    return { boxShadow: colors.mobilePremium.railFillShadow };
  }, [colors.mobilePremium.railFillShadow]);

  return (
    <View testID={testID} style={[styles.outer, style]}>
      <View
        style={[styles.track, { height, backgroundColor: colors.mobilePremium.railTrack }]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: resolvedTotal, now: resolvedCurrent + 1 }}
      >
        <Animated.View style={[styles.fill, fillStyle, glowStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    ...MOBILE_CONTENT_WIDTH_STYLE,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  track: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 1,
  },
  fill: {
    height: '100%',
    borderRadius: 1,
  },
});

export default MobileStepRail;

// components/MobilePremium/SegmentedProgress.tsx
//
// Multi-segment horizontal progress bar. Distinct from MobileStepRail
// (single linear sequence position) and the deferred ProgressRing (single
// circular value). Each segment fills independently toward its own ceiling.
//
// Use cases: multi-goal dashboards (e.g. "water / steps / sleep" each
// filling toward its own target), multi-phase onboarding completion,
// parallel OKR tracking.
//
// Domain-neutral: the consumer supplies segments as { value, max, color? }.
// The primitive owns only geometry (track height, gap, corner radius),
// clamping (each segment's value is clamped to [0, max]), and a11y
// aggregation (the container is one progressbar with min=0, max=total,
// now=filled).
//
// Static v1: no width animation. Reduced-motion-safe width transitions
// are non-trivial with the legacy Animated API (width is not transform/
// opacity) and would require either Reanimated (unadopted) or
// LayoutAnimation (unpredictable on web). Static is correct, simple,
// and accessible. Animated fill is a Batch C enhancement.

import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '../../context';

export interface ProgressSegment {
  /** Current value. Clamped to [0, max]. */
  value: number;
  /** Segment ceiling. Must be > 0; segments with max <= 0 render as 0% fill. */
  max: number;
  /** Override the segment fill color (defaults to colors.brand). */
  color?: string;
  /** Optional a11y label composed into the container's progressbar label. */
  accessibilityLabel?: string;
}

export interface SegmentedProgressProps {
  /** Ordered list of segments. */
  segments: readonly ProgressSegment[];
  /** Track height in px. Default 8. */
  height?: number;
  /** Gap between segments in px. Default 4. */
  gap?: number;
  /** Corner radius in px. Default 4. */
  borderRadius?: number;
  /** Track (unfilled) color. Default colors.cardAlt. */
  trackColor?: string;
  /** When true, render each segment's accessibilityLabel as visible text below. Default false. */
  showLabels?: boolean;
  /** Override the container's a11y label. */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

function clamp(v: number, lo: number, hi: number): number {
  if (hi <= lo) return lo;
  return Math.max(lo, Math.min(hi, v));
}

export function SegmentedProgress({
  segments,
  height = 8,
  gap = 4,
  borderRadius = 4,
  trackColor,
  showLabels = false,
  accessibilityLabel,
  testID,
  style,
}: SegmentedProgressProps) {
  const { colors } = useAppTheme();
  const track = trackColor ?? colors.cardAlt;

  const computed = useMemo(() => {
    let filled = 0;
    let total = 0;
    const rendered = segments.map((seg) => {
      const max = seg.max > 0 ? seg.max : 0;
      const value = clamp(seg.value, 0, max);
      filled += value;
      total += max;
      const ratio = max > 0 ? value / max : 0;
      return {
        color: seg.color ?? colors.brand,
        ratio,
        label: seg.accessibilityLabel,
      };
    });
    return { rendered, filled, total };
  }, [segments, colors.brand]);

  const composedLabel =
    accessibilityLabel ??
    (computed.total > 0
      ? `${computed.filled} of ${computed.total}`
      : 'No progress data');

  return (
    <View testID={testID} style={[styles.shell, style]}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={composedLabel}
        accessibilityValue={{
          min: 0,
          max: computed.total,
          now: computed.filled,
        }}
        style={[styles.row, { gap }]}
      >
        {computed.rendered.map((seg, i) => (
          <View
            key={i}
            style={[
              styles.track,
              { height, borderRadius, backgroundColor: track },
            ]}
          >
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.round(seg.ratio * 100)}%`,
                  backgroundColor: seg.color,
                  borderRadius,
                },
              ]}
            />
          </View>
        ))}
      </View>
      {showLabels && segments.some((s) => s.accessibilityLabel) ? (
        <View style={[styles.row, { gap, marginTop: 6 }]}>
          {computed.rendered.map((seg, i) => (
            <Text
              key={i}
              style={{
                flex: 1,
                fontSize: 11,
                fontWeight: '400',
                color: colors.textMuted,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {seg.label ?? ''}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  track: {
    flex: 1,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});

export default SegmentedProgress;

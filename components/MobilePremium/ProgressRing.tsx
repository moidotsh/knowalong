// components/MobilePremium/ProgressRing.tsx
//
// Static circular progress ring. The first source consumer of
// `react-native-svg` in arqavellum — the package is installed at 15.12.1
// and auto-linked by Expo SDK 54, so no babel/plugin or app.config change
// is required. SVG renders correctly on web (react-native-web aliases the
// SVG primitives to DOM svg/circle under the hood) and on native.
//
// Static v1: no mount animation, no arc animation, no glow. Reanimated or
// CSS `stroke-dashoffset` transitions would be required for animation;
// adopting either is a separate stack decision (see mobile-premium design
// system doc → ProgressRing inventory row).
//
// Domain-neutral: caller supplies a 0..1 progress value and optional label
// node (typically a percentage or fraction) rendered centered inside the
// ring. The accessibility contract is `progressbar` with `accessibilityValue`
// carrying the numeric value so screen readers announce the current state.

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import { useAppTheme } from '../../context';

export interface ProgressRingProps {
  /** Progress value in [0, 1]. Clamped; non-finite values render as 0. */
  progress: number;
  /** Size preset or numeric pixel diameter. Default 'md'. */
  size?: 'sm' | 'md' | 'lg' | number;
  /** Stroke width. Default scales with size (max(4, diameter / 12)). */
  strokeWidth?: number;
  /** Arc stroke color. Default theme brand. */
  color?: string;
  /** Track (background ring) color. Default colors.cardAlt. */
  trackColor?: string;
  /** Centered content rendered inside the ring (e.g. percentage label). */
  label?: React.ReactNode;
  /** Override the composed accessibility label. */
  accessibilityLabel?: string;
  /** Test ID. */
  testID?: string;
  /** Outer style pass-through. */
  style?: StyleProp<ViewStyle>;
}

const SIZE_PRESET: Record<'sm' | 'md' | 'lg', number> = {
  sm: 44,
  md: 72,
  lg: 120,
};

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function ProgressRing({
  progress,
  size = 'md',
  strokeWidth,
  color,
  trackColor,
  label,
  accessibilityLabel,
  testID,
  style,
}: ProgressRingProps) {
  const { colors } = useAppTheme();
  const diameter = typeof size === 'number' ? size : SIZE_PRESET[size];
  const stroke = strokeWidth ?? Math.max(4, Math.round(diameter / 12));
  const radius = Math.max(1, (diameter - stroke) / 2);
  const center = diameter / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = clampProgress(progress);
  const strokeDashoffset = circumference * (1 - clamped);
  const arcColor = color ?? colors.brand;
  const track = trackColor ?? colors.cardAlt;
  const pct = Math.round(clamped * 100);
  const composedLabel =
    accessibilityLabel ?? `Progress: ${pct} percent`;

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={composedLabel}
      accessibilityValue={{ min: 0, max: 100, now: pct, text: `${pct}%` }}
      style={[{ width: diameter, height: diameter }, style]}
    >
      <Svg width={diameter} height={diameter} style={StyleSheet.absoluteFill}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={arcColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {label ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.labelWrap}>{label}</View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProgressRing;

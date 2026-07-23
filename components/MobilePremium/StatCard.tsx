// components/MobilePremium/StatCard.tsx
//
// Single-metric card: a small surface that shows one labeled value with
// optional supporting copy and an accent icon. The canonical primitive for
// analytics dashboards, weekly summaries, and any "headline number" slot.
//
// Domain-neutral: the consumer supplies label, value, subtitle, icon. The
// card itself carries no analytics semantics, no time-bucketing, no trend
// computation, and no data fetching.
//
// Variants:
//   • 'plain' (default) — neutral surface (colors.card).
//   • 'accent' — brand-tinted surface for emphasis (one accent card per screen).
//   • 'outline' — hairline-bordered, no fill. Reads as less heavy.
//
// When `onPress` is provided, the card becomes a Pressable with role=button
// (e.g. "tap this stat to drill into the breakdown"). Omit `onPress` for
// static display (role=text).

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../../constants';
import { useAppTheme } from '../../context';
import { usePressedStyle } from '../premium/shared';

export type StatCardVariant = 'plain' | 'accent' | 'outline';
export type StatCardSize = 'sm' | 'md' | 'lg';

export interface StatCardProps {
  /** Small uppercase eyebrow above the value (e.g. "This week"). */
  label: string;
  /** The headline value. String or number — consumer formats. */
  value: string | number;
  /** Optional supporting line under the value. */
  subtitle?: string;
  /** Optional small icon next to the label. Consumer-tinted. */
  icon?: React.ReactNode;
  /** Visual treatment. Default 'plain'. */
  variant?: StatCardVariant;
  /** Density. Default 'md'. */
  size?: StatCardSize;
  /** Override the accent color (defaults to colors.brand). */
  accentColor?: string;
  /** Provide to make the card a Pressable button. */
  onPress?: () => void;
  /** Override the composed a11y label. */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const LABEL_STYLE = {
  fontSize: theme.typography.mobileEyebrow.fontSize,
  fontWeight: theme.typography.mobileEyebrow.fontWeight as any,
  lineHeight: theme.typography.mobileEyebrow.lineHeight,
  letterSpacing: theme.typography.mobileEyebrow.letterSpacing,
} as const;

function valueStyleFor(size: StatCardSize) {
  switch (size) {
    case 'sm':
      return {
        fontSize: theme.typography.mobileTitle.fontSize,
        fontWeight: theme.typography.mobileTitle.fontWeight as any,
        lineHeight: theme.typography.mobileTitle.lineHeight,
      };
    case 'lg':
      return {
        fontSize: 32,
        fontWeight: '700' as const,
        lineHeight: 38,
      };
    case 'md':
    default:
      return {
        fontSize: 24,
        fontWeight: '700' as const,
        lineHeight: 30,
      };
  }
}

export function StatCard({
  label,
  value,
  subtitle,
  icon,
  variant = 'plain',
  size = 'md',
  accentColor,
  onPress,
  accessibilityLabel,
  testID,
  style,
}: StatCardProps) {
  const { colors } = useAppTheme();
  const pressedStyle = usePressedStyle();
  const accent = accentColor ?? colors.brand;
  const isAccent = variant === 'accent';
  const isOutline = variant === 'outline';

  const pad = size === 'lg' ? 20 : size === 'sm' ? 12 : 16;
  const gapBetweenLabelAndValue = size === 'lg' ? 12 : 8;
  const gapBetweenValueAndSubtitle = 4;

  const valueTypo = valueStyleFor(size);

  const surfaceStyle: ViewStyle = useMemo(() => {
    if (isAccent) {
      return {
        backgroundColor: colors.brandSoft,
        borderWidth: 0,
      };
    }
    if (isOutline) {
      return {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border,
      };
    }
    return {
      backgroundColor: colors.card,
      borderWidth: 0,
    };
  }, [isAccent, isOutline, colors.brandSoft, colors.card, colors.border]);

  const labelColor = isAccent ? accent : colors.textSecondary;
  const valueColor = isAccent ? accent : colors.text;
  const subtitleColor = colors.textMuted;

  const composedLabel =
    accessibilityLabel ?? `${label}: ${value}${subtitle ? ', ' + subtitle : ''}`;

  const inner = (
    <View style={[styles.inner, { padding: pad }]}>
      <View style={styles.labelRow}>
        {icon ? (
          <View style={styles.iconSlot} accessibilityElementsHidden>
            {icon}
          </View>
        ) : null}
        <Text
          style={[LABEL_STYLE, { color: labelColor, flexShrink: 1 }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <Text
        style={[valueTypo, { color: valueColor, marginTop: gapBetweenLabelAndValue }]}
        numberOfLines={1}
      >
        {value}
      </Text>
      {subtitle ? (
        <Text
          style={[
            { fontSize: 13, fontWeight: '400', lineHeight: 18 },
            { color: subtitleColor, marginTop: gapBetweenValueAndSubtitle },
          ]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={composedLabel}
        style={({ pressed }) => [styles.shell, surfaceStyle, pressed && pressedStyle, style]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={composedLabel}
      style={[styles.shell, surfaceStyle, style]}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  inner: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default StatCard;

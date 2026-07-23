// components/MobilePremium/MobileSectionEyebrow.tsx
// Small tracked-out caps label that leads a section inside a MobileSurface.
// The canonical mobile pattern: every surface opens with one of these —
// "ACCOUNT", "PRIVACY", "RECENT ACTIVITY" — so the eyebrow replaces
// a full title row without spending vertical budget.
//
// Default `flush={true}` matches the common case — the eyebrow sits flush
// with the surface's top padding. Pass `flush={false}` when the eyebrow
// leads a flat section on atmosphere (no surface), so it gets the default
// 24px top margin.

import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { theme } from '../../constants';
import { useAppTheme } from '../../context';

export interface MobileSectionEyebrowProps {
  /** Uppercase label text (string) or JSX. */
  children: React.ReactNode;
  /** Override the text color (defaults to textMuted). */
  color?: string;
  /**
   * Whether to drop the top margin so the label sits flush with the
   * surface's top padding. Default `true` (the common case). Pass `false`
   * when the eyebrow leads a flat section on atmosphere instead of inside
   * a surface.
   */
  flush?: boolean;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

const EYEBROW_STYLE = {
  fontSize: theme.typography.mobileEyebrow.fontSize,
  fontWeight: theme.typography.mobileEyebrow.fontWeight as any,
  lineHeight: theme.typography.mobileEyebrow.lineHeight,
  letterSpacing: theme.typography.mobileEyebrow.letterSpacing,
} as const;

/**
 * Small uppercase label that leads a section. Children can be a string
 * (auto-uppercased) or JSX (rendered as-is).
 */
export function MobileSectionEyebrow({
  children,
  color,
  flush = true,
  style,
  testID,
}: MobileSectionEyebrowProps) {
  const { colors } = useAppTheme();
  return (
    <Text
      testID={testID}
      style={[
        EYEBROW_STYLE,
        styles.eyebrow,
        flush ? styles.eyebrowFlush : null,
        { color: color ?? colors.textMuted },
        style,
      ]}
    >
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Text>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
  },
  eyebrowFlush: {
    marginTop: 0,
  },
});

export default MobileSectionEyebrow;

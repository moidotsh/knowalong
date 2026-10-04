// components/MobilePremium/MobileSectionEyebrow.tsx
// Small tracked-out caps label that leads a section. Two reads:
//
//   • Inside a surface (default) — the eyebrow sits flush with the
//     surface's top padding: "ACCOUNT", "PRIVACY", "RECENT ACTIVITY".
//
//   • On paper with `rule` — the logbook table header: the eyebrow
//     followed by a hairline, content rows beneath. Sections on the
//     page are typographic blocks, not cards, and the ruled eyebrow is
//     their one piece of structure.
//
// Default `flush={true}` matches the in-surface case. Pass `flush={false}`
// when the eyebrow leads a flat section on atmosphere (no surface), so
// it gets the default 24px top margin — the section separation of the
// rhythm law.

import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { theme } from '../../constants';
import { useAppTheme } from '../../context';

export interface MobileSectionEyebrowProps {
  /** Uppercase label text (string) or JSX. */
  children: React.ReactNode;
  /** Override the text color (defaults to textMuted). */
  color?: string;
  /**
   * Render a hairline rule under the label — the logbook table-header
   * read for sections on paper. Default false.
   */
  rule?: boolean;
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

const EYEBROW_STYLE = theme.typography.mobileEyebrow;

/**
 * Small uppercase label that leads a section. Children can be a string
 * (auto-uppercased) or JSX (rendered as-is).
 */
export function MobileSectionEyebrow({
  children,
  color,
  rule = false,
  flush = true,
  style,
  testID,
}: MobileSectionEyebrowProps) {
  const { colors } = useAppTheme();

  const label = (
    <Text
      testID={testID}
      // The page's heading semantics: screens lead their sections with
      // eyebrows and nothing else declares header roles, so screen-reader
      // users jump eyebrow-to-eyebrow the way sighted users scan them.
      accessibilityRole="header"
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

  if (!rule) return label;

  return (
    <View style={flush ? null : styles.ruledWrap}>
      {label}
      <View style={[styles.rule, { backgroundColor: colors.mobilePremium.hairlineBorder }]} />
    </View>
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
  ruledWrap: {
    marginTop: 24,
  },
  rule: {
    height: 1,
    marginTop: 8,
    marginBottom: 4,
  },
});

export default MobileSectionEyebrow;

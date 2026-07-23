// components/MobilePremium/MobileActionFooter.tsx
// Sticky bottom action area for the mobile premium kit.
//
// Footer budget: 76-92px total (including safe-area bottom inset on
// notched devices). This is a load-bearing constraint — the 490px test
// depends on the footer staying compact.
//
// Two usage modes:
//
//   • Structured mode (preferred for new screens): pass a `primary` config
//     object plus optional `secondaryLabel`/`onSecondary` and `progressText`.
//     Renders the standard footer composition with a hairline separator.
//
//   • Children mode (backward-compat): pass children directly. Renders the
//     legacy transparent footer.
//
// The footer is sticky, not fixed — it sits at the bottom of the screen
// flex layout. The parent screen should use a column flex with the footer
// as the last child.

import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePressedStyle } from '../premium/shared';
import { theme, MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';
import { useAppTheme } from '../../context';
import { MobilePrimaryButton, type MobilePrimaryButtonProps } from './MobilePrimaryButton';

export interface MobileActionFooterProps {
  /** Structured primary action configuration. Triggers structured mode. */
  primary?: MobilePrimaryButtonProps;
  /** Optional secondary control rendered as a text button above the primary. */
  secondaryLabel?: string;
  /** Handler for the secondary control. */
  onSecondary?: () => void;
  /** Optional progress text (e.g. "Step 2 of 5"). Sits below the primary. */
  progressText?: string;
  /** Accent color passed through to the primary + secondary. */
  accentColor?: string;
  /** Children — rendered as-is. Triggers children mode (legacy). */
  children?: React.ReactNode;
  /** Disable the bottom safe-area inset (rare — for footers inside scrollable content). */
  disableSafeArea?: boolean;
  /** Test ID. */
  testID?: string;
  /** Outer style pass-through. */
  style?: StyleProp<ViewStyle>;
}

const PROGRESS_STYLE = {
  fontSize: theme.typography.mobileEyebrow.fontSize,
  fontWeight: theme.typography.mobileEyebrow.fontWeight as any,
  lineHeight: theme.typography.mobileEyebrow.lineHeight,
  letterSpacing: theme.typography.mobileEyebrow.letterSpacing,
} as const;

/**
 * Sticky bottom action footer. Two modes (see file header). Structured
 * mode is preferred — it carries the standard footer composition
 * (hairline separator + optional secondary text + primary button + optional
 * progress text) and stays consistent across screens.
 */
export function MobileActionFooter({
  primary,
  secondaryLabel,
  onSecondary,
  progressText,
  accentColor,
  children,
  disableSafeArea = false,
  testID,
  style,
}: MobileActionFooterProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const pressedStyle = usePressedStyle();

  // Safe-area bottom inset. iOS notched devices use ~34px, others use ~16px.
  // On web, the inset is 0 — the footer adds its own bottom padding.
  const safeBottom = Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 16;

  // Children mode (legacy transparent footer).
  if (primary == null) {
    return (
      <View
        testID={testID}
        style={[
          styles.legacyContainer,
          !disableSafeArea ? { paddingBottom: Math.max(insets.bottom, 16) } : null,
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // Structured mode.
  return (
    <View
      testID={testID}
      style={[
        styles.container,
        { paddingBottom: safeBottom, borderTopColor: colors.mobilePremium.hairlineBorder },
        style,
      ]}
    >
      {secondaryLabel && onSecondary ? (
        <Pressable
          onPress={onSecondary}
          hitSlop={8}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? pressedStyle : null,
          ]}
        >
          <Text style={[styles.secondaryText, { color: accentColor ?? colors.brand }]}>
            {secondaryLabel}
          </Text>
        </Pressable>
      ) : null}

      <MobilePrimaryButton {...primary} accentColor={accentColor ?? primary.accentColor} />

      {progressText ? (
        <Text
          style={[
            PROGRESS_STYLE,
            { color: colors.textColors.tertiary, textAlign: 'center', marginTop: 10 },
          ]}
        >
          {progressText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Structured mode ──────────────────────────────────────────────────
  container: {
    ...MOBILE_CONTENT_WIDTH_STYLE,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    // Subtle separator from the content above — keeps the footer feeling
    // anchored without adding visual weight.
  },
  secondaryButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // ── Children mode (legacy) ───────────────────────────────────────────
  legacyContainer: {
    ...MOBILE_CONTENT_WIDTH_STYLE,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});

export default MobileActionFooter;

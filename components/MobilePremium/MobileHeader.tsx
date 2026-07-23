// components/MobilePremium/MobileHeader.tsx
// Header for the mobile premium kit. Two modes:
//
//   • Nav mode (default when onBack/onDismiss is provided): a compact 44px
//     top navigation bar — back chevron, accent dot, inline title, dismiss X.
//     The page headline lives in the content area, NOT here. This pattern
//     preserves the 490px height budget.
//
//   • Page mode (when only title/eyebrow/subtitle provided): a taller page
//     header with eyebrow + title + subtitle. Backward-compat for arqavellum's
//     existing screens; new screens should prefer nav mode + a content-area
//     headline.
//
// Layout (nav mode, left → right):
//
//   [back chevron]   [accent dot]   [title]   ...   [navRightAction?]   [dismiss X]
//
// `navRightAction` is the slot for the shell-level "Copy for AI" dev helper
// and similar small, header-resident actions. It renders BEFORE the dismiss
// X so the dismiss corner stays stable; pass it via the new prop rather
// than reaching for `onDismiss` semantics. Both are optional and
// independent — `navRightAction` works whether or not `onDismiss` is set.
//
// The accent mark is a small dot. The nav-mode title uses a compact 15/600
// rhythm — distinct from the page headline (typography.mobileTitle, 22/600),
// which lives in the content area.

import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronLeft, X } from '@tamagui/lucide-icons-2';
import { theme, MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';
import { useAppTheme } from '../../context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePressedStyle } from '../premium/shared';

export interface MobileHeaderProps {
  /** Optional back chevron handler. Triggers nav mode when provided. */
  onBack?: () => void;
  /** Optional dismiss (X) handler. Triggers nav mode when provided. */
  onDismiss?: () => void;
  /** Title — compact inline (nav mode) or page headline (page mode). */
  title?: string;
  /** Optional eyebrow (page mode only — small tracked-out caps above title). */
  eyebrow?: string;
  /** Optional subtitle (page mode only — secondary line below title). */
  subtitle?: string;
  /** Accent color for the dot (default theme brand). */
  accentColor?: string;
  /** Hide the accent dot (default false; nav mode only). */
  hideAccentDot?: boolean;
  /** Optional left action slot (page mode only). Use onBack for nav mode. */
  leftAction?: React.ReactNode;
  /** Optional right action slot (page mode only). Use onDismiss for nav mode. */
  rightAction?: React.ReactNode;
  /**
   * Optional action slot rendered in nav mode, immediately before the
   * dismiss X (or alone when onDismiss is absent). Use this for the
   * shell-level "Copy for AI" dev helper and similar small header
   * actions. Independent of `onDismiss`.
   */
  navRightAction?: React.ReactNode;
  /** Test ID. */
  testID?: string;
  /** Outer style pass-through. */
  style?: StyleProp<ViewStyle>;
}

const NAV_TITLE_STYLE = {
  fontSize: 15,
  fontWeight: '600',
  lineHeight: 20,
  letterSpacing: 0.1,
} as const;

/**
 * Mobile header — two modes (see file header). Nav mode is the recommended
 * compact pattern; page mode is preserved for screens that need a taller
 * headline treatment.
 */
export function MobileHeader({
  onBack,
  onDismiss,
  title,
  eyebrow,
  subtitle,
  accentColor,
  hideAccentDot = false,
  leftAction,
  rightAction,
  navRightAction,
  testID,
  style,
}: MobileHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const accent = accentColor ?? colors.buttonBackground;
  const pressedStyle = usePressedStyle();

  const isNavMode = onBack != null || onDismiss != null;

  if (isNavMode) {
    return (
      <View
        testID={testID}
        style={[styles.navContainer, { paddingTop: insets.top }, style]}
      >
        <View style={styles.navRow}>
          <View style={styles.navLeft}>
            {onBack ? (
              <Pressable
                onPress={onBack}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed ? pressedStyle : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <ChevronLeft size={22} color={colors.text} />
              </Pressable>
            ) : null}

            {!hideAccentDot ? (
              <View style={[styles.accentDot, { backgroundColor: accent }]} />
            ) : null}

            {title ? (
              <Text style={[NAV_TITLE_STYLE, { color: colors.text }]} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
          </View>

          <View style={styles.navRight}>
            {navRightAction ? <View style={styles.navRightAction}>{navRightAction}</View> : null}
            {onDismiss ? (
              <Pressable
                onPress={onDismiss}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed ? pressedStyle : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
              >
                <X size={20} color={colors.textColors.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  // Page mode — eyebrow + title + subtitle + optional left/right action
  // slots. The screen root adds the safe-area top inset.
  return (
    <View testID={testID} style={[styles.pageContainer, { paddingTop: insets.top + 8 }, style]}>
      {leftAction != null || rightAction != null ? (
        <View style={styles.pageActionsRow}>
          <View style={styles.pageActionSlot}>{leftAction}</View>
          <View style={styles.pageActionSlot}>{rightAction}</View>
        </View>
      ) : null}
      {eyebrow ? (
        <Text
          style={[
            styles.pageEyebrow,
            theme.typography.mobileEyebrow,
            { color: colors.textMuted },
          ]}
        >
          {eyebrow.toUpperCase()}
        </Text>
      ) : null}
      {title ? (
        <Text
          style={[styles.pageTitle, theme.typography.mobileTitle, { color: colors.text }]}
        >
          {title}
        </Text>
      ) : null}
      {subtitle ? (
        <Text
          style={[
            styles.pageSubtitle,
            theme.typography.mobileSubtitle,
            { color: colors.textSecondary },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Nav mode ─────────────────────────────────────────────────────────
  navContainer: {
    ...MOBILE_CONTENT_WIDTH_STYLE,
    paddingHorizontal: 8,
  },
  navRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navRightAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },

  // ── Page mode ────────────────────────────────────────────────────────
  pageContainer: {
    ...MOBILE_CONTENT_WIDTH_STYLE,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  pageActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 36,
    marginBottom: 8,
  },
  pageActionSlot: {
    minWidth: 36,
  },
  pageEyebrow: {
    marginBottom: 4,
  },
  pageTitle: {
    marginBottom: 4,
  },
  pageSubtitle: {},
});

export default MobileHeader;

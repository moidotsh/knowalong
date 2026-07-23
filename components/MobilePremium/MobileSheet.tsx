// components/MobilePremium/MobileSheet.tsx
// Generic bottom- or top-anchored sheet. Hosts arbitrary children inside a
// MobileSurface-style rounded panel that slides in from the chosen edge.
//
// c2-exempt: this is the canonical kit sheet — RN Modal is the point. A
// sheet MUST portal to the OS level or it gets clipped by ancestor surfaces
// (MobileSurface has `overflow: 'hidden'` + borderRadius, host ScrollViews
// swallow absolute positioning). The same load-bearing reason as MobileDialog
// and MobileSelect. See `scripts/audit-component-quality.ts` C2_EXEMPT_FILES.
//
// API shape mirrors MobileDialog's: `open` / `onOpenChange` are the canonical
// pair. Backdrop tap and X close affordances are configurable; both default
// to enabled when there is no title, but the caller can override either.
//
// The handle bar is a visual affordance only (decorative for screen readers).
// The header (when `title` is set) carries an optional close button.

import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { X } from '@tamagui/lucide-icons-2';
import { isWeb } from '../../utils';
import { MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';
import { useAppTheme } from '../../context';

export interface MobileSheetProps {
  /** Whether the sheet is visible. */
  open?: boolean;
  /** Open-change handler. Called with `false` on any close gesture. */
  onOpenChange?: (open: boolean) => void;
  /** Anchor edge. Default 'bottom'. */
  anchor?: 'bottom' | 'top';
  /** Optional header title. Renders a compact header with a close button when set. */
  title?: string;
  /** Show the drag handle bar. Default true. */
  showHandle?: boolean;
  /** Close when the backdrop is tapped. Default true. */
  closeOnBackdropTap?: boolean;
  /** Show the X dismiss button in the header. Default true when `title` is set. */
  showCloseButton?: boolean;
  /** Sheet body. */
  children: React.ReactNode;
  /** Accent color (default theme brand). */
  accentColor?: string;
  /** Test ID. */
  testID?: string;
  /** Outer style pass-through (applied to the sheet panel). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Canonical bottom/top sheet. Renders inside a react-native `Modal` portal
 * so it escapes any host ScrollView / transform / clipping context.
 *
 * Touch routing: the backdrop Pressable sits below the sheet panel. The
 * sheet captures its own taps (stopPropagation) so taps inside the sheet
 * never bubble out to the backdrop.
 */
export function MobileSheet({
  open,
  onOpenChange,
  anchor = 'bottom',
  title,
  showHandle = true,
  closeOnBackdropTap = true,
  showCloseButton,
  children,
  accentColor,
  testID,
  style,
}: MobileSheetProps) {
  const { colors } = useAppTheme();
  const accent = accentColor ?? colors.brand;
  const resolvedShowClose = showCloseButton ?? !!title;

  const handleClose = () => onOpenChange?.(false);

  // Escape-to-close on web, gated by closeOnBackdropTap.
  useEffect(() => {
    if (!isWeb || !open || !closeOnBackdropTap) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWeb, open, closeOnBackdropTap]);

  if (!open) return null;

  const isBottom = anchor === 'bottom';

  return (
    <Modal
      testID={testID}
      visible={open}
      transparent
      animationType={isBottom ? 'slide' : 'fade'}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable
        style={[
          styles.scrim,
          isBottom ? styles.scrimBottom : styles.scrimTop,
        ]}
        onPress={closeOnBackdropTap ? handleClose : undefined}
        accessibilityRole={closeOnBackdropTap ? 'button' : undefined}
        accessibilityLabel={closeOnBackdropTap ? 'Close sheet' : undefined}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            isBottom ? styles.sheetBottom : styles.sheetTop,
            { backgroundColor: colors.card },
            style,
          ]}
        >
          {showHandle ? (
            <View
              style={[styles.handleBar, { backgroundColor: colors.mobilePremium.hairlineBorder }]}
              accessibilityElementsHidden
            />
          ) : null}

          {title ? (
            <View style={styles.header}>
              <View style={[styles.headerAccent, { backgroundColor: accent }]} />
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                {title}
              </Text>
              {resolvedShowClose ? (
                <Pressable
                  onPress={handleClose}
                  hitSlop={8}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close sheet"
                >
                  <X size={20} color={colors.textColors.muted} />
                </Pressable>
              ) : (
                <View style={styles.closeButtonPlaceholder} />
              )}
            </View>
          ) : null}

          <View style={styles.body}>{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scrimBottom: {
    justifyContent: 'flex-end',
  },
  scrimTop: {
    justifyContent: 'flex-start',
  },
  // Policy spread lands on the visible sheet panel — NOT on the Modal
  // root or the backdrop Pressable. SB2 (audit-mobile-content-width.ts)
  // verifies this exact shape: the portal panel must carry the policy
  // style so the centered mobile column survives the portal escape.
  sheet: {
    padding: 16,
    ...MOBILE_CONTENT_WIDTH_STYLE,
  },
  sheetBottom: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '85%',
  },
  sheetTop: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    maxHeight: '85%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  headerAccent: {
    width: 3,
    height: 16,
    borderRadius: 1.5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonPlaceholder: {
    width: 28,
    height: 28,
  },
  body: {
    width: '100%',
  },
});

export default MobileSheet;

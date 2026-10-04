// components/MobilePremium/MobileHomeHeader.tsx
// Home-screen header. A row with the brand on the same line as the menu
// trigger (left slot) and an optional right action, followed by an optional
// normal-case subtitle. Distinct from MobileHeader — which is built for
// nav-mode (compact 44px chrome with back chevron) or page-mode (eyebrow
// tracked-caps above title). Home flips the order: brand on top, normal-case
// subtitle below, no eyebrow, and a single 36px-tall row that hosts the
// hamburger alongside the brand so the brand shares its row with the
// trigger rather than sitting below it.
//
// The shell owns layout + typography. The hamburger trigger and any right
// action stay consumer-supplied via the menuButton / rightAction React
// slots — the primitive carries no domain code. The optional
// drawerGlassCap slot hosts a MobileNavDrawerGlassCap so the cutout nav
// pattern composes without the consumer hand-positioning anything.

import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';
import { useAppTheme } from '../../context';
import { isWeb } from '../../utils';

export interface MobileHomeHeaderProps {
  /** Brand text (the app name). Required. */
  brand: string;
  /** Optional normal-case subtitle below the brand (e.g. "Welcome back, koba"). */
  subtitle?: string;
  /** Optional left-side slot (typically the hamburger / menu trigger). */
  menuButton?: React.ReactNode;
  /** Optional right-side slot (avatar, notifications). */
  rightAction?: React.ReactNode;
  /**
   * Optional tap handler for the brand text. Consumers use this for
   * brand-gesture affordances (e.g. a hidden feature toggle on repeated
   * taps). When omitted the brand renders as plain text.
   */
  onBrandPress?: () => void;
  /**
   * Optional glass-cap layer rendered behind the brand row at the top of
   * the header — pass `<MobileNavDrawerGlassCap open={drawerOpen} />` to
   * complete the cutout drawer pattern. Absolutely positioned; the brand
   * row stacks above it via DOM order.
   */
  drawerGlassCap?: React.ReactNode;
  /**
   * The masthead rides the ink plate. While the cutout ink drawer is
   * open, pass `onPlate` to stack this row ABOVE the drawer overlay (the
   * plate runs the panel's full height underneath) and bleed the type to
   * the background color — the real header persisting in place over the
   * plate, never a duplicate. The on-plate masthead is the poster stamp:
   * brand + trigger only — the subtitle and the right-side chrome go
   * INVISIBLE (never unmounted: the page behind the drawer must not
   * shift) and untouchable, so nothing straddles the plate's edge or
   * cuts across its rule. Web crossfades the color on the drawer's
   * out-cubic so the bleed reads as the plate arriving.
   */
  onPlate?: boolean;
  /**
   * Optional text color override for brand + subtitle. Hosts that
   * float this header over animated content (an absorbing top bar —
   * a pinned strip whose colour fills rise over the row) pass the
   * readable companion while a fill owns the row; omit for the
   * resting ink. `onPlate` keeps its own bleed — the drawer's plate
   * outranks whatever moves under the bar.
   */
  textColorOverride?: string;
  /** Test ID. */
  testID?: string;
  /** Outer style pass-through. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Home header — brand + menuButton on one row, optional normal-case
 * subtitle below. Shell-level: passes through React slots for the trigger
 * and the right action so the primitive carries no domain code.
 */
// The wordmark read: the display face at poster weight, compact. A
// dedicated in-component style (the NAV_TITLE_STYLE precedent in
// MobileHeader) — the masthead is chrome with its own rhythm, not a
// content title, so it does not ride mobileTitle.
const BRAND_STYLE: TextStyle = {
  fontSize: 20,
  fontWeight: '800',
  lineHeight: 24,
  letterSpacing: -0.3,
  fontFamily: theme.fonts.display,
} as const;

export function MobileHomeHeader({
  brand,
  subtitle,
  menuButton,
  rightAction,
  drawerGlassCap,
  onBrandPress,
  onPlate,
  textColorOverride,
  testID,
  style,
}: MobileHomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const brandColor = onPlate
    ? colors.background
    : (textColorOverride ?? colors.text);
  // The ink drawer's out-cubic — the type bleeds on the slide's curve.
  // Web-only CSS; RN's TextStyle doesn't declare it (same cast the boot
  // gradients and InkPanel grain use).
  const colorBleed = (isWeb
    ? { transition: 'color 300ms cubic-bezier(0.215, 0.61, 0.355, 1)' }
    : null) as unknown as TextStyle;

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        { paddingTop: insets.top + 8 },
        onPlate ? styles.onPlate : null,
        style,
      ]}
    >
      {drawerGlassCap ? drawerGlassCap : null}
      <View style={styles.row}>
        {menuButton ? <View style={styles.slot}>{menuButton}</View> : null}
        {onBrandPress ? (
          <Pressable
            onPress={onBrandPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={brand}
          >
            <Text
              style={[BRAND_STYLE, { color: brandColor }, colorBleed]}
              numberOfLines={1}
            >
              {brand}
            </Text>
          </Pressable>
        ) : (
          <Text
            style={[BRAND_STYLE, { color: brandColor }, colorBleed]}
            numberOfLines={1}
          >
            {brand}
          </Text>
        )}
        <View style={styles.flexSpacer} />
        {/* Right-side chrome goes invisible, not away — unmounting would
            shift the page behind the drawer. Hidden also means
            untouchable: no ghost tap targets over the plate. */}
        <View
          style={[styles.slot, onPlate ? styles.hidden : null]}
          pointerEvents={onPlate ? 'none' : 'auto'}
        >
          {rightAction}
        </View>
      </View>
      {/* The subtitle holds its space on the plate (invisible — the page
          behind the drawer must not shift) and returns with the page. */}
      {subtitle ? (
        <Text
          style={[
            theme.typography.mobileSubtitle,
            {
              color: onPlate
                ? colors.background
                : (textColorOverride ?? colors.textSecondary),
              marginTop: 4,
              opacity: onPlate ? 0 : 1,
            },
            colorBleed,
          ]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...MOBILE_CONTENT_WIDTH_STYLE,
    // Relative so the drawerGlassCap slot's absolute positioning anchors
    // to the header column, not the page.
    position: 'relative',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  // On-plate masthead: above the drawer overlay (its scrim/panel ride at
  // zIndex 100) so the persisting header reads over the ink plate.
  onPlate: {
    zIndex: 110,
  },
  // Space-holding invisible (never unmounted — layout must not shift).
  hidden: {
    opacity: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    gap: 10,
  },
  slot: {
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexSpacer: {
    flex: 1,
  },
});

export default MobileHomeHeader;

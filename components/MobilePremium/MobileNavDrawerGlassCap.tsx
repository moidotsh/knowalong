// components/MobilePremium/MobileNavDrawerGlassCap.tsx
// Glass cap for MobileNavDrawer's 'cutout' brand-persistence mode. Rendered
// by the consumer's home header (via MobileHomeHeader's drawerGlassCap slot)
// over the same screen region as the drawer panel's transparent cutout, so
// the brand + hamburger/X read as sitting on one continuous glass surface
// while the drawer is open.
//
// Why the cap lives in the header and not the drawer: the drawer's overlay
// is pinned to the window, but the header is the coordinate frame the brand
// actually occupies — and the brand must stack ABOVE the cap (later DOM
// sibling) so it stays crisp and tappable. The cap crossfades in AND slides
// with the panel (same 300ms iOS-sheet curve) so it never appears detached
// from the drawer body. pointerEvents: 'none' lets taps reach the
// hamburger/X behind it.
//
// The cap replicates the drawer scrim's surface treatment — backgroundDeep
// at scrim alpha + backdrop blur + a right hairline — using the header's own
// backdrop as the blur source. On Android Chrome (which renders saturate()
// poorly) it swaps to the milder blur token at higher opacity, mirroring the
// drawer scrim's fallback.

import React from 'react';
import { StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_LAYOUT } from '../../constants';
import { useAppTheme } from '../../context';
import { useAndroidChromeBlurFix, useReducedMotion } from '../../hooks';
import { isWeb } from '../../utils';
import { NAV_DRAWER_WIDTH } from './MobileNavDrawer';

export interface MobileNavDrawerGlassCapProps {
  /** Whether the drawer is open. Drives the crossfade + slide. */
  open: boolean;
  /**
   * Cutout height. Defaults to the drawer's default cutout (safe-area top +
   * 44 for the brand row). Pass the same value you pass the drawer's
   * `cutoutHeight` when it is overridden.
   */
  height?: number;
  /** Panel width. Defaults to the drawer's panel width. */
  width?: number;
  /**
   * Anchor mode — must match the drawer's `anchor` prop so the cap slides to
   * the same resting x as the panel. Defaults to APP_LAYOUT.navDrawerAnchor.
   */
  anchor?: 'window' | 'column';
  /**
   * Centered column width the 'column' anchor computes against. Defaults to
   * 420 (matches the body maxWidth on every MobilePremium screen).
   */
  columnWidth?: number;
  /** Test ID. */
  testID?: string;
}

/**
 * Glass cap over the nav drawer's brand cutout. Slides and crossfades with
 * the drawer panel using the same easing so the cutout reads as part of the
 * drawer surface. Shell-level: reads only theme tokens + layout config.
 */
export function MobileNavDrawerGlassCap({
  open,
  height,
  width = NAV_DRAWER_WIDTH,
  anchor = APP_LAYOUT.navDrawerAnchor,
  columnWidth = 420,
  testID,
}: MobileNavDrawerGlassCapProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { isAndroidChrome } = useAndroidChromeBlurFix();
  const { width: windowWidth } = useWindowDimensions();

  // Mirrors MobileNavDrawer's default cutout height (safe-area top + 8
  // padding + 36 brand row).
  const capHeight = height ?? insets.top + 44;

  // The cap renders inside the centered content column (MobileHomeHeader),
  // so 'column' anchor lands at left: 0 — the column's left edge is the
  // panel's resting x. 'window' anchor must offset left by the same margin
  // so the cap reaches x=0 of the window on wide viewports.
  const columnLeft = Math.max(0, (windowWidth - columnWidth) / 2);
  const left = anchor === 'window' ? -columnLeft : 0;

  const duration = reduced ? 0 : 300;
  const easing = 'cubic-bezier(0.32, 0.72, 0, 1)';

  return (
    <View
      testID={testID}
      pointerEvents="none"
      style={[
        styles.cap,
        {
          width,
          height: capHeight,
          left,
          backgroundColor: `${colors.backgroundDeep}${isAndroidChrome ? 'f2' : 'cc'}`,
          opacity: open ? 1 : 0,
          transform: [{ translateX: open ? 0 : -width }],
        },
        // Web-only transition + backdrop-filter props are not in RN's
        // ViewStyle types; RN Web's runtime accepts them (mirrors CSS).
        // Same conditional-spread pattern as MobileNavDrawer.
        ...(isWeb
          ? [
              {
                transition: `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`,
                backdropFilter: isAndroidChrome
                  ? colors.mobilePremium.androidChromeSurfaceBlur
                  : colors.mobilePremium.surfaceBackdropBlur,
                WebkitBackdropFilter: isAndroidChrome
                  ? colors.mobilePremium.androidChromeSurfaceBlur
                  : colors.mobilePremium.surfaceBackdropBlur,
                borderRightWidth: 1,
                borderRightColor: colors.mobilePremium.hairlineBorder,
              } as unknown as ViewStyle,
            ]
          : []),
      ]}
    />
  );
}

const styles = StyleSheet.create({
  cap: {
    position: 'absolute',
    top: 0,
  },
});

export default MobileNavDrawerGlassCap;

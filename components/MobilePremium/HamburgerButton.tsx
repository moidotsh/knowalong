// components/MobilePremium/HamburgerButton.tsx
// MobileHomeHeader.menuButton trigger that opens the nav drawer. Swaps
// between Menu and X icons based on isOpen with a coordinated crossfade —
// Menu rotates 0→90° clockwise as it fades out; X rotates -90°→0° as it
// fades in. Both transitions land together over 200ms, so the swap reads as
// a mechanical transformation rather than a fade, and it stays coordinated
// with the drawer's slide underneath.
//
// Pairs with MobileNavDrawer in 'cutout' brand-persistence mode: the
// hamburger stays at the same x/y while the drawer slides in, so swapping
// it to X in place gives the user a stable close control over the brand
// cutout. Shell-level: no domain code, reads only theme tokens.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Menu, X } from '@tamagui/lucide-icons-2';
import { useAppTheme } from '../../context';
import { isWeb } from '../../utils';

export interface HamburgerButtonProps {
  /** Tap handler — typically `() => setDrawerOpen((prev) => !prev)`. */
  onPress: () => void;
  /** Whether the drawer is currently open. Drives the icon crossfade. */
  isOpen?: boolean;
  /**
   * Icon color override. Defaults to text. Pass the background color
   * while the drawer's ink plate rides under the header (MobileHomeHeader
   * `onPlate`) so the close X reads on the plate.
   */
  color?: string;
  /** Localized a11y label for the open state (consumers shipping non-English). */
  openLabel?: string;
  /** Localized a11y label for the close state. */
  closeLabel?: string;
  /** Test ID. */
  testID?: string;
}

export function HamburgerButton({
  onPress,
  isOpen = false,
  color,
  openLabel = 'Open menu',
  closeLabel = 'Close menu',
  testID,
}: HamburgerButtonProps) {
  const { colors } = useAppTheme();
  const iconColor = color ?? colors.text;
  // Rotation + opacity crossfade. The transition props are web-only and not
  // in RN's ViewStyle types, so they go through a conditional spread rather
  // than typed keys.
  const transitionProp = isWeb
    ? { transition: 'opacity 200ms ease, transform 200ms ease' }
    : null;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={isOpen ? closeLabel : openLabel}
      style={({ pressed }) => [styles.button, pressed ? { opacity: 0.6 } : null]}
    >
      <View style={styles.iconBox}>
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.iconLayer,
            {
              opacity: isOpen ? 0 : 1,
              transform: `rotate(${isOpen ? 90 : 0}deg)`,
              ...transitionProp,
            },
          ]}
        >
          <Menu size={22} color={iconColor} />
        </View>
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.iconLayer,
            {
              opacity: isOpen ? 1 : 0,
              transform: `rotate(${isOpen ? 0 : -90}deg)`,
              ...transitionProp,
            },
          ]}
        >
          <X size={22} color={iconColor} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    // 44×44 — the touch-target floor. RN-web does NOT expand the DOM
    // hit area for hitSlop (measured: elementFromPoint 2px outside a
    // 36px box misses), so the box itself must clear 44.
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HamburgerButton;

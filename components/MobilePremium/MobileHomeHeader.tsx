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
// slots — the primitive carries no domain code.

import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';
import { useAppTheme } from '../../context';

export interface MobileHomeHeaderProps {
  /** Brand text (the app name). Required. */
  brand: string;
  /** Optional normal-case subtitle below the brand (e.g. "Welcome back, koba"). */
  subtitle?: string;
  /** Optional left-side slot (typically the hamburger / menu trigger). */
  menuButton?: React.ReactNode;
  /** Optional right-side slot (avatar, notifications). */
  rightAction?: React.ReactNode;
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
export function MobileHomeHeader({
  brand,
  subtitle,
  menuButton,
  rightAction,
  testID,
  style,
}: MobileHomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  return (
    <View
      testID={testID}
      style={[styles.container, { paddingTop: insets.top + 8 }, style]}
    >
      <View style={styles.row}>
        {menuButton ? <View style={styles.slot}>{menuButton}</View> : null}
        <Text
          style={[theme.typography.mobileTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {brand}
        </Text>
        <View style={styles.flexSpacer} />
        {rightAction ? <View style={styles.slot}>{rightAction}</View> : null}
      </View>
      {subtitle ? (
        <Text
          style={[
            theme.typography.mobileSubtitle,
            { color: colors.textSecondary, marginTop: 4 },
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
    paddingHorizontal: 20,
    paddingBottom: 8,
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

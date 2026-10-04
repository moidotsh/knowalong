// components/MobilePremium/MobileTabBar.tsx
//
// The kit's bottom chrome: a flat bar with the app's primary verb
// raised at its center — START before a run, RESUME (pulsing) during
// one. Four flanking tabs + the center action = five destinations,
// all in the thumb arc.
//
// The read:
//   • Bar = card surface with a 1px hairline top edge. Flat — no blur,
//     no glow, no floating dock.
//   • Active tab: ink label + a 2px notch centered on the top edge.
//     Inactive: muted. Labels ride the mono face, tracked caps —
//     instrument markings, not iOS tabs.
//   • Center action: a 56px circle raised past the bar top, ink glyph,
//     road-sign contrast. `active` runs the one ambient animation in
//     the system — a 1.6s opacity/scale breath — which collapses to
//     static under reduced motion.
//
// The bar owns no routing: consumers pass onPress callbacks (their
// NavigationHelper). Domain-neutral by construction — the shell ports
// it with the kit.

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion, useAnimatedValue, useLoop } from '../premium/shared';
import { theme, MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';
import { useAppTheme } from '../../context';

export interface MobileTabBarItem {
  /** Route id — compared against `activeId`. */
  id: string;
  /** Short label (≤ 8 chars reads best in mono caps). */
  label: string;
  /** Icon node; color/size are the consumer's choice. */
  icon: React.ReactNode;
  onPress: () => void;
}

export interface MobileTabBarCenterAction {
  /** Accessibility label for the raised action (e.g. "Start run"). */
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  /** Renders the resume pulse. Default false. */
  active?: boolean;
}

export interface MobileTabBarProps {
  /** Exactly four tabs — two left, two right of the center action. */
  items: [MobileTabBarItem, MobileTabBarItem, MobileTabBarItem, MobileTabBarItem];
  activeId?: string;
  centerAction: MobileTabBarCenterAction;
  testID?: string;
}

function TabButton({
  item,
  active,
}: {
  item: MobileTabBarItem;
  active: boolean;
}) {
  const { colors } = useAppTheme();
  const color = active ? colors.text : colors.textMuted;
  return (
    <Pressable
      onPress={item.onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.label} tab`}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.tab, pressed ? { opacity: 0.6 } : null]}
      testID={`tab-bar-${item.id}`}
    >
      <View style={[styles.tabNotch, { backgroundColor: active ? colors.brand : 'transparent' }]} />
      <View style={styles.tabIcon}>{item.icon}</View>
      <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
        {item.label}
      </Text>
    </Pressable>
  );
}

export function MobileTabBar({
  items,
  activeId,
  centerAction,
  testID,
}: MobileTabBarProps) {
  const { colors } = useAppTheme();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [left0, left1, right0, right1] = items;

  // The resume pulse — the one ambient animation in the system. A
  // looping opacity/scale breath on a ring behind the center circle;
  // the loop core never starts it under reduced motion and resets the
  // ring while paused.
  const pulse = useAnimatedValue(0);
  const pulseActive = centerAction.active === true && !reduced;
  useLoop(
    pulse,
    [
      { to: 1, duration: 800 },
      { to: 0, duration: 800 },
    ],
    { paused: !pulseActive, resetTo: 0 },
  );

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View
      testID={testID}
      style={[
        styles.bar,
        MOBILE_CONTENT_WIDTH_STYLE,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.mobilePremium.hairlineBorder,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
      accessibilityRole="tablist"
    >
      <View style={styles.row}>
        <TabButton item={left0} active={activeId === left0.id} />
        <TabButton item={left1} active={activeId === left1.id} />
        <View style={styles.centerSlot}>
          {pulseActive ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseRing,
                {
                  borderColor: colors.brand,
                  opacity: pulseOpacity,
                  transform: [{ scale: pulseScale }],
                },
              ]}
            />
          ) : null}
          <Pressable
            onPress={centerAction.onPress}
            accessibilityRole="button"
            accessibilityLabel={centerAction.label}
            accessibilityState={centerAction.active ? { expanded: true } : undefined}
            style={({ pressed }) => [
              styles.centerButton,
              { backgroundColor: colors.brand },
              pressed ? { opacity: 0.85, transform: [{ scale: 0.96 }] } : null,
            ]}
            testID="tab-bar-center-action"
          >
            {centerAction.icon}
          </Pressable>
          <Text style={[styles.centerLabel, { color: colors.text }]} numberOfLines={1}>
            {centerAction.active ? 'RESUME' : 'START'}
          </Text>
        </View>
        <TabButton item={right0} active={activeId === right0.id} />
        <TabButton item={right1} active={activeId === right1.id} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The bar caps to the mobile column on wide viewports (the same
  // policy as MobileActionFooter); the raised center + pulse ring
  // overflow the top — overflow stays visible.
  bar: {
    borderTopWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 60,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    gap: 3,
  },
  tabNotch: {
    position: 'absolute',
    top: -1,
    width: 18,
    height: 2,
    borderRadius: 1,
  },
  tabIcon: {
    height: 20,
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: theme.fonts.mono,
    letterSpacing: 0.8,
    lineHeight: 12,
  },
  centerSlot: {
    width: 84,
    // Stretch the full row height so the raised button's negative top
    // offsets from the ROW's top edge (a content-height slot would sit
    // at the flex-end bottom and sink the button into the bar).
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  pulseRing: {
    position: 'absolute',
    top: -8,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
  },
  centerButton: {
    position: 'absolute',
    top: -30,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: theme.fonts.mono,
    letterSpacing: 0.8,
    lineHeight: 12,
  },
});

export default MobileTabBar;

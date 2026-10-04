// components/composed/ScreenScaffold.tsx
// The one screen skeleton: atmosphere + a header slot + the policy-
// compliant scrolling body + a centered content column. Screens compose
// this instead of re-stating the same wrappers — the column width,
// paddings, and the SB1 screen-body policy live here only.
//
// Header conventions:
//   • The app's home screen passes its own brand header (`header`).
//   • Every child screen passes `navTitle` (+ `onBack`) — renders a
//     nav-mode MobileHeader (back chevron + accent dot + inline title),
//     the standard child-screen chrome across consumers. The hamburger
//     / drawer lives on the home header only; child screens go back
//     with the chevron.

import React, { useCallback } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../../context';
import { SCREEN_BODY_STYLE, DESKTOP_LAYOUT_MODE } from '../../constants';
import { useCompressFade } from '../premium/shared';
import { MobileAtmosphere, MobileHeader, type MobileAtmosphereSurface } from '../MobilePremium';

interface ScreenScaffoldProps {
  /** Header chrome (the consumer's home header, a detail back row, or nothing). */
  header?: React.ReactNode;
  /** Child-screen title — renders a nav-mode MobileHeader when `header` is absent. */
  navTitle?: string;
  /** Back handler for the nav header's chevron. */
  onBack?: () => void;
  /** Small action slot in the nav header (before the dismiss X, when used). */
  navRightAction?: React.ReactNode;
  /** Atmosphere palette. Default 'analytics'. */
  surface?: MobileAtmosphereSurface;
  /**
   * Content column max width. Default: `bodyMaxWidth` when set, else 640.
   */
  maxWidth?: number;
  /**
   * Lift the screen-body cap for this screen (a real desktop layout:
   * `bodyMaxWidth={1280}`). Undefined keeps the constrained policy cap —
   * the opt-in is per screen and deliberate, not a global mode flip.
   * Honored only while DESKTOP_LAYOUT_MODE is 'multi-column'; shelved
   * call sites stay in the tree inert.
   */
  bodyMaxWidth?: number;
  /**
   * Extra bottom scroll padding. Default 24; raised to FOOTER_INSET when a
   * `footer` mounts (fixed overlay chrome needs clearance) unless already
   * larger.
   */
  paddingBottom?: number;
  /** Fixed overlay chrome rendered after the body (action footers, trays). */
  footer?: React.ReactNode;
  /**
   * The compress bar — a 48px restatement (`title` + optional `figure`)
   * that rides the top of the scroll body: empty while the page's hero
   * statement is on screen, crossfading in as it scrolls away (scroll-
   * linked, transform/opacity only; static at full opacity under
   * reduced motion). The big words hand off to the carried words.
   */
  compact?: { title: string; figure?: React.ReactNode };
  children: React.ReactNode;
}

/** Clearance for a fixed footer's height so the body's tail stays reachable. */
const FOOTER_INSET = 96;

export function ScreenScaffold({
  header,
  navTitle,
  onBack,
  navRightAction,
  surface = 'analytics',
  maxWidth,
  bodyMaxWidth,
  paddingBottom = 24,
  footer,
  compact,
  children,
}: ScreenScaffoldProps) {
  const { colors } = useAppTheme();
  // The compress fade (the shared motion primitive): 0 while the hero
  // is on screen, 1 once it has scrolled past. Static-eligible under
  // reduced motion / off-web — the bar renders its restatement.
  const { compress, handleScroll: fadeScroll, static: fadeStatic } = useCompressFade(!!compact);
  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      fadeScroll(e);
    },
    [fadeScroll],
  );
  // Desktop lifts answer to the repository-level mode: shelved means the
  // constrained mobile column at any viewport width, lift props inert.
  const liftedBodyMaxWidth = DESKTOP_LAYOUT_MODE === 'multi-column' ? bodyMaxWidth : undefined;
  const resolvedMaxWidth = maxWidth ?? liftedBodyMaxWidth ?? 640;
  const resolvedHeader =
    header ??
    (navTitle != null ? (
      <MobileHeader title={navTitle} onBack={onBack} navRightAction={navRightAction} />
    ) : undefined);

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <MobileAtmosphere surface={surface} />
      {resolvedHeader}
      {compact ? (
        <View
          pointerEvents="none"
          style={[styles.compactBar, { borderBottomColor: colors.border }]}
          testID="compact-bar"
        >
          <Animated.Text
            style={[
              styles.compactTitle,
              { color: colors.text },
              fadeStatic ? null : { opacity: compress },
            ]}
            numberOfLines={1}
          >
            {compact.title}
          </Animated.Text>
          {compact.figure ? (
            <Animated.View style={fadeStatic ? null : { opacity: compress }}>
              {compact.figure}
            </Animated.View>
          ) : null}
        </View>
      ) : null}
      <ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={liftedBodyMaxWidth != null ? [SCREEN_BODY_STYLE, { maxWidth: liftedBodyMaxWidth }] : SCREEN_BODY_STYLE}
        contentContainerStyle={{
          paddingBottom: footer ? Math.max(paddingBottom, FOOTER_INSET) : paddingBottom,
        }}
      >
        <View style={[styles.column, { maxWidth: resolvedMaxWidth }]}>{children}</View>
      </ScrollView>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    // iOS 27 LIQUID GLASS GUARD — do NOT remove in code hygiene.
    // iOS 27 applies a system-level frosted-glass effect to the PWA
    // status-bar zone; without this padding every consumer's header
    // content renders under the frosted band (unreadable icons). The
    // 24px clears it on every iPhone; desktop/web is unaffected (the
    // extra air reads as breathing room). Consumers targeting only
    // desktop may zero this without harm.
    paddingTop: 24,
  },
  compactBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  compactTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    flex: 1,
  },
  column: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
});

export default ScreenScaffold;

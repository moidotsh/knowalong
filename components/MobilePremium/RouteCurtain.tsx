// components/MobilePremium/RouteCurtain.tsx
//
// The route curtain — the ink dialect's navigation transition (the
// machinery behind `theme.transition.style = 'curtain'`; retired
// entirely under the starter's 'none' default). Mounted once at the
// root layout above every surface. The move is printed matter, not a
// fade:
//
//   cover   an ink plate (grain, the inverted-surface treatment)
//           sweeps over the outgoing page — the paper chaser trails
//           its leading edge by a 4% beat
//   hold    the platen rule draws across in the brand accent, the
//           eyebrow rises, and the destination stamps on in the
//           display face — a letterpress strike with a slight
//           overshoot
//   reveal  the plate lifts (up when drilling in, down when backing
//           out), rule leading, paper chasing it off — the new page
//           surfaces behind the rising paper edge
//
// Two cover entries share the one choreography:
//   slide — NavigationHelper covers BEFORE navigating (the swap
//           commits under ink; the new route's first painted frame
//           is already covered)
//   snap  — the overlay's own path watch (browser back, URL entry,
//           auth redirects): the render that swaps the route renders
//           the plate already covering, then the same hold + reveal
//
// The stamp/eyebrow faces read `theme.fonts` (display/mono); without a
// declared pair they fall back to heavy platform type, so the curtain
// works for any ink consumer, paired fonts or not.
//
// Reduced motion renders nothing; DOM tests never mount it (the store
// gates orchestration the same way). The panel carries
// data-testid="route-curtain" so screenshot walkers can wait it out.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from '../premium/shared';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isWeb } from '../../utils';
import { theme, EASING } from '../../constants';
import { useAppTheme } from '../../context';
import { usePlatformAnimation } from '../../hooks';
import {
  useRouteTransitionStore,
  routeCurtainCopy,
  COVER_TRAVEL_MS,
  HOLD_MS,
  EXIT_MS,
  type CurtainDirection,
  type CurtainMode,
} from '../../utils/routeTransition';
import { inkSurface } from './grain';

/** The paper chaser trails the ink plate by this fraction of viewport. */
const CHASER_TRAIL = '4%';
/** Extra beat before the chaser starts its exit (the paper follows the ink off). */
const CHASER_EXIT_DELAY_MS = 70;
/** The chaser's exit — shorter than the plate's: it starts late and catches up, so the whole cycle stays under a walker's 900ms settle. */
const CHASER_EXIT_MS = EXIT_MS - 60;

/** Overlay — path watch + store subscription. Renders the panel or the pre-session mask. */
export function RouteCurtain() {
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const phase = useRouteTransitionStore((s) => s.phase);
  const mode = useRouteTransitionStore((s) => s.mode);
  const direction = useRouteTransitionStore((s) => s.direction);
  const session = useRouteTransitionStore((s) => s.session);
  const finishReveal = useRouteTransitionStore((s) => s.finishReveal);
  const beginSnapReveal = useRouteTransitionStore((s) => s.beginSnapReveal);
  const startReveal = useRouteTransitionStore((s) => s.startReveal);

  const { colors } = useAppTheme();
  const copy = routeCurtainCopy(pathname);

  // THE STATUS BAR FOLLOWS THE CURTAIN — while the focus plate covers
  // the screen the PWA system bar reads the curtain's ink; on reveal
  // it returns to the palette's ground. The OS chrome matches the
  // surface it overlays — no mismatched system bar mid-transition.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const target = phase !== 'idle' ? colors.focus.background : colors.backgroundDeep;
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    metas.forEach((m) => m.setAttribute('content', target));
    document.documentElement.style.backgroundColor = target;
    document.body.style.backgroundColor = target;
    return () => {
      metas.forEach((m) => m.setAttribute('content', colors.backgroundDeep));
      document.documentElement.style.backgroundColor = colors.backgroundDeep;
      document.body.style.backgroundColor = colors.backgroundDeep;
    };
  }, [phase, colors.focus.background, colors.backgroundDeep]);

  // Path watch. `settled` starts null: the cold boot settles silently
  // (the curtain never races the first paint). Every later change
  // drives the machine: an in-flight cover confirms arrival; an idle
  // store gets a snap reveal.
  const settled = useRef<string | null>(null);
  const justNavigated = settled.current !== null && settled.current !== pathname;

  useEffect(() => {
    if (settled.current === pathname) return;
    const isFirstSettle = settled.current === null;
    settled.current = pathname;
    if (isFirstSettle) return;
    const s = useRouteTransitionStore.getState();
    if (s.phase === 'covering') {
      s.startReveal();
    } else if (s.phase === 'idle') {
      s.beginSnapReveal('up');
    }
    // 'revealing': the live session re-renders with the new copy —
    // redirect chains keep one continuous curtain.
  }, [pathname]);

  if (!isWeb || reduced) return null;

  const showPanel = phase !== 'idle';
  // Render-phase mask: the commit that swaps the route renders the
  // plate already covering, so the swap itself is never visible —
  // even for navigations the helper didn't intercept.
  const showMask = phase === 'idle' && justNavigated;

  if (!showPanel && !showMask) return null;

  return (
    <View style={styles.layer} pointerEvents="box-none">
      {showMask ? (
        <View
          testID="route-curtain"
          style={[styles.fill, inkSurface(colors.text)]}
          pointerEvents="auto"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : (
        <CurtainPanel
          key={session}
          mode={mode}
          direction={direction}
          copy={copy}
          revealed={phase === 'revealing'}
          onDone={finishReveal}
        />
      )}
    </View>
  );
}

interface CurtainPanelProps {
  mode: CurtainMode;
  direction: CurtainDirection;
  copy: { eyebrow: string; stamp: string };
  /** True once the route swap is confirmed (snap mode: immediately) — the stamp sequence starts here. */
  revealed: boolean;
  onDone: () => void;
}

/** The choreographed plate. Self-timed: entry → hold → exit, then done. */
function CurtainPanel({ mode, direction, copy, revealed, onDone }: CurtainPanelProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { useNativeDriver } = usePlatformAnimation();
  const [exiting, setExiting] = useState(false);

  // A declared display face only renders on the curtain once the fonts
  // are in — a stamp in the fallback face mid-swap reads as a bug, not
  // a strike. Post-boot navigations always pass this gate; without a
  // declared pair (fonts.ready resolves immediately) the fallback is
  // deliberate.
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (typeof document === 'undefined' || document.fonts == null) {
      setFontsReady(true);
      return;
    }
    document.fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // One progress value per layer, phase-mapped through a single
  // interpolation: 0 → 1 is the cover-in, 1 → 2 is the exit. Percent
  // strings keep the plate full-bleed at any viewport.
  const up = direction === 'up';
  const ink = useRef(new Animated.Value(0)).current;
  const chaser = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const eyebrow = useRef(new Animated.Value(0)).current;
  const stamp = useRef(new Animated.Value(0)).current;

  const inkY = ink.interpolate({
    inputRange: [0, 1, 2],
    outputRange: up ? ['100%', '0%', '-100%'] : ['-100%', '0%', '100%'],
  });
  const chaserY = chaser.interpolate({
    inputRange: [0, 1, 2],
    outputRange: up ? [`10${CHASER_TRAIL}`, '0%', '-100%'] : [`-10${CHASER_TRAIL}`, '0%', '100%'],
  });
  const eyebrowY = eyebrow.interpolate({ inputRange: [0, 1], outputRange: [5, 0] });
  const stampY = stamp.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const stampScale = stamp.interpolate({ inputRange: [0, 1], outputRange: [1.14, 1] });
  const stampOpacity = stamp.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] });

  const entryMs = mode === 'snap' ? 0 : COVER_TRAVEL_MS;

  useEffect(() => {
    const timing = (value: Animated.Value, toValue: number, duration: number, delay = 0) =>
      Animated.timing(value, { toValue, duration, delay, easing: EASING.outCubic, useNativeDriver });

    // Cover-in → hold → lift. The plate slides in at near-constant
    // velocity (a print plate, not a UI spring); the exit is thrown —
    // fast off the mark, decelerating away. The paper chaser follows a
    // beat later and catches up, so the page surfaces behind a rising
    // paper edge.
    const plate = Animated.sequence([
      Animated.timing(ink, {
        toValue: 1,
        duration: entryMs,
        easing: EASING.inOutQuad,
        useNativeDriver,
      }),
      Animated.delay(HOLD_MS),
      timing(ink, 2, EXIT_MS),
    ]);
    const paper = Animated.sequence([
      Animated.timing(chaser, {
        toValue: 1,
        duration: entryMs + 60,
        easing: EASING.inOutQuad,
        useNativeDriver,
      }),
      Animated.delay(HOLD_MS - 60 + CHASER_EXIT_DELAY_MS),
      timing(chaser, 2, CHASER_EXIT_MS),
    ]);

    const all = Animated.parallel([plate, paper]);
    all.start(({ finished }) => {
      if (finished) onDone();
    });

    // The plate blocks input through cover + hold; once it lifts, the
    // page beneath is live again.
    const exitAt = setTimeout(() => setExiting(true), entryMs + HOLD_MS);

    return () => {
      all.stop();
      clearTimeout(exitAt);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The hold's arrivals — platen rule, eyebrow, the strike — start at
  // the CONFIRMED swap (revealed), never at mount: during a slide
  // cover the outgoing route is still current for the first beat, and
  // its title must never flash on the plate. The copy prop has already
  // resolved to the destination by then.
  useEffect(() => {
    if (!revealed) return;
    const timing = (value: Animated.Value, duration: number, delay: number) =>
      Animated.timing(value, { toValue: 1, duration, delay, easing: EASING.outCubic, useNativeDriver });

    const details = Animated.parallel([
      timing(bar, 180, 20),
      timing(eyebrow, 220, 50),
      Animated.timing(stamp, {
        toValue: 1,
        duration: 260,
        delay: 80,
        // A letterpress strike — slight overshoot past rest.
        easing: EASING.strike,
        useNativeDriver,
      }),
    ]);
    details.start();
    return () => details.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  const longStamp = copy.stamp.length > 24;
  const stampSize = copy.stamp.length <= 14 ? 54 : longStamp ? 34 : 44;

  return (
    <View
      testID="route-curtain"
      style={styles.layer}
      pointerEvents={exiting ? 'none' : 'auto'}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Paper chaser — trails the ink plate in, follows it off. */}
      <Animated.View
        style={[styles.fill, { backgroundColor: colors.background, transform: [{ translateY: chaserY }] }]}
        pointerEvents="none"
      />
      {/* The ink plate. */}
      <Animated.View
        style={[styles.fill, inkSurface(colors.text), { transform: [{ translateY: inkY }] }]}
        pointerEvents="none"
      >
        {/* Platen rule — draws across in the hold, leads the lift. */}
        <Animated.View
          style={[
            up ? styles.barUp : styles.barDown,
            styles.barOrigin,
            { backgroundColor: colors.brand, transform: [{ scaleX: bar }] },
          ]}
          pointerEvents="none"
        />
        {/* The destination, pressed into the plate. */}
        <View
          style={[styles.stampBlock, up ? styles.stampUp : { top: insets.top + 26 }]}
          pointerEvents="none"
        >
          {fontsReady ? (
            <>
              <Animated.Text
                style={[
                  styles.eyebrow,
                  { color: colors.background, opacity: eyebrow, transform: [{ translateY: eyebrowY }] },
                ]}
                allowFontScaling={false}
              >
                {copy.eyebrow}
              </Animated.Text>
              <Animated.Text
                style={[
                  styles.stamp,
                  { color: colors.background, fontSize: stampSize, lineHeight: Math.round(stampSize * 1.05) },
                  { opacity: stampOpacity, transform: [{ translateY: stampY }, { scaleY: stampScale }] },
                ]}
                numberOfLines={longStamp ? 2 : 1}
                allowFontScaling={false}
              >
                {copy.stamp}
              </Animated.Text>
            </>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
    elevation: 60,
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  barUp: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
  },
  barDown: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 3,
  },
  barOrigin: {
    transformOrigin: 'left center',
  },
  stampBlock: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  stampUp: {
    bottom: 40,
  },
  eyebrow: {
    // The mono face when one is declared; heavy platform type otherwise.
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  stamp: {
    // The display face when one is declared (single-weight poster
    // faces carry 400); the fallback platform sans needs the weight.
    fontFamily: theme.fonts.display,
    fontWeight: theme.fonts.display ? '400' : '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

export default RouteCurtain;

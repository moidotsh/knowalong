// components/MobilePremium/MobileAtmosphere.tsx
// Universal mobile atmosphere — a continuous drifting color-field
// background that runs behind every surface in the light premium kit.
//
// Surface semantics (auth/setup/training/goal/instructions/privacy/analytics)
// are domain-agnostic; every palette stop is retuned for light surfaces.
// See components/premium/shared/atmospherePalettes.ts.
//
// Each surface gets a palette stop that reflects its role:
//   • auth          — soft sky-blue on pale ice
//   • setup         — cool blue-to-lavender on cream
//   • training      — warm peach-to-rose on cream
//   • goal          — teal-to-mint on pale aqua
//   • instructions  — soft cobalt on pale ice
//   • privacy       — sage-to-mint on pale aqua
//   • analytics     — periwinkle-to-lilac on pale lavender
//
// Reduced motion: the drift halts AND the palette snaps (no crossfade).
// The design still reads as premium without animation.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { usePlatformAnimation } from '../../hooks';
import { isWeb, hasWindow } from '../../utils';
import { useAppTheme } from '../../context';
import { CONTENT_WIDTH_MODE, DESKTOP_LAYOUT_MODE, MOBILE_CONTENT_MAX_WIDTH } from '../../constants';
import {
  PALETTES,
  useReducedMotion,
  useAnimatedValue,
  useLoop,
  type AtmosphereSurface,
  type AtmospherePalette,
} from '../premium/shared';

export type MobileAtmosphereSurface = AtmosphereSurface;

interface AtmosphereOrbsProps {
  surface: MobileAtmosphereSurface;
  paletteOverride?: Partial<AtmospherePalette>;
  orb1Anim: Animated.Value;
  orb2Anim: Animated.Value;
  orb3Anim: Animated.Value;
  opacity?: Animated.Value | Animated.AnimatedInterpolation<string | number> | number;
}

function AtmosphereOrbs({
  surface,
  paletteOverride,
  orb1Anim,
  orb2Anim,
  orb3Anim,
  opacity,
}: AtmosphereOrbsProps) {
  const palette = useMemo<AtmospherePalette>(
    () => ({ ...PALETTES[surface], ...paletteOverride }),
    [surface, paletteOverride],
  );

  const orb1Y = orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -24] });
  const orb2Y = orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const orb3Y = orb3Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });

  return (
    <>
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          {
            backgroundColor: palette.orb1,
            transform: [{ translateY: orb1Y }],
            opacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          {
            backgroundColor: palette.orb2,
            transform: [{ translateY: orb2Y }],
            opacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orb3,
          {
            backgroundColor: palette.orb3,
            transform: [{ translateY: orb3Y }],
            opacity,
          },
        ]}
      />
    </>
  );
}

export interface MobileAtmosphereProps {
  surface: MobileAtmosphereSurface;
  backgroundColor?: string;
  showVignette?: boolean;
  /**
   * Whether the drifting orbs render. Undefined (the default) defers
   * to the theme's atmosphere style — `theme.atmosphere.style: 'flat'`
   * turns the orbs off app-wide while keeping the base tint +
   * vignette. Pass an explicit boolean only to override the theme for
   * this one surface (the dev showcase demos both styles this way).
   * The drift animations also stop when the orbs are off.
   */
  showOrbs?: boolean;
  palette?: Partial<AtmospherePalette>;
  style?: ViewStyle | false;
}

export function MobileAtmosphere({
  surface,
  backgroundColor,
  showVignette = true,
  showOrbs,
  palette,
  style,
}: MobileAtmosphereProps) {
  const reduced = useReducedMotion();
  const { useNativeDriver } = usePlatformAnimation();
  const { colors, atmosphere } = useAppTheme();
  // Theme default, per-callsite override: the single declaration point
  // for the atmosphere language is `theme.atmosphere.style`.
  const orbsVisible = showOrbs ?? atmosphere.style !== 'flat';

  const [displayedSurface, setDisplayedSurface] = useState<MobileAtmosphereSurface>(surface);
  const [incomingSurface, setIncomingSurface] = useState<MobileAtmosphereSurface | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const prevSurfaceRef = useRef<MobileAtmosphereSurface>(surface);

  const orb1Anim = useAnimatedValue(0);
  const orb2Anim = useAnimatedValue(0);
  const orb3Anim = useAnimatedValue(0);

  const orbPaused = !orbsVisible || (isWeb && !hasWindow());
  useLoop(
    orb1Anim,
    [
      { to: 1, duration: 12000 },
      { to: 0, duration: 12000 },
    ],
    { paused: orbPaused },
  );
  useLoop(
    orb2Anim,
    [
      { to: 1, duration: 12000, delay: 2000 },
      { to: 0, duration: 12000 },
    ],
    { paused: orbPaused },
  );
  useLoop(
    orb3Anim,
    [
      { to: 1, duration: 12000, delay: 4000 },
      { to: 0, duration: 12000 },
    ],
    { paused: orbPaused },
  );

  useEffect(() => {
    if (surface === prevSurfaceRef.current) return;
    prevSurfaceRef.current = surface;

    if (reduced) {
      setDisplayedSurface(surface);
      setIncomingSurface(null);
      fadeAnim.setValue(0);
      return;
    }

    setIncomingSurface(surface);
    const anim = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver,
    });
    anim.start(() => {
      setDisplayedSurface(surface);
      setIncomingSurface(null);
      fadeAnim.setValue(0);
    });
    return () => anim.stop();
  }, [surface, reduced, fadeAnim, useNativeDriver]);

  const outgoingOpacity = fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const incomingOpacity = fadeAnim;

  // The background tint + vignette follow the active colorScheme — the
  // ThemeProvider re-resolves `colors` on toggle and this re-renders.
  const base = backgroundColor ?? colors.backgroundDeep;
  const vignette = colors.mobilePremium.atmosphereVignette;

  // With the desktop layouts shelved, the layout is the centered mobile
  // column at any viewport width — the orbs belong to that column's
  // corners, not the desktop viewport's. The base tint + vignette stay
  // full-bleed; only the orb band is columned.
  const orbsColumned = CONTENT_WIDTH_MODE === 'constrained' && DESKTOP_LAYOUT_MODE === 'mobile-only';

  return (
    <View
      style={[styles.container, { backgroundColor: base }, style === false ? null : style]}
      pointerEvents="none"
    >
      {orbsVisible ? (
        <View style={orbsColumned ? styles.orbBandColumned : styles.orbBandFull}>
          <AtmosphereOrbs
            surface={displayedSurface}
            paletteOverride={palette}
            orb1Anim={orb1Anim}
            orb2Anim={orb2Anim}
            orb3Anim={orb3Anim}
            opacity={outgoingOpacity}
          />
          {incomingSurface ? (
            <AtmosphereOrbs
              surface={incomingSurface}
              paletteOverride={palette}
              orb1Anim={orb1Anim}
              orb2Anim={orb2Anim}
              orb3Anim={orb3Anim}
              opacity={incomingOpacity}
            />
          ) : null}
        </View>
      ) : null}
      {showVignette && isWeb ? (
        <View style={[styles.vignette, { boxShadow: vignette }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbBandFull: { ...StyleSheet.absoluteFillObject },
  orbBandColumned: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: MOBILE_CONTENT_MAX_WIDTH,
    marginLeft: -MOBILE_CONTENT_MAX_WIDTH / 2,
    overflow: 'hidden',
  },
  orb1: { width: 340, height: 340, top: -120, left: -120 },
  orb2: { width: 300, height: 300, bottom: -100, right: -100 },
  orb3: { width: 240, height: 240, top: '32%', right: -80 },
  vignette: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
});

export default MobileAtmosphere;

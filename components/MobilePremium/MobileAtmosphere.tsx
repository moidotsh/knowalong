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
import { useReducedMotion, usePlatformAnimation } from '../../hooks';
import { isWeb, hasWindow } from '../../utils';
import { useAppTheme } from '../../context';
import {
  PALETTES,
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
  palette?: Partial<AtmospherePalette>;
  style?: ViewStyle | false;
}

export function MobileAtmosphere({
  surface,
  backgroundColor,
  showVignette = true,
  palette,
  style,
}: MobileAtmosphereProps) {
  const reduced = useReducedMotion();
  const { useNativeDriver } = usePlatformAnimation();
  const { colors } = useAppTheme();

  const [displayedSurface, setDisplayedSurface] = useState<MobileAtmosphereSurface>(surface);
  const [incomingSurface, setIncomingSurface] = useState<MobileAtmosphereSurface | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const prevSurfaceRef = useRef<MobileAtmosphereSurface>(surface);

  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;
  const orb3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    if (isWeb && !hasWindow()) return;

    const float = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 12000, useNativeDriver: !isWeb }),
          Animated.timing(anim, { toValue: 0, duration: 12000, useNativeDriver: !isWeb }),
        ]),
      );

    const a1 = float(orb1Anim, 0);
    const a2 = float(orb2Anim, 2000);
    const a3 = float(orb3Anim, 4000);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [orb1Anim, orb2Anim, orb3Anim, reduced]);

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

  return (
    <View
      style={[styles.container, { backgroundColor: base }, style === false ? null : style]}
      pointerEvents="none"
    >
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
  orb1: { width: 340, height: 340, top: -120, left: -120 },
  orb2: { width: 300, height: 300, bottom: -100, right: -100 },
  orb3: { width: 240, height: 240, top: '32%', right: -80 },
  vignette: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
});

export default MobileAtmosphere;

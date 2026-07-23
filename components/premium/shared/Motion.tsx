// components/premium/shared/Motion.tsx
// Shared motion primitives — the single source of truth for animation
// across arqavellum. The four-pillar motion language
// (Enter / Transition / Respond / Shake) is platform-agnostic and carries
// the calm-air / considered-motion philosophy.
//
//   Enter       → <FadeIn>           (mount-time fade + slide up)
//   Transition  → <Crossfade>        (step-to-step crossfade + drift)
//   Respond     → RESPOND_PRESSED + useFocusRing + usePressedStyle
//   Shake       → <Shake>            (error feedback)
//
// All primitives honor `prefers-reduced-motion`:
//   • FadeIn collapses to a fade-only (no slide).
//   • Crossfade collapses to a fade-only (no drift).
//   • Shake collapses to a no-op (the surrounding error UI conveys it).
//   • Respond's press/focus scales collapse to opacity-only.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  View,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  useControlledShake,
  useFadeSlide,
  usePlatformAnimation,
  useReducedMotion,
} from '../../../hooks';
import { isWeb, hasWindow } from '../../../utils';

// ─────────────────────────────────────────────────────────────────────
// ENTER — fade-in on mount
// ─────────────────────────────────────────────────────────────────────

export interface FadeInProps {
  children: React.ReactNode;
  /** Delay before the animation starts (ms). Use to stagger title → subtitle → content → action. */
  delay?: number;
  /** Animation duration (ms). Default 480ms — slightly longer than the legacy 400ms for a softer curve. */
  duration?: number;
  /** Vertical slide distance (px). Set to 0 for fade-only. Default 8 (subtle). */
  y?: number;
  /** Override reduced-motion (force the slide even when the user has reduced motion on). Rare. */
  ignoreReducedMotion?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Mount-time fade + slide-up. The Enter primitive.
 *
 * Stagger by element type: title → subtitle → content → action.
 * A typical screen uses delays of 0, 80, 160, 240ms.
 *
 * Under `prefers-reduced-motion`, the slide collapses to fade-only and the
 * duration shortens to 200ms.
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 480,
  y = 8,
  ignoreReducedMotion = false,
  style,
}: FadeInProps) {
  const reduced = useReducedMotion();
  const honorReduced = reduced && !ignoreReducedMotion;
  const { style: animStyle } = useFadeSlide({
    delay,
    duration: honorReduced ? Math.min(duration, 200) : duration,
    initialTranslate: honorReduced ? 0 : y,
    direction: 'up',
    animateOnMount: true,
  });

  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

// ─────────────────────────────────────────────────────────────────────
// SHAKE — error feedback
// ─────────────────────────────────────────────────────────────────────

export interface ShakeProps {
  children: React.ReactNode;
  /** Fire a shake on this round. */
  shake: boolean;
  /** Called when the shake completes (use to clear the trigger). */
  onComplete?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Controlled shake for error feedback. Wraps the useControlledShake hook so
 * screens import motion from one place.
 */
export function Shake({ children, shake, onComplete, style }: ShakeProps) {
  const { style: animStyle } = useControlledShake({ trigger: shake, onComplete });
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

// ─────────────────────────────────────────────────────────────────────
// TRANSITION — crossfade with horizontal drift between steps
// ─────────────────────────────────────────────────────────────────────

export interface CrossfadeProps {
  /** Stable key for the current child. When this changes, the crossfade runs. */
  index: string | number;
  children: React.ReactNode;
  /**
   * Direction of travel. 'forward' (default) drifts the incoming child in
   * from the right and the outgoing child out to the left (advancing).
   * 'backward' reverses it. Pass 'none' to disable drift (just fade).
   */
  direction?: 'forward' | 'backward' | 'none';
  /** Animation duration (ms). Default 320ms — tuned to feel considered, not snappy. */
  duration?: number;
  /** Drift distance (px). Default 24 — subtle, doesn't read as a slide. */
  drift?: number;
  style?: StyleProp<ViewStyle>;
}

interface CrossfadeRecord {
  key: string | number;
  element: React.ReactNode;
  opacity: Animated.Value;
  translateX: Animated.Value;
}

/**
 * Step-to-step / slide-to-slide crossfade with a subtle horizontal drift
 * in the direction of travel. The Transition primitive.
 *
 * Under `prefers-reduced-motion`, the drift collapses to fade-only.
 *
 * Implementation note: keeps the outgoing child mounted during the crossfade,
 * then unmounts. Animations are cleaned up on unmount via the returned
 * subscription — R4 guard.
 */
export function Crossfade({
  index,
  children,
  direction = 'forward',
  duration = 320,
  drift = 24,
  style,
}: CrossfadeProps) {
  const reduced = useReducedMotion();
  const { useNativeDriver } = usePlatformAnimation();
  const effectiveDrift = reduced ? 0 : drift;

  const buildRecord = (key: string | number, element: React.ReactNode, fromX: number): CrossfadeRecord => {
    const opacity = new Animated.Value(0);
    const translateX = new Animated.Value(fromX);
    return { key, element, opacity, translateX };
  };

  const outgoingRef = useRef<CrossfadeRecord | null>(null);
  const [current, setCurrent] = useState<CrossfadeRecord>(() => {
    const init = buildRecord(index, children, 0);
    init.opacity.setValue(1);
    return init;
  });

  useEffect(() => {
    if (index === current.key) return;

    const sign = direction === 'backward' ? -1 : 1;
    const incoming = buildRecord(index, children, effectiveDrift * sign);
    const outgoing = current;
    outgoingRef.current = outgoing;
    setCurrent(incoming);

    const animDuration = reduced ? Math.min(duration, 160) : duration;

    const incomingAnim = Animated.parallel([
      Animated.timing(incoming.opacity, {
        toValue: 1,
        duration: animDuration,
        useNativeDriver,
      }),
      Animated.timing(incoming.translateX, {
        toValue: 0,
        duration: animDuration,
        useNativeDriver,
      }),
    ]);

    const outgoingAnim = Animated.parallel([
      Animated.timing(outgoing.opacity, {
        toValue: 0,
        duration: animDuration,
        useNativeDriver,
      }),
      Animated.timing(outgoing.translateX, {
        toValue: -effectiveDrift * sign,
        duration: animDuration,
        useNativeDriver,
      }),
    ]);

    const parallel = Animated.parallel([incomingAnim, outgoingAnim]);
    parallel.start(() => {
      if (outgoingRef.current === outgoing) {
        outgoingRef.current = null;
      }
    });

    return () => {
      parallel.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <View style={[{ position: 'relative' }, style]}>
      {outgoingRef.current ? (
        <Animated.View
          key={`out-${outgoingRef.current.key}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            opacity: outgoingRef.current.opacity,
            transform: [{ translateX: outgoingRef.current.translateX }],
          }}
        >
          {outgoingRef.current.element}
        </Animated.View>
      ) : null}
      {/* Incoming child renders as a plain View so it is always visible.
          The previous Animated.View wrapper depended on Animated.Value
          propagation for initial visibility, which left carousel/wizard
          slides rendering empty on some web builds. The outgoing layer's
          fade-out + drift still carries the crossfade feel; the incoming
          child simply appears underneath as the old one fades away. */}
      <View key={`in-${current.key}`}>{current.element}</View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────
// RESPOND — micro-feedback on every interactive element
// ─────────────────────────────────────────────────────────────────────

/**
 * Pressed-state style for a Pressable. Returns the canonical press feedback:
 *
 *   Tap = subtle scale (0.98) + opacity (0.9).
 *
 * Under `prefers-reduced-motion`, the scale is dropped (opacity-only).
 */
export function usePressedStyle(): ViewStyle {
  const reduced = useReducedMotion();
  return useMemo(
    () =>
      reduced
        ? { opacity: 0.7 }
        : { transform: [{ scale: 0.98 }], opacity: 0.9 },
    [reduced],
  );
}

/**
 * A constant pressed style — use when the component does not have a hook
 * context (rare). Prefer `usePressedStyle()` so reduced-motion is honored.
 */
export const RESPOND_PRESSED: ViewStyle = { transform: [{ scale: 0.98 }], opacity: 0.9 };

export interface UseFocusRingOptions {
  /** Accent color for the ring + glow. */
  color: string;
  /** Whether the trigger is currently focused. */
  focused: boolean;
  /** Animation duration (ms). Default 220ms. */
  duration?: number;
}

/**
 * Animated focus ring for an input / trigger. Returns:
 *   • `ringStyle` — Animated style to apply to an absolutely-positioned
 *     wrapping View inside the trigger (1px ring at -1px inset).
 *   • `glowStyle` — static box-shadow style (web only) for the glow.
 *
 * Under `prefers-reduced-motion`, the ring snaps instead of animating.
 */
export function useFocusRing({ color, focused, duration = 220 }: UseFocusRingOptions) {
  const { useNativeDriver } = usePlatformAnimation();
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    const anim = Animated.timing(opacity, {
      toValue: focused ? 1 : 0,
      duration: reduced ? 0 : duration,
      useNativeDriver,
    });
    anim.start();
    return () => anim.stop();
  }, [focused, duration, opacity, useNativeDriver, reduced]);

  const ringStyle: StyleProp<ViewStyle> = useMemo(
    () => ({
      position: 'absolute',
      top: -1,
      left: -1,
      right: -1,
      bottom: -1,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: color,
      opacity,
      pointerEvents: 'none',
    }),
    [color, opacity],
  );

  const glowStyle: StyleProp<ViewStyle> = useMemo(() => {
    if (!isWeb) return undefined;
    if (!focused) return undefined;
    return {
      boxShadow: `0 0 0 3px ${color}1a, 0 0 18px ${color}1f`,
    };
  }, [color, focused]);

  return { ringStyle, glowStyle };
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Apply the pressed style inside a `Pressable` style callback.
 *
 *   <Pressable style={pressStyle(baseStyle)}>...
 */
export function pressStyle(base: StyleProp<ViewStyle>) {
  return (state: PressableStateCallbackType): StyleProp<ViewStyle> => {
    if (!state.pressed) return base;
    return [base, RESPOND_PRESSED];
  };
}

export { useReducedMotion };

export function prefersReducedMotionSync(): boolean {
  if (!isWeb || !hasWindow()) return false;
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export { Pressable };

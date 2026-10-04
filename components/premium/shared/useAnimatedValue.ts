// components/premium/shared/useAnimatedValue.ts
// The kit's one Animated engine. Every timed/sprung/looping value in the
// kit routes through here so reduced-motion clamping, stop-cleanup, and
// web/native driver correctness live in exactly one place.
//
//   useAnimatedValue(initial)        — the ref boilerplate, once
//   animateTo(value, to, opts)       — imperative one-shot (event handlers)
//   useTransition(value, to, opts)   — effect-shaped: re-runs when `to` changes
//   useAnimatedFlag(active, opts)    — boolean → 0..1 progress (checks,
//                                      rotations, strikes; snap under reduced)
//   useLoop(value, steps, opts)      — ambient cycles (pulses, drifting orbs)
//
// Reduced-motion policy: transitions clamp to `reducedDuration` (default 0
// — snap), flags snap, loops never start. Callers that want a shortened
// fade instead of a snap pass an explicit reducedDuration (FadeIn uses 200,
// Crossfade 160).
import { useEffect, useRef } from 'react';
import { Animated, type EasingFunction } from 'react-native';
import { useReducedMotion } from '../../../hooks';
import { isWeb } from '../../../utils';
import { DURATION, EASING } from '../../../constants';

/**
 * Returns a stable Animated.Value initialized once. The `useRef(new
 * Animated.Value(...))` idiom, without the boilerplate.
 */
export function useAnimatedValue(initial: number): Animated.Value {
  const ref = useRef<Animated.Value | null>(null);
  if (ref.current == null) ref.current = new Animated.Value(initial);
  return ref.current;
}

/**
 * Which thread drives the animation. 'auto' = native off native platforms,
 * JS on web (native offloading is free on iOS/Android but janks on RN
 * Web). 'js' is REQUIRED for non-transform/opacity properties (width,
 * height, flex) — the native driver cannot animate them.
 */
export type AnimationDriver = 'auto' | 'native' | 'js';

function resolveDriver(d: AnimationDriver = 'auto'): boolean {
  if (d === 'native') return true;
  if (d === 'js') return false;
  return !isWeb;
}

export interface TransitionOptions {
  /** ms. Default DURATION.default (300). Pass 0 to snap. */
  duration?: number;
  /** Lead delay in ms (default 0). */
  delay?: number;
  /** Default EASING.enter (ease-out). */
  easing?: EasingFunction;
  /** 'spring' ignores duration/delay/easing and uses `spring`. */
  mode?: 'timing' | 'spring';
  spring?: { friction?: number; tension?: number };
  driver?: AnimationDriver;
  /**
   * Duration under prefers-reduced-motion. Default 0 (snap). Pass a short
   * clamp (e.g. 160–200) when the motion language wants a shortened fade
   * rather than an instant state change.
   */
  reducedDuration?: number;
}

/**
 * Builds (does NOT start) a single animation toward `to`. Pair with
 * `.start()` in event handlers; the hook-shaped companions below call it
 * themselves with paired `.stop()` cleanup.
 */
export function animateTo(
  value: Animated.Value,
  to: number,
  opts: TransitionOptions = {},
): Animated.CompositeAnimation {
  const {
    duration = DURATION.default,
    delay = 0,
    easing = EASING.enter,
    mode = 'timing',
    spring,
    driver,
  } = opts;
  if (mode === 'spring') {
    return Animated.spring(value, {
      toValue: to,
      friction: spring?.friction ?? 7,
      tension: spring?.tension ?? 100,
      useNativeDriver: resolveDriver(driver),
    });
  }
  return Animated.timing(value, {
    toValue: to,
    duration,
    delay,
    easing,
    useNativeDriver: resolveDriver(driver),
  });
}

/** Effect-shaped animateTo: runs whenever `to` (or the reduced-motion
 *  flag) changes; stops the in-flight animation on cleanup/re-run. */
export function useTransition(
  value: Animated.Value,
  to: number,
  opts: TransitionOptions = {},
): void {
  const reduced = useReducedMotion();
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const { duration, delay, mode, driver, reducedDuration } = opts;
  useEffect(() => {
    const o = optsRef.current;
    const anim = animateTo(value, to, {
      ...o,
      duration: reduced ? (o.reducedDuration ?? 0) : (o.duration ?? DURATION.default),
    });
    anim.start();
    return () => anim.stop();
    // Primitives in deps so literal option objects don't re-fire the
    // effect every render; the rest (easing, spring) read from the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, to, reduced, duration, delay, mode, driver, reducedDuration]);
}

export interface AnimatedFlagOptions {
  /** ms. Default DURATION.strike (120). */
  duration?: number;
  easing?: EasingFunction;
  driver?: AnimationDriver;
}

/**
 * Boolean → 0..1 progress with paired start/stop cleanup. Snaps under
 * prefers-reduced-motion. Drive multiple style reads (scale AND opacity,
 * rotation) from the single value via interpolate.
 */
export function useAnimatedFlag(
  active: boolean,
  opts: AnimatedFlagOptions = {},
): Animated.Value {
  const value = useAnimatedValue(active ? 1 : 0);
  const reduced = useReducedMotion();
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const { duration } = opts;
  useEffect(() => {
    if (reduced) {
      value.setValue(active ? 1 : 0);
      return;
    }
    const o = optsRef.current;
    const anim = animateTo(value, active ? 1 : 0, {
      duration: o.duration ?? DURATION.strike,
      easing: o.easing,
      driver: o.driver,
    });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduced, value, duration]);
  return value;
}

export interface LoopStep {
  to: number;
  duration: number;
  /** Lead delay before this step runs (repeats every cycle). */
  delay?: number;
}

export interface LoopOptions {
  driver?: AnimationDriver;
  /** True (or a truthy trigger) keeps the loop stopped and resets the
   *  value to `resetTo`. */
  paused?: boolean;
  /** Value written while paused (default 0). */
  resetTo?: number;
}

/**
 * An ambient cycle — pulses, breaths, drifting orbs. Never starts under
 * prefers-reduced-motion; stops and resets when `paused` turns on.
 */
export function useLoop(
  value: Animated.Value,
  steps: ReadonlyArray<LoopStep>,
  opts: LoopOptions = {},
): void {
  const reduced = useReducedMotion();
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const { paused } = opts;
  useEffect(() => {
    if (reduced || paused) {
      value.setValue(optsRef.current.resetTo ?? 0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence(
        stepsRef.current.map((s) =>
          animateTo(value, s.to, {
            duration: s.duration,
            delay: s.delay,
            driver: optsRef.current.driver,
          }),
        ),
      ),
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced, paused]);
}

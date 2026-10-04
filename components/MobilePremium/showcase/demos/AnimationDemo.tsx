// components/MobilePremium/showcase/demos/AnimationDemo.tsx
// The generic animation-hook kit's interactive demo — fade / scale / pop /
// translate cards, the imperative shake, and the animated counter.
import { useState } from 'react';
import { Animated, Text, View } from 'react-native';
import {
  useFadeIn,
  useScaleIn,
  usePopIn,
  useAnimatedCounter,
  useShake,
  useTranslateY,
} from '../../../../hooks';
import { useAppTheme } from '../../../../context';
import { MobileSurface } from '../../MobileSurface';
import { MobilePrimaryButton } from '../../MobilePrimaryButton';
import { styles } from '../styles';

export function AnimationDemo() {
  const { colors } = useAppTheme();
  // Animate on mount: the resting state must be the settled grid — with
  // mount animation off, the fade/scale/pop cards rest invisible and the
  // translateY card rests displaced into the surface's clipped corner.
  // Replay re-runs the same choreography on demand.
  const fadeIn = useFadeIn({ animateOnMount: true, duration: 600 });
  const scaleIn = useScaleIn({ animateOnMount: true, duration: 600, useSpring: true });
  const popIn = usePopIn({ animateOnMount: true });
  const shake = useShake({ intensity: 8, cycles: 3 });
  const translateY = useTranslateY({ animateOnMount: true, initialValue: 24, duration: 500 });

  const [counterTarget, setCounterTarget] = useState('0');
  const counter = useAnimatedCounter(counterTarget);

  const replay = () => {
    fadeIn.reset();
    scaleIn.reset();
    popIn.reset();
    translateY.reset();
    // Defer one frame so the reset lands before the animation restarts.
    setTimeout(() => {
      fadeIn.fadeIn();
      scaleIn.scaleIn();
      popIn.popIn();
      translateY.animate();
    }, 16);
  };

  const runCounter = () => {
    const next = Math.floor(Math.random() * 1000);
    counter.startCount(
      counterTarget,
      next.toString(),
      (n) => Math.round(n).toString(),
      () => setCounterTarget(next.toString()),
      900,
    );
  };

  return (
    <View>
      <MobileSurface>
        <View style={styles.animGrid}>
          <Animated.View style={[styles.animCard, { backgroundColor: colors.buttonBackground }, fadeIn.style]}>
            <Text style={[styles.animLabel, { color: colors.textOnBrandMuted }]}>useFadeIn</Text>
            <Text style={[styles.animValue, { color: colors.textOnBrand }]}>opacity → 1</Text>
          </Animated.View>
          <Animated.View style={[styles.animCard, { backgroundColor: colors.buttonBackground }, scaleIn.style]}>
            <Text style={[styles.animLabel, { color: colors.textOnBrandMuted }]}>useScaleIn</Text>
            <Text style={[styles.animValue, { color: colors.textOnBrand }]}>spring → 1</Text>
          </Animated.View>
          <Animated.View style={[styles.animCard, { backgroundColor: colors.buttonBackground }, popIn.style]}>
            <Text style={[styles.animLabel, { color: colors.textOnBrandMuted }]}>usePopIn</Text>
            <Text style={[styles.animValue, { color: colors.textOnBrand }]}>overshoot</Text>
          </Animated.View>
          <Animated.View
            style={[styles.animCard, { backgroundColor: colors.buttonBackground }, translateY.style]}
          >
            <Text style={[styles.animLabel, { color: colors.textOnBrandMuted }]}>useTranslateY</Text>
            <Text style={[styles.animValue, { color: colors.textOnBrand }]}>slide ↑</Text>
          </Animated.View>
        </View>
      </MobileSurface>
      <View style={styles.spacer} />
      <MobilePrimaryButton onPress={replay} variant="secondary">
        Replay animations
      </MobilePrimaryButton>
      <View style={styles.spacer} />
      <MobilePrimaryButton onPress={shake.shake} variant="secondary">
        Shake the card below
      </MobilePrimaryButton>
      <View style={styles.spacer} />
      <MobileSurface>
        <Animated.View style={[styles.shakeCard, { backgroundColor: colors.buttonBackground }, shake.style]}>
          <Text style={[styles.animLabel, { color: colors.textOnBrandMuted }]}>useShake</Text>
          <Text style={[styles.animValue, { color: colors.textOnBrand }]}>imperative — call shake() from any handler</Text>
        </Animated.View>
      </MobileSurface>
      <View style={styles.spacer} />
      <Text style={[styles.animLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
        useAnimatedCounter
      </Text>
      <MobileSurface>
        <View style={styles.counterRow}>
          <Text style={[styles.counterValue, { color: colors.brand }]}>
            {counter.displayed}
          </Text>
          <MobilePrimaryButton
            onPress={runCounter}
            variant="secondary"
            style={styles.counterButton}
          >
            Count
          </MobilePrimaryButton>
        </View>
      </MobileSurface>
    </View>
  );
}

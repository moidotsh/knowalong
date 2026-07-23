// components/MobilePremium/CarouselTutorial.tsx
//
// Generic step-through slide carousel for onboarding-style flows.
// Explicitly NOT a Stories system:
//   • No per-slide progress bars (Stories convention).
//   • No autoplay (Stories convention).
//   • No tap-zone left/right to advance (Stories convention).
//   • No portrait-orientation lock (Stories convention).
//   • No slide-level background colors (consumer wraps content in a surface).
//
// Composition:
//   • Crossfade wraps the active slide (direction inferred from prev/next).
//   • Dot indicators below the content (tap-to-jump is OFF in v1).
//   • MobileActionFooter with Back + Next (Next becomes Done on the last
//     slide; Back hidden on the first slide).
//
// Internal state is allowed (current index). The caller supplies onComplete
// to learn when the user finished, and onSlideChange to track per-slide
// analytics if desired. The carousel does NOT persist position —
// re-mounting always starts at initialIndex.
//
// Swipe gestures are deferred to a Batch C enhancement. v1 is button-only,
// which is fully accessible on web (keyboard) and mobile (large tap targets).

import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme, MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';
import { useAppTheme } from '../../context';
import { Crossfade, usePressedStyle } from '../premium/shared';
import { MobilePrimaryButton, type MobilePrimaryButtonProps } from './MobilePrimaryButton';
import { MobileActionFooter } from './MobileActionFooter';

export interface TutorialSlide {
  /** Stable id for the slide (used as the Crossfade key). */
  id: string;
  /** Slide content. Consumer-owned — wrap in a surface, include icon/title/body. */
  content: React.ReactNode;
  /** Optional a11y label for the slide (used in the dot's progressbar label). */
  accessibilityLabel?: string;
}

export interface CarouselTutorialProps {
  /** Ordered list of slides. */
  slides: readonly TutorialSlide[];
  /** Initial active slide index. Default 0. Clamped to [0, slides.length-1]. */
  initialIndex?: number;
  /** Fires with the new active index on slide change. */
  onSlideChange?: (index: number) => void;
  /** Fires when "Done" is pressed on the last slide. */
  onComplete?: () => void;
  /** Show the dot indicator row. Default true. */
  showProgress?: boolean;
  /** Override the Next button label (default "Next"; "Done" on last slide). */
  nextLabel?: string;
  /** Override the Back button label (default "Back"). */
  backLabel?: string;
  /** Override the brand accent color. */
  accentColor?: string;
  /** Override the container's a11y label. */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const EYEBROW_STYLE = {
  fontSize: theme.typography.mobileEyebrow.fontSize,
  fontWeight: theme.typography.mobileEyebrow.fontWeight as any,
  lineHeight: theme.typography.mobileEyebrow.lineHeight,
  letterSpacing: theme.typography.mobileEyebrow.letterSpacing,
} as const;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function CarouselTutorial({
  slides,
  initialIndex = 0,
  onSlideChange,
  onComplete,
  showProgress = true,
  nextLabel,
  backLabel = 'Back',
  accentColor,
  accessibilityLabel,
  testID,
  style,
}: CarouselTutorialProps) {
  const { colors } = useAppTheme();
  const accent = accentColor ?? colors.brand;
  const pressedStyle = usePressedStyle();
  const total = slides.length;
  const startIndex = total > 0 ? clamp(initialIndex, 0, total - 1) : 0;
  const [index, setIndex] = useState(startIndex);
  const lastIndexRef = useRef(startIndex);

  if (total === 0) {
    return null;
  }

  const isFirst = index === 0;
  const isLast = index === total - 1;

  const goTo = (next: number) => {
    const clamped = clamp(next, 0, total - 1);
    if (clamped === index) return;
    lastIndexRef.current = index;
    setIndex(clamped);
    onSlideChange?.(clamped);
  };

  const handleBack = () => goTo(index - 1);
  const handleNext = () => {
    if (isLast) {
      onComplete?.();
      return;
    }
    goTo(index + 1);
  };

  const direction: 'forward' | 'backward' =
    index >= lastIndexRef.current ? 'forward' : 'backward';

  const activeSlide = slides[index];

  const primary: MobilePrimaryButtonProps = {
    children: nextLabel ?? (isLast ? 'Done' : 'Next'),
    onPress: handleNext,
    accentColor: accent,
  };

  return (
    <View
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? 'Tutorial'}
      style={[styles.shell, style]}
    >
      <View style={styles.contentArea}>
        <Crossfade index={activeSlide.id} direction={direction}>
          {activeSlide.content}
        </Crossfade>
      </View>

      {showProgress ? (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={`Slide ${index + 1} of ${total}`}
          accessibilityValue={{ min: 1, max: total, now: index + 1 }}
          style={styles.dotsRow}
        >
          {slides.map((slide, i) => {
            const active = i === index;
            return (
              <View
                key={slide.id}
                style={[
                  styles.dot,
                  {
                    backgroundColor: active ? accent : colors.border,
                  },
                ]}
              />
            );
          })}
        </View>
      ) : null}

      <MobileActionFooter
        primary={primary}
        secondaryLabel={isFirst ? undefined : backLabel}
        onSecondary={isFirst ? undefined : handleBack}
        accentColor={accent}
        disableSafeArea
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    ...MOBILE_CONTENT_WIDTH_STYLE,
    flexDirection: 'column',
  },
  contentArea: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 280,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default CarouselTutorial;

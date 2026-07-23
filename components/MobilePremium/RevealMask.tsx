// components/MobilePremium/RevealMask.tsx
//
// Visual-privacy wrapper. Default state hides the wrapped content behind a
// mask; tapping the mask reveals it. Two visual variants: a solid 'cover'
// (the consumer's mask color) and a 'blur' that uses a backdrop-filter blur
// on web and falls back to the cover treatment on native (where
// backdrop-filter is not available). Both variants are PURELY visual —
// see the non-security disclaimer below.
//
// A11y contract: the masked wrapper is a Pressable with role="button" +
// accessibilityLabel defaulting to "Tap to reveal". The wrapped children
// get `accessibilityElementsHidden` while masked so screen readers do not
// announce the protected text until the user explicitly reveals it.
//
// NON-SECURITY DISCLAIMER — load-bearing:
// RevealMask defeats casual over-the-shoulder viewing. It does NOT defeat
// screenshots, screen recording, accessibility-tree inspection, or memory
// inspection. It is NOT encryption, NOT authentication, and NOT a secure
// data handling boundary. Any consumer relying on RevealMask for real
// secrecy is misusing this primitive.

import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { isWeb } from '../../utils';
import { useAppTheme } from '../../context';
import { usePressedStyle } from '../premium/shared';

export type RevealMaskVariant = 'cover' | 'blur';

export interface RevealMaskProps {
  /** Wrapped content. */
  children: React.ReactNode;
  /** Controlled masked state. Default true (masked). */
  masked?: boolean;
  /** Fires when the user taps the mask to reveal. */
  onReveal?: () => void;
  /** Override the mask affordance label (default "Tap to reveal"). */
  accessibilityLabel?: string;
  /** Visual mask style. Default 'cover'. */
  maskVariant?: RevealMaskVariant;
  /** Override the mask color (default colors.cardAlt). */
  maskColor?: string;
  /** Blur strength in pixels for the 'blur' variant on web. Default 10. */
  blurRadius?: number;
  /** Test ID. */
  testID?: string;
  /** Outer style pass-through. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Visual-privacy wrapper. Tap the mask to reveal the content underneath.
 *
 * Non-security: this primitive is purely visual. See the file header.
 */
export function RevealMask({
  children,
  masked = true,
  onReveal,
  accessibilityLabel,
  maskVariant = 'cover',
  maskColor,
  blurRadius = 10,
  testID,
  style,
}: RevealMaskProps) {
  const { colors } = useAppTheme();
  const pressedStyle = usePressedStyle();
  const surface = maskColor ?? colors.cardAlt;
  const composedLabel = accessibilityLabel ?? 'Tap to reveal';

  if (!masked) {
    // Revealed state — render children directly so the wrapper imposes no
    // extra layout on the un-masked surface.
    return (
      <View testID={testID} style={style}>
        {children}
      </View>
    );
  }

  // The blur variant uses backdrop-filter on web. On native there is no
  // equivalent without a screenshot-based approach (heavyweight); we fall
  // back to the cover variant there. Both paths share the same a11y
  // contract below, so the visual fallback is safe.
  const useBlur = maskVariant === 'blur' && isWeb;
  const maskStyle: ViewStyle = useBlur
    ? ({
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        backdropFilter: `blur(${blurRadius}px)`,
        WebkitBackdropFilter: `blur(${blurRadius}px)`,
      } as ViewStyle)
    : { backgroundColor: surface };

  return (
    <View testID={testID} style={[styles.shell, style]}>
      {/* Children render in-flow so the parent's height matches the natural
          content height. The mask layer is absolutely positioned on top. The
          previous layout (both layers absoluteFill) collapsed the parent to
          zero height, hiding the children visually and breaking the mask. */}
      <View accessibilityElementsHidden>{children}</View>
      <Pressable
        onPress={onReveal}
        accessibilityRole="button"
        accessibilityLabel={composedLabel}
        style={({ pressed }) => [StyleSheet.absoluteFill, maskStyle, pressed ? pressedStyle : null]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    overflow: 'hidden',
  },
});

export default RevealMask;

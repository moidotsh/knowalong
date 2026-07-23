// components/MobilePremium/DisclosureRow.tsx
// Expand/collapse row. Renders a consumer-supplied header and, when
// expanded, the consumer-supplied content below it. Domain-neutral: the
// primitive owns open/close state + chevron rotation; everything else is
// consumer-supplied.
//
// v1 motion contract — INSTANT content, ROTATING chevron:
//
//   • Content area appears/disappears instantly when open toggles. There is
//     no height animation. Height animation on native requires Reanimated
//     worklets (installed, currently unused — adopting them is a stack
//     decision) or LayoutAnimation (unpredictable on web). A v1 with
//     instant content swap is correct, simple, and accessible.
//   • Header chevron rotates 180° on open over 200ms via Animated.timing.
//     Under reduced motion (useReducedMotion() from hooks/useAnimation),
//     duration collapses to 0 — the chevron snaps to the open orientation
//     with no rotation animation.
//
// v2 (deferred to Batch B) — height animation gated on a real Reanimated
// adoption decision plus a measurement helper that doesn't exist today.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronDown } from '@tamagui/lucide-icons-2';
import { usePressedStyle } from '../premium/shared';
import { useReducedMotion } from '../../hooks';
import { useAppTheme } from '../../context';

export interface DisclosureRowProps {
  /** Header content. Typically icon + title + optional right element. */
  header: React.ReactNode;
  /** Body content revealed when the row is open. */
  children: React.ReactNode;
  /** Initial open state for uncontrolled usage. */
  defaultOpen?: boolean;
  /** Controlled open state. When provided, the row is controlled. */
  open?: boolean;
  /** Called with the new open state on toggle. */
  onOpenChange?: (open: boolean) => void;
  /** Optional group label for screen readers. */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function DisclosureRow({
  header,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  accessibilityLabel,
  testID,
  style,
}: DisclosureRowProps) {
  const { colors } = useAppTheme();
  const pressedStyle = usePressedStyle();
  const reducedMotion = useReducedMotion();

  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  // Chevron rotation — 0° closed, 180° open. Under reduced motion the
  // duration is 0, so the chevron snaps to the target rotation on the next
  // animation tick instead of animating.
  const rotation = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  useEffect(() => {
    const target = isOpen ? 1 : 0;
    const anim = Animated.timing(rotation, {
      toValue: target,
      duration: reducedMotion ? 0 : 200,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [isOpen, rotation, reducedMotion]);

  const toggle = () => {
    const next = !isOpen;
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View testID={testID} style={[styles.shell, style]}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.header, pressed ? pressedStyle : null]}
      >
        <View style={styles.headerContent}>{header}</View>
        <Animated.View
          style={{ transform: [{ rotate }] }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <ChevronDown size={18} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>
      {isOpen ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    width: '100%',
  },
  headerContent: {
    flex: 1,
  },
  body: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
});

export default DisclosureRow;

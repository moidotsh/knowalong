// components/MobilePremium/InkPanel.tsx
//
// The inverted-surface primitive — the plate that "ink" surfaces are
// made of: the theme's text color as background, a whisper of print
// grain (pure SVG turbulence, ~5% opacity), and an optional accent
// edge rule. Brand-neutral by construction — it reads whatever palette
// and brand slot the consumer ships, so the same primitive serves a
// consumer whose route transitions, boot moment, and toasts already
// speak the ink language (the drawer joins that family via
// `theme.drawer.style = 'ink'`) and any future surface that wants the
// same material.
//
// Flat air holds: no shadow, no gradient — the grain is the only
// texture and it never tints. Reduced-motion irrelevant (no motion of
// its own; parents animate geometry around it).

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '../../context';
import { INK_GRAIN_BACKGROUND } from './grain';

export interface InkPanelProps {
  children?: React.ReactNode;
  /** The accent edge rule — the platen line that makes the plate read as printed matter. Default: right edge. */
  rule?: boolean;
  /** Which edge carries the rule (default 'right' — the drawer's leading edge). */
  ruleEdge?: 'right' | 'bottom';
  /** Style passthrough for the plate (positioning, radius). */
  style?: StyleProp<ViewStyle>;
}

/**
 * The ink surface: text-color plate + grain + accent edge rule. Compose
 * it as a background layer (absolute fill) or as a self-contained
 * surface; either way the plate color and rule always follow the live
 * theme tokens.
 */
export function InkPanel({ children, rule = true, ruleEdge = 'right', style }: InkPanelProps) {
  const { colors } = useAppTheme();
  // RN's ViewStyle type doesn't declare backgroundImage — RN-web renders
  // it fine, the type just doesn't know (same cast the boot gradients use).
  const grainLayer = {
    backgroundImage: INK_GRAIN_BACKGROUND,
  } as unknown as ViewStyle;
  return (
    <View style={[styles.plate, { backgroundColor: colors.text }, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, grainLayer]} />
      {rule ? (
        <View
          pointerEvents="none"
          style={[
            styles.ruleBase,
            ruleEdge === 'right' ? styles.ruleRight : styles.ruleBottom,
            { backgroundColor: colors.brand },
          ]}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    overflow: 'hidden',
  },
  ruleBase: {
    position: 'absolute',
  },
  ruleRight: {
    top: 0,
    bottom: 0,
    right: 0,
    width: 3,
  },
  ruleBottom: {
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
  },
});

export default InkPanel;

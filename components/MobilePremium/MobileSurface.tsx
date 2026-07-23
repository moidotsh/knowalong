// components/MobilePremium/MobileSurface.tsx
// The single material surface per screen. Surface treatment is gradient +
// hairline + glow + tint; every color reference resolves to
// `useAppTheme().colors.*` (the live palette for the active colorScheme).
// Light is default; dark flips automatically via the ThemeProvider.

import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { isWeb } from '../../utils';
import { useAndroidChromeBlurFix } from '../../hooks';
import { useAppTheme } from '../../context';
import { MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';

export interface MobileSurfaceProps {
  children?: React.ReactNode;
  /** Accent color used for the subtle tint (default: brand slot). */
  accentColor?: string;
  /** Override the surface tint strength (0-1). Default 0.04 (~4% on light, brighter on dark). */
  tintStrength?: number;
  /** Override the border radius. Default 20. */
  borderRadius?: number;
  disableGradient?: boolean;
  disableGlow?: boolean;
  disableBlur?: boolean;
  disableBorder?: boolean;
  /** Padding inside the surface. Default 20. */
  padding?: number | string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function MobileSurface({
  children,
  accentColor,
  tintStrength = 0.04,
  borderRadius = 20,
  disableGradient = false,
  disableGlow = false,
  disableBlur = false,
  disableBorder = false,
  padding = 20,
  style,
  testID,
}: MobileSurfaceProps) {
  const { colors } = useAppTheme();
  const accent = accentColor ?? colors.brand;
  const { isAndroidChrome } = useAndroidChromeBlurFix();

  // On light: tint is a faint darkening (low-alpha accent over white).
  // On dark: tint is a faint lightening (low-alpha accent over dark).
  // The math is the same — both branches composite the accent at low
  // alpha; the visual direction follows the base surface.
  const tintColor = useMemo(() => {
    const hex = accent.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const clamped = Math.max(0, Math.min(1, tintStrength));
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }, [accent, tintStrength]);

  const gradientStyle: ViewStyle | undefined = useMemo(() => {
    if (!isWeb || disableGradient) return undefined;
    const top = colors.mobilePremium.surfaceGradientTop;
    const bottom = colors.mobilePremium.surfaceGradientBottom;
    return {
      backgroundImage: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`,
    } as ViewStyle;
  }, [colors.mobilePremium.surfaceGradientTop, colors.mobilePremium.surfaceGradientBottom, disableGradient]);

  const materialStyle: ViewStyle | undefined = useMemo(() => {
    if (!isWeb) return undefined;
    const glow = disableGlow ? undefined : colors.mobilePremium.surfaceGlow;
    const blurToken = isAndroidChrome
      ? colors.mobilePremium.androidChromeSurfaceBlur
      : colors.mobilePremium.surfaceBackdropBlur;
    const blur = disableBlur ? undefined : blurToken;
    return {
      boxShadow: glow,
      backdropFilter: blur,
      WebkitBackdropFilter: blur,
    } as ViewStyle;
  }, [
    colors.mobilePremium.surfaceGlow,
    colors.mobilePremium.surfaceBackdropBlur,
    colors.mobilePremium.androidChromeSurfaceBlur,
    isAndroidChrome,
    disableGlow,
    disableBlur,
  ]);

  const borderStyle: ViewStyle | undefined = disableBorder
    ? undefined
    : {
        borderWidth: 1,
        borderColor: colors.mobilePremium.hairlineBorder,
      };

  const surfaceBackground = isAndroidChrome
    ? colors.mobilePremium.androidChromeSurfaceBackground
    : tintColor;

  return (
    <View
      testID={testID}
      style={[
        styles.surface,
        { borderRadius, backgroundColor: surfaceBackground, padding: padding as any },
        borderStyle,
        materialStyle,
        { backgroundColor: colors.card },
        style,
      ]}
    >
      {gradientStyle ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { borderRadius }, gradientStyle]}
        />
      ) : null}
      {!disableBorder && isWeb ? (
        <View
          pointerEvents="none"
          style={[
            styles.innerHairline,
            {
              borderRadius: borderRadius - 1,
              borderColor: colors.mobilePremium.hairlineBorderStrong,
            },
          ]}
        />
      ) : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    position: 'relative',
    overflow: 'hidden',
    ...MOBILE_CONTENT_WIDTH_STYLE,
  },
  innerHairline: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderWidth: 1,
    pointerEvents: 'none',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});

export default MobileSurface;

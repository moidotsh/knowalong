// components/MobilePremium/MobilePrimaryButton.tsx
// Primary action button for the mobile premium kit.
//
// Same ~54px height as the original (preserves the 490px fit). The premium
// signal comes from:
//
//   • Subtle vertical gradient (web only) — accent color, with the top ~6%
//     lighter than the bottom. Suggests light hitting a physical button.
//   • Inset top highlight (web only) — a 1px brighter line at the top edge.
//   • Refined outer shadow — accent-tinted glow when enabled, neutral
//     shadow when disabled / loading.
//   • Consistent Respond motion via usePressedStyle (scale 0.98 + 0.9
//     opacity; reduced motion collapses to opacity-only).
//   • typography.mobileAction label (15/600 with slight tracking).
//
// Variants:
//   • 'primary' (default) — filled accent button with gradient + glow.
//   • 'secondary' — transparent background with an accent border. The
//     paired secondary affordance (e.g. Register next to Login).
//   • 'ghost' — transparent background with accent text. For subtle
//     affordances (e.g. "Skip" or "Not now").

import React, { useMemo } from 'react';
// c4-exempt: this button owns its inline loading affordance — embedding
// LoadingSpinner changes the layout (spinner beside the label). The
// button's loading state is a single inline indicator that replaces the
// icon slot — the standard primary-action pattern.
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable, usePressedStyle } from '../premium/shared';
import { isWeb } from '../../utils';
import { theme, MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';
import { useAppTheme } from '../../context';

export interface MobilePrimaryButtonProps {
  /** Button label. */
  children: React.ReactNode;
  /** Press handler. */
  onPress: () => void;
  /** Disabled state. */
  disabled?: boolean;
  /** Loading state — shows an inline spinner in place of the icon and swaps the label for "Please wait…". */
  loading?: boolean;
  /** Override the accent color (defaults to the brand slot). */
  accentColor?: string;
  /**
   * Visual variant.
   *   • 'primary' (default) — filled accent button.
   *   • 'secondary' — accent border, transparent background.
   *   • 'ghost' — accent text, transparent background.
   */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Optional leading or trailing icon. */
  icon?: React.ReactNode;
  /** Icon position (default 'left'). */
  iconPosition?: 'left' | 'right';
  /** Test ID. */
  testID?: string;
  /** Outer style pass-through (rare — e.g. custom margin). */
  style?: StyleProp<ViewStyle>;
}

const ACTION_LABEL_STYLE = {
  fontSize: theme.typography.mobileAction.fontSize,
  fontWeight: theme.typography.mobileAction.fontWeight as any,
  lineHeight: theme.typography.mobileAction.lineHeight,
  letterSpacing: theme.typography.mobileAction.letterSpacing,
} as const;

/**
 * Primary action button — the single primary affordance per screen.
 *
 * One per screen. Use MobileActionFooter to position it consistently.
 */
export function MobilePrimaryButton({
  children,
  onPress,
  disabled = false,
  loading = false,
  accentColor,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  testID,
  style,
}: MobilePrimaryButtonProps) {
  const pressedStyle = usePressedStyle();
  const { colors } = useAppTheme();
  const accent = accentColor ?? colors.brand;
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';

  // The button's material — branches on variant.
  //   primary: gradient (web) + inset highlight + accent-tinted glow.
  //   secondary: transparent background + accent border, no glow.
  //   ghost: transparent background, no border, no glow.
  const materialStyle = useMemo(() => {
    if (isGhost) {
      return {
        backgroundColor: 'transparent',
        borderWidth: 0,
      } as const;
    }
    if (isSecondary) {
      return {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: disabled || loading ? `${accent}40` : accent,
      } as const;
    }
    if (!isWeb) {
      return {
        backgroundColor: disabled || loading ? colors.buttonBackgroundDisabled : accent,
      } as const;
    }
    // Web primary: subtle gradient + inset top highlight + accent-tinted glow.
    const top = `${accent}ff`;
    const bottom = `${accent}d9`; // ~85% — a 15% luminance drop on the bottom
    const glow =
      disabled || loading
        ? '0 2px 8px rgba(15, 23, 42, 0.12)'
        : `0 6px 18px ${accent}33, 0 2px 4px ${accent}24, inset 0 1px 0 rgba(255, 255, 255, 0.18)`;
    return {
      backgroundImage:
        disabled || loading
          ? 'none'
          : `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`,
      backgroundColor: disabled || loading ? colors.buttonBackgroundDisabled : accent,
      boxShadow: glow,
    } as const;
  }, [accent, colors.buttonBackgroundDisabled, disabled, loading, isGhost, isSecondary]);

  const textColor = isPrimary ? colors.textOnBrand : accent;
  const showLeadingIcon = icon && iconPosition === 'left';
  const showTrailingIcon = icon && iconPosition === 'right';

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.button,
        materialStyle,
        { opacity: disabled || loading ? 0.5 : 1 },
        pressed && !disabled ? pressedStyle : null,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          // c4-exempt: inline spinner replaces the icon during loading.
          <ActivityIndicator size="small" color={textColor} style={styles.spinner} />
        ) : showLeadingIcon ? (
          <View style={styles.iconSlot}>{icon}</View>
        ) : null}
        <Text style={[ACTION_LABEL_STYLE, { color: textColor }]}>
          {loading ? 'Please wait\u2026' : children}
        </Text>
        {!loading && showTrailingIcon ? (
          <View style={styles.iconSlot}>{icon}</View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Defensive standalone cap. Buttons LIVE inside the column rather
  // than defining its boundary — MobileActionFooter is the canonical
  // column site for a primary action — but MobilePrimaryButton is also
  // used directly in auth screens (login, register, forgot-password)
  // and on standalone app/index + app/settings surfaces. Preserving
  // the cap on the button itself (carried over from the pre-policy
  // `maxWidth: 420` literal) keeps standalone usage mobile-shaped
  // without relying on every caller wrapping the button. In fluid
  // mode the cap collapses; the button fills whatever width its
  // container provides.
  button: {
    ...MOBILE_CONTENT_WIDTH_STYLE,
    minHeight: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconSlot: {
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: 4,
  },
});

export default MobilePrimaryButton;

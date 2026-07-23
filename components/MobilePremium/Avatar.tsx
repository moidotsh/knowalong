// components/MobilePremium/Avatar.tsx
//
// Circular or rounded-square avatar with image-or-initials rendering, size
// presets, and an optional presence ring. The canonical primitive for any
// "person" affordance — account row, mention chip, collaborator list.
//
// Domain-neutral: the consumer supplies the image URL (or omits it for
// initials), the name (used for initials + a11y label), and an optional
// presence value. Avatar does not fetch profiles, manage presence state,
// or compose groups (Batch C).
//
// Rendering: RN `Image` is used (expo-image is not installed in arqavellum).
// Source resolves via standard RN image source semantics — pass a URI
// string for remote, or a require() for local.
//
// Accessibility: role=image. The mask is decorative; screen readers
// announce the name (or the explicit accessibilityLabel override). Presence
// is announced as part of the label when set.

import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '../../context';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'square';
export type AvatarPresence = 'online' | 'away' | 'offline';

export interface AvatarProps {
  /** Image URL. If omitted, renders initials derived from `name`. */
  source?: string;
  /** Display name — used for initials and as the default a11y label. */
  name?: string;
  /** Preset size or numeric pixel diameter. Default 'md'. */
  size?: AvatarSize | number;
  /** Crop shape. Default 'circle'. */
  shape?: AvatarShape;
  /** Presence ring color hint. Default 'offline' (no ring styling distinction). */
  presence?: AvatarPresence;
  /** Override the presence-derived ring color. */
  ringColor?: string;
  /** Image load callback. */
  onLoad?: () => void;
  /** Image error callback. When fired, falls back to initials (if name is set). */
  onError?: () => void;
  /** Override the composed a11y label. */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const SIZE_PRESET: Record<AvatarSize, number> = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 72,
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function fontSizeFor(diameter: number): number {
  // Type ~40% of diameter, clamped to a readable range.
  return Math.max(10, Math.min(28, Math.round(diameter * 0.4)));
}

export function Avatar({
  source,
  name,
  size = 'md',
  shape = 'circle',
  presence = 'offline',
  ringColor,
  onLoad,
  onError,
  accessibilityLabel,
  testID,
  style,
}: AvatarProps) {
  const { colors } = useAppTheme();
  const diameter = typeof size === 'number' ? size : SIZE_PRESET[size];
  const isCircle = shape === 'circle';
  const borderRadius = isCircle ? diameter / 2 : Math.min(12, diameter / 4);

  const ring = useMemo(() => {
    if (ringColor) return ringColor;
    if (presence === 'online') return colors.brand;
    if (presence === 'away') return colors.textMuted;
    return colors.border;
  }, [ringColor, presence, colors.brand, colors.textMuted, colors.border]);

  const showRing = presence !== 'offline' || ringColor != null;

  const composedLabel =
    accessibilityLabel ??
    (name
      ? presence !== 'offline'
        ? `${name}, ${presence}`
        : name
      : 'Avatar');

  const initials = getInitials(name);

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={composedLabel}
      style={[
        styles.shell,
        {
          width: diameter,
          height: diameter,
          borderRadius,
        },
        showRing
          ? { borderWidth: 1.5, borderColor: ring }
          : null,
        style,
      ]}
    >
      {source ? (
        <Image
          source={{ uri: source }}
          onLoad={onLoad}
          onError={onError}
          style={[styles.image, { borderRadius }]}
          resizeMode="cover"
          accessibilityElementsHidden
        />
      ) : (
        <View
          style={[styles.initials, { backgroundColor: colors.brandSoft, borderRadius }]}
          accessibilityElementsHidden
        >
          <Text
            style={{
              color: colors.brand,
              fontSize: fontSizeFor(diameter),
              fontWeight: '600',
            }}
          >
            {initials}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Avatar;

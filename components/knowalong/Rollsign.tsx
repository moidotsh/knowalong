// components/knowalong/Rollsign.tsx
//
// NIGHT METRO — the destination blind (роллсигн): the lit sign above the
// cab that names where this train is going. The app's signature plate —
// an amber filament edge on the left (the tube), a PT Mono eyebrow (the
// line code), and the destination pressed in the display face. KnowAlong's
// hero moment ("Next stop: Винительный падеж") and its compact section
// plate both render through this one component.
//
// Presentational only: compose MobileSurface for the plate (hairline,
// glow, tint come from the shell kit); this file adds the rollsign's
// own anatomy. All color reads go through the live palette — both
// modes (the night filament and the daytime fill amber) resolve here.

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { MobileSurface } from '../MobilePremium';
import { theme } from '../../constants';
import { useAppTheme } from '../../context';

// The destination face — display family, poster weight. A dedicated
// in-component style (the BRAND_STYLE precedent in MobileHomeHeader):
// the rollsign is chrome with its own rhythm, not a content title, so
// it does not ride a named typography token.
const DESTINATION_STYLE: Record<'lg' | 'md', TextStyle> = {
  lg: { fontSize: 22, lineHeight: 30, fontWeight: '700', letterSpacing: 0.2 },
  md: { fontSize: 16, lineHeight: 22, fontWeight: '700', letterSpacing: 0.2 },
} as const;

export interface RollsignProps {
  /** The destination — where this train is going (the lesson, the deck). */
  destination: string;
  /** The line code above the destination ("LINE 02 · CASES"). */
  eyebrow?: string;
  /** Optional right-side ledger note (a count, a distance). */
  meta?: string;
  /** 'lg' — the hero blind (home); 'md' — the section blind. */
  size?: 'lg' | 'md';
  /** When set the whole plate is a button (open the destination). */
  onPress?: () => void;
  /** Test ID — also suffixed onto the filament (-filament). */
  testID?: string;
  /** Outer style pass-through (lands on the MobileSurface). */
  style?: StyleProp<ViewStyle>;
}

export function Rollsign({
  destination,
  eyebrow,
  meta,
  size = 'lg',
  onPress,
  testID,
  style,
}: RollsignProps) {
  const { colors } = useAppTheme();

  const body = (
    <>
      {/* The filament — the lit tube running the plate's full height. */}
      <View
        testID={testID != null ? `${testID}-filament` : undefined}
        style={[styles.filament, { backgroundColor: colors.brand }]}
      />
      <View style={styles.textBlock}>
        {eyebrow != null ? (
          <Text style={[styles.eyebrow, { color: colors.textMuted }]}>{eyebrow}</Text>
        ) : null}
        <Text
          style={[styles.destination, DESTINATION_STYLE[size], { color: colors.text }]}
          numberOfLines={2}
        >
          {destination}
        </Text>
      </View>
      {meta != null ? (
        <Text style={[styles.meta, { color: colors.textMuted }]}>{meta}</Text>
      ) : null}
    </>
  );

  return (
    <MobileSurface
      testID={testID}
      style={[styles.plate, style]}
      accentColor={colors.brand}
    >
      {onPress != null ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={destination}
          style={({ pressed }) => [styles.inner, pressed ? { opacity: 0.6 } : null]}
        >
          {body}
        </Pressable>
      ) : (
        <View style={styles.inner}>{body}</View>
      )}
    </MobileSurface>
  );
}

const styles = StyleSheet.create({
  plate: {
    padding: 0,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  filament: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    ...theme.typography.mobileEyebrow,
    textTransform: 'uppercase',
  },
  destination: {
    fontFamily: theme.fonts.display,
  },
  meta: {
    ...theme.typography.mobileLedger,
  },
});

export default Rollsign;

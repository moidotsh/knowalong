// components/MobilePremium/LangToggle.tsx
//
// The language pill — the one-gesture surface toggle for consumers on
// the i18n seam (utils/i18n.ts). A segmented two-language chip: the
// active language reads as ink on paper (the inverted segment), the
// resting one as muted text; one tap flips the persisted lang store
// and every mounted catalog surface re-renders in place.
//
// Shell-level: reads/writes the seam's store, renders the two Lang
// union values with optional label overrides (a consumer whose chrome
// says 'EN' / 'FR' needs no props; one with different casing or a
// third language edits the seam's union and passes labels).

import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../../constants';
import { useAppTheme } from '../../context';
import { useLangStore, type Lang } from '../../utils';

const LANG_ORDER: readonly Lang[] = ['en', 'fr'];

export interface LangToggleProps {
  /** Per-language label overrides (defaults to the uppercased code). */
  labels?: Partial<Record<Lang, string>>;
  /** A11y label for the whole control. Default "Language". */
  accessibilityLabel?: string;
  /** Test ID. */
  testID?: string;
  /** Outer style pass-through. */
  style?: StyleProp<ViewStyle>;
}

export function LangToggle({
  labels,
  accessibilityLabel = 'Language',
  testID,
  style,
}: LangToggleProps) {
  const { colors } = useAppTheme();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.pill, { borderColor: colors.cardBorder }, style]}
    >
      {LANG_ORDER.map((code) => {
        const active = code === lang;
        const label = labels?.[code] ?? code.toUpperCase();
        return (
          <Pressable
            key={code}
            onPress={() => {
              if (!active) setLang(code);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${accessibilityLabel}: ${label}`}
            style={[
              styles.segment,
              active ? { backgroundColor: colors.text } : null,
            ]}
          >
            <Text
              style={[
                styles.label,
                // The mono face when one is declared — a code chip reads
                // as ledger output.
                { fontFamily: theme.fonts.mono },
                { color: active ? colors.background : colors.textMuted },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.shapes.tag === 999 ? 999 : theme.shapes.tag + 2,
    padding: 2,
    gap: 2,
    alignSelf: 'flex-start',
  },
  segment: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.shapes.tag === 999 ? 999 : theme.shapes.tag,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});

export default LangToggle;

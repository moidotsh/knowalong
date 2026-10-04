// components/MobilePremium/MobileCheckboxItem.tsx
// Premium checkbox row for consent screens.
//
// Premium signals:
//   • Refined tap target — 44px min height (legacy was ~62px including
//     padding, which ate too much of the 490px budget on long checklists).
//   • Animated check — fades + scales in on toggle (legacy was instant).
//   • Considered typography — title uses typography.mobileFieldLabel
//     (13/600), subtitle uses 12/400 muted.
//   • Surface-tinted background when checked (subtle, no thick accent bar).
//
// API compatibility: accepts both `title`/`subtitle` and `label`/`helperText`
// prop pairs (same values, different prop names). Consumers can use whichever
// pair fits their calling convention; the component resolves
// `title ?? label` and `subtitle ?? helperText`.

import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { usePressedStyle } from '../premium/shared';
import { theme } from '../../constants';
import { useAppTheme } from '../../context';
import { CheckBox } from './CheckBox';

export interface MobileCheckboxItemProps {
  /** Checkbox title. `title` is the primary prop name. */
  title?: string;
  /** Optional supporting copy under the title. `subtitle` is the primary prop name. */
  subtitle?: string;
  /** Checkbox label. Alternative alias for `title`. */
  label?: string;
  /** Helper text. Alternative alias for `subtitle`. */
  helperText?: string;
  /** Current checked state. */
  checked: boolean;
  /** Toggle handler. */
  onToggle: () => void;
  /** Accent color (default theme brand). */
  accentColor?: string;
  /** Test ID. */
  testID?: string;
  /** Outer style pass-through. */
  style?: StyleProp<ViewStyle>;
}

const TITLE_STYLE = theme.typography.mobileFieldLabel;

const SUBTITLE_STYLE = {
  fontSize: 12,
  fontWeight: '400',
  lineHeight: 16,
  letterSpacing: 0,
} as const;

/**
 * Premium checkbox row for consent / acknowledgment screens.
 *
 * Tap target is a minimum 44px tall (the iOS HIG minimum). Use inside a
 * MobileSurface for the considered material treatment.
 */
export function MobileCheckboxItem({
  title,
  subtitle,
  label,
  helperText,
  checked,
  onToggle,
  accentColor,
  testID,
  style,
}: MobileCheckboxItemProps) {
  const { colors } = useAppTheme();
  const accent = accentColor ?? colors.brand;
  const pressedStyle = usePressedStyle();

  const resolvedTitle = title ?? label ?? '';
  const resolvedSubtitle = subtitle ?? helperText;

  return (
    <Pressable
      testID={testID}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: checked ? `${accent}0f` : colors.glass.inputBackground,
          borderColor: checked ? `${accent}40` : colors.mobilePremium.hairlineBorder,
        },
        pressed ? pressedStyle : null,
        style,
      ]}
    >
      {/* Checkbox indicator */}
      <CheckBox checked={checked} accentColor={accentColor} />

      {/* Text */}
      <View style={styles.text}>
        <Text style={[TITLE_STYLE, { color: colors.text }]}>{resolvedTitle}</Text>
        {resolvedSubtitle ? (
          <Text style={[SUBTITLE_STYLE, { color: colors.textMuted }]}>
            {resolvedSubtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: theme.shapes.tile,
    borderWidth: 1,
    paddingHorizontal: 14,
    // 44px min tap target. With the 12px vertical padding, the total
    // height is ~44px when there's no subtitle, ~60px with subtitle.
    paddingVertical: 12,
    minHeight: 44,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});

export default MobileCheckboxItem;

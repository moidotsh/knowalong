// components/MobilePremium/MobileSelectionList.tsx
// Premium selection list for mobile wizard steps.
//
// Premium signals:
//   • No grey container — each row uses `colors.glass.inputBackground`
//     (subtle tint) when unselected and an accent tint (`${accent}0f`)
//     when selected, matching MobileCheckboxItem's material language.
//   • Hairline border — `colors.mobilePremium.hairlineBorder` unselected,
//     `${accent}40` selected. Precision edge, no thick outline.
//   • Animated indicator — single-select renders a radio ring with a dot
//     that scales+fades in on selection; multi-select reuses the Check
//     icon treatment from MobileCheckboxItem verbatim.
//   • 44px min tap target (iOS HIG). Title 13/600 via
//     `typography.mobileFieldLabel`; subtitle 12/400 muted.
//   • Optional per-option icon slot.

import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { CheckBox } from './CheckBox';
import { usePressedStyle, useAnimatedFlag } from '../premium/shared';
import { theme } from '../../constants';
import { useAppTheme } from '../../context';

export interface MobileSelectionOption {
  /** Stable id for the option. */
  id: string;
  /** Display label. */
  label: string;
  /** Optional supporting copy. */
  description?: string;
  /** Optional leading icon. */
  icon?: React.ReactNode;
}

export interface MobileSelectionListProps {
  options: MobileSelectionOption[];
  /** Currently selected option id (single-select mode, the default). */
  selectedId?: string | null;
  /** Selection handler. In single-select mode receives the new id. */
  onSelect?: (id: string) => void;
  /** Enable multi-select mode. When true, `selectedIds` is the source of truth. */
  multiSelect?: boolean;
  /** Selected ids in multi-select mode. */
  selectedIds?: string[];
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
 * Premium selection list for mobile wizard steps. Use inside a MobileSurface
 * for the considered material treatment. Single-select by default; flip
 * `multiSelect` for checklist-style steps.
 */
export function MobileSelectionList({
  options,
  selectedId,
  onSelect,
  multiSelect = false,
  selectedIds,
  accentColor,
  testID,
  style,
}: MobileSelectionListProps) {
  const { colors } = useAppTheme();
  const accent = accentColor ?? colors.brand;
  const pressedStyle = usePressedStyle();

  return (
    <View testID={testID} style={[styles.container, style]}>
      {options.map((option) => {
        const isSelected = multiSelect
          ? !!selectedIds && selectedIds.includes(option.id)
          : selectedId === option.id;

        return (
          <SelectionRow
            key={option.id}
            option={option}
            isSelected={isSelected}
            multiSelect={multiSelect}
            accent={accent}
            pressedStyle={pressedStyle}
            titleColor={colors.text}
            subtitleColor={colors.textColors.tertiary}
            hairlineBorder={colors.mobilePremium.hairlineBorder}
            inputBackground={colors.glass.inputBackground}
            borderColorStrong={colors.border}
            onSelect={onSelect ?? (() => {})}
          />
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Row (split out so each row owns its own animation values without
// remounting siblings on selection change)
// ─────────────────────────────────────────────────────────────────────

interface SelectionRowProps {
  option: MobileSelectionOption;
  isSelected: boolean;
  multiSelect: boolean;
  accent: string;
  pressedStyle: ViewStyle;
  titleColor: string;
  subtitleColor: string;
  hairlineBorder: string;
  inputBackground: string;
  borderColorStrong: string;
  onSelect: (id: string) => void;
}

function SelectionRow({
  option,
  isSelected,
  multiSelect,
  accent,
  pressedStyle,
  titleColor,
  subtitleColor,
  hairlineBorder,
  inputBackground,
  borderColorStrong,
  onSelect,
}: SelectionRowProps) {
  const { colors } = useAppTheme();
  // Animated indicator — one 0..1 flag value drives scale + fade.
  const progress = useAnimatedFlag(isSelected, { duration: 180 });

  return (
    <Pressable
      onPress={() => onSelect(option.id)}
      accessibilityRole={multiSelect ? 'checkbox' : 'radio'}
      accessibilityState={{ selected: isSelected, checked: isSelected }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: isSelected ? `${accent}0f` : inputBackground,
          borderColor: isSelected ? `${accent}40` : hairlineBorder,
        },
        pressed ? pressedStyle : null,
      ]}
    >
      {/* Indicator */}
      {multiSelect ? (
        // The kit's bare checkbox indicator — same geometry + animation
        // MobileCheckboxItem renders.
        <CheckBox checked={isSelected} accentColor={accent} size={22} checkSize={14} />
      ) : (
        // Radio ring — always visible border; filled dot scales in on selection.
        <View
          style={[
            styles.radio,
            {
              borderColor: isSelected ? accent : borderColorStrong,
            },
          ]}
        >
          <Animated.View
            style={{
              opacity: progress,
              transform: [{ scale: progress }],
              backgroundColor: accent,
              width: 12,
              height: 12,
              borderRadius: 6,
            }}
          />
        </View>
      )}

      {/* Optional icon (compact left slot) */}
      {option.icon ? <View style={styles.iconSlot}>{option.icon}</View> : null}

      {/* Text */}
      <View style={styles.text}>
        <Text style={[TITLE_STYLE, { color: titleColor }]}>{option.label}</Text>
        {option.description ? (
          <Text style={[SUBTITLE_STYLE, { color: subtitleColor }]}>{option.description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: theme.shapes.tile,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
});

export default MobileSelectionList;

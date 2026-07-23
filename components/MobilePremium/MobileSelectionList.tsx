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

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check } from '@tamagui/lucide-icons-2';
import { usePressedStyle } from '../premium/shared';
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

const TITLE_STYLE = {
  fontSize: theme.typography.mobileFieldLabel.fontSize,
  fontWeight: theme.typography.mobileFieldLabel.fontWeight as any,
  lineHeight: theme.typography.mobileFieldLabel.lineHeight,
  letterSpacing: theme.typography.mobileFieldLabel.letterSpacing,
} as const;

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
  // Animated indicator — scale + fade in on selection.
  const scale = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const opacity = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    const target = isSelected ? 1 : 0;
    const scaleAnim = Animated.timing(scale, {
      toValue: target,
      duration: 180,
      useNativeDriver: true,
    });
    const opacityAnim = Animated.timing(opacity, {
      toValue: target,
      duration: 180,
      useNativeDriver: true,
    });
    scaleAnim.start();
    opacityAnim.start();
    return () => {
      scaleAnim.stop();
      opacityAnim.stop();
    };
  }, [isSelected, scale, opacity]);

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
        // Check style — mirrors MobileCheckboxItem exactly.
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: isSelected ? accent : 'transparent',
              borderColor: isSelected ? accent : borderColorStrong,
            },
          ]}
        >
          <Animated.View style={{ opacity, transform: [{ scale }] }}>
            <Check size={14} color={colors.textOnBrand} strokeWidth={3} />
          </Animated.View>
        </View>
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
              opacity,
              transform: [{ scale }],
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
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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

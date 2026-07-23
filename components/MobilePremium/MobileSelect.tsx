// components/MobilePremium/MobileSelect.tsx
// Bottom-sheet selector for the mobile premium kit.
//
// Mobile-only by nature. The trigger mirrors MobileInput's 54px styling so
// the form rhythm is consistent.
//
// c2-exempt: this file uses RN Modal for the mobile bottom-sheet
// selection. MobileSelect is designed to render INSIDE a MobileSurface
// (which has overflow:hidden + borderRadius). The shared Dialog renders
// inline with position:absolute and cannot escape ancestor clipping —
// Dialog gets cropped by the surface and loses the z-index battle with
// the primary action. RN Modal renders in a native OS-level portal above
// all content, which is the only way to reliably escape ancestor clipping
// without restructuring the component tree.

import React, { useMemo, useState } from 'react';
// c2-exempt: Modal import — see file header for the portal-escape justification.
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check, ChevronDown, X } from '@tamagui/lucide-icons-2';
import { isWeb } from '../../utils';
import { useFocusRing, usePressedStyle } from '../premium/shared';
import { theme, MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';
import { useAppTheme } from '../../context';

export interface MobileSelectOption {
  /** Stable value stored when the option is picked. */
  value: string;
  /** Label shown in the trigger and the option row. */
  label: string;
  /** Optional supporting copy shown under the label in the sheet. */
  description?: string;
  /** Optional leading icon. Mirrors MobileSelectionList's icon slot. */
  icon?: React.ReactNode;
}

export interface MobileSelectProps {
  /** Currently selected value. */
  value: string;
  /** Callback when selection changes. */
  onValueChange?: (value: string) => void;
  /** Legacy alias of `onValueChange`. */
  onSelect?: (value: string) => void;
  /** Options to choose from. */
  options: MobileSelectOption[];
  /** Label shown above the trigger. */
  label?: string;
  /** Placeholder when no value is selected. */
  placeholder?: string;
  /** Accent color (default theme brand). */
  accentColor?: string;
  /** Disabled state. */
  disabled?: boolean;
  /** Sheet title (default = label). */
  sheetTitle?: string;
  /** Test ID. */
  testID?: string;
  /** Outer style pass-through. */
  style?: StyleProp<ViewStyle>;
}

const FIELD_LABEL_STYLE = {
  fontSize: theme.typography.mobileFieldLabel.fontSize,
  fontWeight: theme.typography.mobileFieldLabel.fontWeight as any,
  lineHeight: theme.typography.mobileFieldLabel.lineHeight,
  letterSpacing: theme.typography.mobileFieldLabel.letterSpacing,
} as const;

/**
 * Bottom-sheet selector for mobile forms. Use anywhere a mobile form needs
 * to pick from a fixed list of options.
 */
export function MobileSelect({
  value,
  onValueChange,
  onSelect,
  options,
  label,
  placeholder = 'Select an option',
  accentColor,
  disabled = false,
  sheetTitle,
  testID,
  style,
}: MobileSelectProps) {
  const [open, setOpen] = useState(false);
  const { colors } = useAppTheme();
  const accent = accentColor ?? colors.brand;
  const pressedStyle = usePressedStyle();
  const { ringStyle, glowStyle } = useFocusRing({ color: accent, focused: open });

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  const triggerBorderColor = open ? `${accent}66` : colors.glass.emptyInputBorder;
  const triggerBg = open ? colors.glass.inputFocusBackground : colors.glass.inputBackground;
  const labelColor = open ? accent : colors.text;

  const handleChange = (val: string) => {
    if (onValueChange) onValueChange(val);
    else onSelect?.(val);
    setOpen(false);
  };

  return (
    <View testID={testID} style={[styles.group, style]}>
      {label ? <Text style={[FIELD_LABEL_STYLE, { color: labelColor }]}>{label}</Text> : null}

      <View style={styles.triggerWrap}>
        <Pressable
          onPress={() => !disabled && setOpen(true)}
          disabled={disabled}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.trigger,
            {
              borderColor: triggerBorderColor,
              backgroundColor: triggerBg,
            },
            glowStyle,
            pressed ? pressedStyle : null,
            disabled ? { opacity: 0.5 } : null,
          ]}
        >
          {selected?.icon ? (
            <View style={{ marginRight: 8 }}>{selected.icon}</View>
          ) : null}
          <Text
            style={[
              styles.triggerLabel,
              { color: selected ? colors.text : colors.textColors.tertiary },
            ]}
            numberOfLines={1}
          >
            {selected ? selected.label : placeholder}
          </Text>
          <ChevronDown size={20} color={open ? accent : colors.textColors.muted} />
        </Pressable>
        {/* Focus ring overlay — same rhythm as MobileInput. */}
        <Animated.View pointerEvents="none" style={ringStyle} />
      </View>

      {/*
        c2-exempt: MobileSelect renders inside a MobileSurface (overflow:hidden
        + borderRadius). RN Modal is the only way to escape the surface
        clipping for the bottom sheet. See file header for full justification.
      */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.scrim} onPress={() => setOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.sheet,
              { backgroundColor: colors.card },
              isWeb
                ? ({ backdropFilter: colors.mobilePremium.surfaceBackdropBlur } as ViewStyle)
                : null,
            ]}
          >
            {/* Handle bar */}
            <View style={[styles.handleBar, { backgroundColor: colors.mobilePremium.hairlineBorder }]} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {sheetTitle ?? label ?? placeholder}
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={8}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close sheet"
              >
                <X size={22} color={colors.textColors.muted} />
              </Pressable>
            </View>

            {/* Options */}
            <ScrollView style={styles.optionList} showsVerticalScrollIndicator>
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => handleChange(opt.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        backgroundColor: isSelected ? `${accent}14` : 'transparent',
                        borderColor: isSelected ? accent : colors.mobilePremium.hairlineBorder,
                      },
                      pressed ? { transform: [{ scale: 0.99 }], opacity: 0.92 } : null,
                    ]}
                  >
                    {opt.icon ? <View style={{ marginRight: 12 }}>{opt.icon}</View> : null}
                    <View style={styles.optionText}>
                      <Text
                        style={[
                          styles.optionLabel,
                          {
                            color: isSelected ? accent : colors.text,
                            fontWeight: isSelected ? '600' : '400',
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {opt.description ? (
                        <Text style={[styles.optionDesc, { color: colors.textColors.tertiary }]}>
                          {opt.description}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <View style={[styles.optionCheck, { backgroundColor: accent }]}>
                        <Check size={12} color={colors.textOnBrand} strokeWidth={3} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
        {/* c2-exempt: closing tag of the exempt Modal opened above. */}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 6,
    ...MOBILE_CONTENT_WIDTH_STYLE,
    marginBottom: 16,
  },
  triggerWrap: {
    position: 'relative',
  },
  trigger: {
    height: 54,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    paddingRight: 8,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  // Light-mode sheet — picks up the surface treatment from the theme.
  // Background color is applied inline (from useAppTheme) so it tracks
  // colorScheme. Not pure white — a touch of warmth so it reads as a
  // surface, not a popup. The policy spread lands on this sheet panel
  // (the visible portal content) — NOT on the Modal root or scrim —
  // because the panel portals via RN Modal and would otherwise take
  // the full viewport width, breaking the mobile column at wide
  // viewports. This is the load-bearing SB2 case.
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '70%',
    ...MOBILE_CONTENT_WIDTH_STYLE,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
    alignSelf: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  optionList: {
    maxHeight: 360,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
  },
  optionDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  optionCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

export default MobileSelect;

// components/MobilePremium/MobileSelect.tsx
// Bottom-sheet selector for the mobile premium kit.
//
// Mobile-only by nature. The trigger mirrors MobileInput's 54px styling so
// the form rhythm is consistent. The sheet itself is the canonical
// MobileSheet (dialog role, focus return, Escape-to-close, backdrop tap)
// — MobileSelect owns only the trigger and the option rows.

import React, { useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check, ChevronDown } from '@tamagui/lucide-icons-2';
import { useFocusRing, usePressedStyle, useFieldChrome, FIELD_GROUP_STYLE } from '../premium/shared';
import { theme } from '../../constants';
import { useAppTheme } from '../../context';
import { MobileSheet } from './MobileSheet';

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

// The token object IS the style — reference it directly.
const FIELD_LABEL_STYLE = theme.typography.mobileFieldLabel;

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
  const accent = accentColor ?? colors.text;
  const pressedStyle = usePressedStyle();
  const { ringStyle } = useFocusRing({ color: accent, focused: open, duration: 0, radius: theme.shapes.control });

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  const { borderColor: triggerBorderColor, backgroundColor: triggerBg, labelColor } = useFieldChrome({
    focused: open,
    accent,
  });

  const handleChange = (val: string) => {
    if (onValueChange) onValueChange(val);
    else onSelect?.(val);
    setOpen(false);
  };

  return (
    <View testID={testID} style={[FIELD_GROUP_STYLE, style]}>
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
              { color: selected ? colors.text : colors.textSecondary },
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

      <MobileSheet
        open={open}
        onOpenChange={setOpen}
        title={sheetTitle ?? label ?? placeholder}
        accentColor={accent}
        showHandle
        style={styles.optionSheet}
      >
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
      </MobileSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  triggerWrap: {
    position: 'relative',
  },
  trigger: {
    height: 54,
    borderWidth: 1.5,
    borderRadius: theme.shapes.control,
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
  // The option sheet caps shorter than MobileSheet's default 85% — a
  // picker list rarely needs the tall sheet.
  optionSheet: {
    maxHeight: '70%',
  },
  optionList: {
    maxHeight: 360,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.shapes.tile,
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

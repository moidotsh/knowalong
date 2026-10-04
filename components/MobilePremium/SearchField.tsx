// components/MobilePremium/SearchField.tsx
// Compact pill search input on the FilterChip geometry — the search
// counterpart to the chip row it usually sits beside: same 36px height,
// same pill radius, same 13px type, same card/border treatment, plus the
// kit's animated focus ring. Revealed by a chip or shown inline; either
// way it reads as one family with the chips around it, not a foreign
// platform input.
//
// Domain-neutral: the consumer owns the query state and what searching
// does. The field owns the look, the leading icon, the clear button, and
// the focus treatment.

import React, { useMemo, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Search, X } from '@tamagui/lucide-icons-2';
import { theme } from '../../constants';
import { useFocusRing } from '../premium/shared';
import { useAppTheme } from '../../context';

export interface SearchFieldProps {
  /** Current query. */
  value: string;
  /** Called with the new query on every keystroke. */
  onChangeText: (text: string) => void;
  /** Placeholder. Default "Search". */
  placeholder?: string;
  /** Focus the field on mount (the reveal moment). */
  autoFocus?: boolean;
  /** Called when the field gains focus. */
  onFocus?: () => void;
  /** Called when the field loses focus. */
  onBlur?: () => void;
  /** Called on Enter / Go. */
  onSubmitEditing?: () => void;
  /** Override the accent (defaults to the resolved text ink — focus is an ink moment). */
  accentColor?: string;
  /** Screen-reader label. Default "Search". */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search',
  autoFocus = false,
  onFocus,
  onBlur,
  onSubmitEditing,
  accentColor,
  accessibilityLabel = 'Search',
  testID,
  style,
}: SearchFieldProps) {
  const { colors } = useAppTheme();
  const accent = accentColor ?? colors.text;
  const [isFocused, setIsFocused] = useState(false);

  const { ringStyle } = useFocusRing({ color: accent, focused: isFocused, duration: 0, radius: theme.shapes.control });

  const borderColor = useMemo(
    () => (isFocused ? `${accent}66` : colors.border),
    [isFocused, accent, colors.border],
  );

  return (
    <View style={[styles.wrap, style]} testID={testID}>
      <View style={styles.iconSlot} pointerEvents="none">
        <Search size={14} color={isFocused ? accent : colors.textSecondary} />
      </View>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        style={[styles.input, { borderColor, backgroundColor: colors.card, color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textColors.tertiary}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        onFocus={() => {
          setIsFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setIsFocused(false);
          onBlur?.();
        }}
        onSubmitEditing={onSubmitEditing}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={styles.clear}
        >
          <X size={14} color={colors.textSecondary} />
        </Pressable>
      ) : null}
      {/* Focus ring — Animated.View because opacity is an Animated.Value. */}
      <Animated.View pointerEvents="none" style={ringStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderRadius: theme.shapes.tag,
  },
  // FilterChip's geometry family; the input type reads the ramp's row
  // token (an ad-hoc literal here was drift-class — inputs read like
  // every other field).
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: theme.shapes.tag,
    borderWidth: 1,
    paddingHorizontal: 34,
    fontSize: theme.typography.mobileTitle.fontSize,
    lineHeight: theme.typography.mobileTitle.lineHeight,
    paddingBottom: 8,
    paddingTop: 8,    // Suppress WebKit's UA focus ring — the kit's animated ring + the
    // accent border carry focus (a system-blue glow reads as a second
    // accent).
    outlineWidth: 0,
  },
  iconSlot: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  clear: {
    position: 'absolute',
    right: 10,
    zIndex: 1,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SearchField;

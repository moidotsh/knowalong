// components/MobilePremium/MobileInput.tsx
// Refined text input — premium read on the same 54px height.
//
// Preserves the 490px test fit by keeping the same input height. The
// premium signal comes from:
//
//   • Considered label rhythm — uses typography.mobileFieldLabel,
//     with the label sitting tighter to the input (gap 6 vs 8 in legacy).
//   • Focus is an ink moment — the ring rides the host's shape (no
//     corner the field doesn't have), snaps (no fade), wears no halo,
//     and reads the mode's ink, never the brand slot: on any consumer
//     whose brand reads as an alarm hue, a brand focus ring is
//     indistinguishable from the error state.
//   • Refined error state — the error text moves to a dedicated slot
//     beneath the input (not in the helper-text slot), so the label row
//     never reflows on error.
//   • Subtle accent-tinted background — picks up the surface beneath.
//   • Optional left/right icon slots (e.g. mail icon, eye toggle).
//
// Backward-compat: `helperText` and `errorText` from the original arqavellum
// API are preserved — `errorText` maps to the new `error` slot, `helperText`
// renders below the input when no error is present.

import React, { useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useFocusRing, useFieldChrome, FIELD_GROUP_STYLE } from '../premium/shared';
import { theme } from '../../constants';
import { useAppTheme } from '../../context';

export interface MobileInputProps {
  /** Label shown above the input. */
  label: string;
  /** Current value. */
  value: string;
  /** Callback when text changes. */
  onChangeText: (text: string) => void;
  /** Called when the field loses focus (commit-on-blur drafts). */
  onBlur?: () => void;
  /** Called when the field is submitted (Enter / return key). */
  onSubmitEditing?: () => void;
  /** Return-key hint (web Enter / native return key). */
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  /** Placeholder text. */
  placeholder?: string;
  /** Error message — rendered in a dedicated slot beneath the input. Alias of `error`. */
  errorText?: string;
  /** Error message — rendered in a dedicated slot beneath the input. */
  error?: string;
  /** Helper text — rendered below the input when no error is present. */
  helperText?: string;
  /** Mask the input (PIN / password). */
  secureTextEntry?: boolean;
  /** Auto-capitalize behavior (default 'none'). */
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Auto-correct (default false). */
  autoCorrect?: boolean;
  /** Keyboard type. */
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  /** Auto-complete hint (web + native). */
  autoComplete?: string;
  /** Auto-focus on mount. */
  autoFocus?: boolean;
  /** Max character length. */
  maxLength?: number;
  /** Optional left icon. */
  icon?: React.ReactNode;
  /** Optional right icon (e.g. eye toggle for password visibility). */
  rightIcon?: React.ReactNode;
  /** Press handler for the right icon. */
  onRightIconPress?: () => void;
  /** Accent color (default theme ink — pass to borrow the brand deliberately). */
  accentColor?: string;
  /** Disabled state. */
  editable?: boolean;
  /** Make the whole input area trigger `onPress` (e.g. for non-editable selectors). */
  onPress?: () => void;
  /**
   * Multiline entry (longer pastes — descriptions, notes): the field
   * grows to `numberOfLines` rows and scrolls internally once full.
   * Single-line (default) keeps the fixed 54px control height.
   */
  multiline?: boolean;
  /** Rows shown when `multiline` (default 4). */
  numberOfLines?: number;
  /** Test ID. */
  testID?: string;
  /** Outer style pass-through. */
  style?: StyleProp<ViewStyle>;
}

// The token object IS the style — spread/reference it directly.
const FIELD_LABEL_STYLE = theme.typography.mobileFieldLabel;

/**
 * Refined text input for the mobile premium kit.
 *
 * Same 54px height as the legacy arqavellum input. Same children-style API for
 * easy swap-in, plus the new icon / focus-ring / dedicated-error features.
 */
export function MobileInput({
  label,
  value,
  onChangeText,
  onBlur,
  onSubmitEditing,
  returnKeyType,
  placeholder,
  errorText,
  error,
  helperText,
  secureTextEntry = false,
  autoCapitalize = 'none',
  autoCorrect = false,
  keyboardType = 'default',
  autoComplete,
  autoFocus = false,
  maxLength,
  icon,
  rightIcon,
  onRightIconPress,
  accentColor,
  editable = true,
  onPress,
  multiline = false,
  numberOfLines = 4,
  testID,
  style,
}: MobileInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { colors } = useAppTheme();
  // Focus is an ink moment: the field you are writing in reads the
  // mode's ink, not the brand slot. Pass accentColor to borrow the
  // brand deliberately.
  const accent = accentColor ?? colors.text;
  const resolvedError = error ?? errorText;
  const hasError = !!resolvedError;

  // The ring rides the host's shape and snaps — no halo.
  const { ringStyle } = useFocusRing({
    color: accent,
    focused: isFocused && !hasError,
    duration: 0,
    radius: theme.shapes.control,
  });

  // Border / background / label respond to focus + error — the shared
  // field-chrome mapping (one rhythm across the form trio).
  const { borderColor, backgroundColor, labelColor } = useFieldChrome({
    focused: isFocused,
    hasError,
    accent,
  });
  const isClickable = onPress !== undefined;

  return (
    <View style={[FIELD_GROUP_STYLE, style]} testID={testID}>
      {/* Label — typography.mobileFieldLabel rhythm. */}
      <Text style={[FIELD_LABEL_STYLE, { color: labelColor }]}>{label}</Text>

      {/* Input row */}
      <Pressable onPress={onPress} style={styles.inputContainer}>
        {icon ? (
          <View style={styles.leftIcon} pointerEvents="none">
            {icon}
          </View>
        ) : null}

        <View style={styles.inputInner}>
          <TextInput
            style={[
              styles.input,
              {
                borderColor,
                backgroundColor,
                color: colors.text,
              },
              icon ? { paddingLeft: 50 } : null,
              // Multiline trades the fixed control height for a row-count
              // box (22px line + 32px padding — the same metrics the 54px
              // single-line height is built from) and anchors type at the top.
              multiline
                ? { height: 22 * numberOfLines + 32, textAlignVertical: 'top' as const }
                : null,
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            keyboardType={keyboardType}
            autoComplete={autoComplete as any}
            onSubmitEditing={onSubmitEditing}
            returnKeyType={returnKeyType}
            autoFocus={autoFocus}
            maxLength={maxLength}
            editable={!!editable && !isClickable}
            multiline={multiline}
            numberOfLines={multiline ? numberOfLines : undefined}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              onBlur?.();
            }}
          />
          {/* Focus ring — Animated.View because opacity is an Animated.Value. */}
          <Animated.View pointerEvents="none" style={ringStyle} />
        </View>

        {rightIcon ? (
          <Pressable
            onPress={onRightIconPress ?? onPress}
            style={styles.rightIcon}
            hitSlop={8}
          >
            {rightIcon}
          </Pressable>
        ) : null}
      </Pressable>

      {/* Error slot — dedicated line below the input so the label row never reflows. */}
      {hasError ? (
        <Text style={[styles.errorText, { color: colors.status.error }]} numberOfLines={2}>
          {resolvedError}
        </Text>
      ) : helperText ? (
        <Text style={[styles.helperText, { color: colors.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    position: 'relative',
  },
  inputInner: {
    position: 'relative',
    borderRadius: theme.shapes.control,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: theme.shapes.control,
    padding: 16,
    paddingRight: 50,
    fontSize: theme.typography.mobileTitle.fontSize,
    lineHeight: theme.typography.mobileTitle.lineHeight,
    fontWeight: '500',
    height: 54,
    // WebKit's UA focus ring (`outline: auto`) ignores the kit ring and
    // glows system blue on RN-web inputs.
    outlineWidth: 0,
  },
  leftIcon: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  rightIcon: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: theme.typography.mobileMeta.fontSize,
    fontWeight: '500',
    lineHeight: theme.typography.mobileMeta.lineHeight,
    marginTop: 2,
  },
  helperText: {
    fontSize: theme.typography.mobileMeta.fontSize,
    lineHeight: theme.typography.mobileMeta.lineHeight,
    marginTop: 2,
  },
});

export default MobileInput;

// components/MobilePremium/CopyForAiButton.tsx
// Dev-helper button for the "Copy for AI" pattern. Drops into a screen's
// header (MobileHeader.navRightAction or MobileHomeHeader.rightAction)
// and builds a one-tap path from the current screen to an AI chat.
//
// The button is shell-level and domain-neutral. It accepts a pre-built
// `payload` string (use `buildAiPayload` from `utils/`) so the screen
// owns what gets copied. The button owns the visual treatment, the
// clipboard call, the success/failure toast, and the logger calls.
//
// Variants:
//   • 'ghost'    — transparent background, secondary text. For the
//                  compact nav-mode header row alongside the back chevron
//                  and dismiss X. Default.
//   • 'subtle'   — brand-tinted chip. For the home header where there's
//                  more room and a slightly stronger affordance reads as
//                  intentional rather than chrome.
//
// Accessibility:
//   • 32px min target height (the surrounding header row pads the rest).
//   • `accessRole="button"`, label is the visible label.
//   • Disabled state propagated to `accessibilityState`.
//
// Motion: presses use `usePressedStyle()` from premium/shared, which
// already collapses to opacity-only under prefers-reduced-motion.

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { ClipboardCopy, Check } from '@tamagui/lucide-icons-2';
import { theme } from '../../constants';
import { useAppTheme } from '../../context';
import { usePressedStyle } from '../premium/shared';
import { useCopyForAi } from '../../hooks';

export interface CopyForAiButtonProps {
  /** Pre-built payload string from `buildAiPayload`. Required. */
  payload: string;
  /** Visible label. Defaults to "Copy for AI". */
  label?: string;
  /** Disabled state (independent of the in-flight copy). */
  disabled?: boolean;
  /** Visual variant — see file header. Defaults to 'ghost'. */
  variant?: 'ghost' | 'subtle';
  /** Test ID. */
  testID?: string;
}

const JUST_COPIED_FEEDBACK_MS = 1500;

export function CopyForAiButton({
  payload,
  label = 'Copy for AI',
  disabled = false,
  variant = 'ghost',
  testID,
}: CopyForAiButtonProps) {
  const { colors } = useAppTheme();
  const pressedStyle = usePressedStyle();
  const { copyForAi, isCopying } = useCopyForAi();
  const [justCopied, setJustCopied] = useState(false);

  // Clear the "Copied" feedback after a short delay. The cleanup clears
  // the timer if the button unmounts first (e.g. header swap).
  useEffect(() => {
    if (!justCopied) return;
    const t = setTimeout(() => setJustCopied(false), JUST_COPIED_FEEDBACK_MS);
    return () => clearTimeout(t);
  }, [justCopied]);

  const handlePress = async () => {
    const ok = await copyForAi(payload);
    if (ok) setJustCopied(true);
  };

  const isSubtle = variant === 'subtle';
  const Icon = justCopied ? Check : ClipboardCopy;
  const feedbackColor = justCopied ? colors.status.success : isSubtle ? colors.brand : colors.textSecondary;
  const isDisabled = disabled || isCopying;

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={isDisabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isSubtle ? colors.brandMuted : 'transparent',
          borderColor: isSubtle ? colors.brandSoft : 'transparent',
        },
        pressed && !isDisabled ? pressedStyle : null,
      ]}
    >
      <Icon size={14} color={feedbackColor} />
      <Text style={[styles.label, { color: feedbackColor }]} numberOfLines={1}>
        {justCopied ? 'Copied' : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 32,
  },
  label: {
    fontSize: theme.typography.mobileEyebrow.fontSize,
    fontWeight: theme.typography.mobileEyebrow.fontWeight as any,
    lineHeight: theme.typography.mobileEyebrow.lineHeight,
    letterSpacing: theme.typography.mobileEyebrow.letterSpacing,
    textTransform: 'uppercase',
  },
});

export default CopyForAiButton;

// components/MobilePremium/MobileAnnouncementBar.tsx
//
// Owner-authored announcement strip — the one-line broadcast surface a
// shop or tool needs above its content: "Pickup Friday 17–19h", "Drop
// 004 opens Friday". Purely presentational, like OfflineBanner: the
// consumer owns the message, the decision to mount, and any
// dismissed-once persistence — the primitive renders the strip, an
// optional action, and an optional dismiss control.

import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { X } from '@tamagui/lucide-icons-2';
import { theme } from '../../constants';
import { useAppTheme } from '../../context';

export interface MobileAnnouncementBarProps {
  /** The announcement — one line of owner copy. */
  message: string;
  /** Optional inline action label (e.g. "Details"). Requires `onAction`. */
  actionLabel?: string;
  /** Action press handler. Required when `actionLabel` is set. */
  onAction?: () => void;
  /** When set, renders the dismiss (X) control and forwards the press. */
  onDismiss?: () => void;
  /**
   * 'strong' inverts the strip onto the mode's ink — for the one fact
   * that outranks everything else on the page (e.g. a last-day window).
   * Purely presentational; the caller owns when it applies.
   */
  tone?: 'default' | 'strong';
  /** Localized dismiss label — consumers shipping non-English chrome. */
  dismissA11yLabel?: string;
  /** Test ID. */
  testID?: string;
  /** Outer style pass-through. */
  style?: StyleProp<ViewStyle>;
}

export function MobileAnnouncementBar({
  message,
  actionLabel,
  onAction,
  onDismiss,
  tone = 'default',
  dismissA11yLabel = 'Dismiss announcement',
  testID,
  style,
}: MobileAnnouncementBarProps) {
  const { colors } = useAppTheme();
  const hasAction = actionLabel != null && onAction != null;
  const strong = tone === 'strong';
  const ink = colors.text;
  const paper = colors.background;

  return (
    <View
      testID={testID}
      accessibilityLiveRegion="polite"
      style={[
        styles.shell,
        strong
          ? { backgroundColor: ink, borderColor: ink }
          : { backgroundColor: colors.brandMuted, borderColor: colors.cardBorder },
        style,
      ]}
    >
      <Text
        style={[styles.message, { color: strong ? paper : colors.text }]}
        numberOfLines={2}
      >
        {message}
      </Text>
      {hasAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text
            style={[
              styles.actionText,
              { color: strong ? paper : colors.brandText },
              strong && styles.actionTextStrong,
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
      {onDismiss != null ? (
        <Pressable
          onPress={onDismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={dismissA11yLabel}
          style={({ pressed }) => [styles.dismiss, { opacity: pressed ? 0.6 : 1 }]}
        >
          <X size={16} color={strong ? `${paper}B3` : colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.shapes.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  message: {
    flexShrink: 1,
    flexGrow: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
    // The broadcast reads as ledger output when a mono face is declared.
    fontFamily: theme.fonts.mono,
  },
  action: {
    flexShrink: 0,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // On the ink plate the action reads as paper type, underlined so it
  // still reads as tappable without the brand hue.
  actionTextStrong: {
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  dismiss: {
    flexShrink: 0,
    padding: 2,
  },
});

export default MobileAnnouncementBar;

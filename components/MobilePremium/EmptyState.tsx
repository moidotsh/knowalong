// components/MobilePremium/EmptyState.tsx
// The canonical empty-state primitive. A consumer wraps the interior of any
// list/feed/dashboard that has no data with EmptyState so the empty case
// reads as a deliberate state instead of a blank card. Domain-neutral: no
// preset copy, no icon library, no variant codes — the consumer supplies
// title, message, icon, and the optional action.
//
// The action (when present) renders through MobilePrimaryButton so the
// tap target, motion contract, and variant language (primary / secondary /
// ghost) match the rest of the kit. Pick the variant by context: 'primary'
// when EmptyState is the screen's main content, 'secondary' or 'ghost'
// when it sits inside a nested card or surface.
//
// Compact mode trims the vertical rhythm for nested use (e.g. the interior
// of a card whose header still shows).

import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme, MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';
import { useAppTheme } from '../../context';
import { MobilePrimaryButton } from './MobilePrimaryButton';

export interface EmptyStateAction {
  /** Button label. */
  label: string;
  /** Tap handler. */
  onPress: () => void;
  /**
   * MobilePrimaryButton variant. Defaults to 'primary'. Use 'secondary' or
   * 'ghost' when EmptyState sits inside a nested surface rather than as
   * the screen's primary content (per MobilePrimaryButton variant policy).
   */
  variant?: 'primary' | 'secondary' | 'ghost';
}

export interface EmptyStateProps {
  /** Required title — the headline of the empty state. */
  title: string;
  /** Optional supporting copy under the title. */
  message?: string;
  /** Optional icon node rendered above the title. Consumer-owned. */
  icon?: React.ReactNode;
  /** Optional primary action rendered under the message. */
  action?: EmptyStateAction;
  /** Trim vertical rhythm for nested use. Default false. */
  compact?: boolean;
  /** Optional group label for screen readers. Defaults to the title. */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const TITLE_STYLE = {
  fontSize: theme.typography.mobileTitle.fontSize,
  fontWeight: theme.typography.mobileTitle.fontWeight as any,
  lineHeight: theme.typography.mobileTitle.lineHeight,
  letterSpacing: theme.typography.mobileTitle.letterSpacing,
} as const;

const MESSAGE_STYLE = {
  fontSize: 14,
  fontWeight: '400',
  lineHeight: 20,
} as const;

export function EmptyState({
  title,
  message,
  icon,
  action,
  compact = false,
  accessibilityLabel,
  testID,
  style,
}: EmptyStateProps) {
  const { colors } = useAppTheme();
  const verticalPad = compact ? 16 : 32;
  const iconGap = compact ? 8 : 16;
  const messageGap = compact ? 8 : 12;
  const actionGap = compact ? 12 : 20;

  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? title}
      style={[styles.shell, { paddingVertical: verticalPad }, style]}
    >
      {icon ? <View style={{ marginBottom: iconGap }}>{icon}</View> : null}
      <Text style={[TITLE_STYLE, { color: colors.text, textAlign: 'center' }]}>
        {title}
      </Text>
      {message ? (
        <Text
          style={[
            MESSAGE_STYLE,
            { color: colors.textSecondary, textAlign: 'center', marginTop: messageGap },
          ]}
        >
          {message}
        </Text>
      ) : null}
      {action ? (
        <View style={{ marginTop: actionGap, width: '100%' }}>
          <MobilePrimaryButton
            onPress={action.onPress}
            variant={action.variant ?? 'primary'}
          >
            {action.label}
          </MobilePrimaryButton>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    ...MOBILE_CONTENT_WIDTH_STYLE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});

export default EmptyState;

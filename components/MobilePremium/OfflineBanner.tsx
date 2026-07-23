// components/MobilePremium/OfflineBanner.tsx
//
// Pinned connectivity / sync banner. Three variants carry distinct semantics:
//   • 'offline'    — device is offline; show pending count if provided.
//   • 'syncing'    — online and syncing pending work.
//   • 'sync-failed'— a sync attempt failed; offer Retry when onAction is set.
//
// Purely presentational. The consumer owns the network state, queue state,
// and the decision to mount/unmount the banner. The primitive renders
// variant-colored chrome and optional action; it does not subscribe to
// any store, does not poll, does not auto-hide.
//
// The banner respects its parent's layout — it does NOT pin to the screen
// itself. Consumers place it inside a SafeAreaView-wrapped header slot or
// apply `paddingTop` via style.

import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '../../context';
import { MobilePrimaryButton } from './MobilePrimaryButton';

export type OfflineBannerVariant = 'offline' | 'syncing' | 'sync-failed';

export interface OfflineBannerProps {
  /** Banner variant — drives the accent color and default copy. */
  variant: OfflineBannerVariant;
  /** Override the default message for the variant. */
  message?: string;
  /** Inline action label (e.g. "Retry"). When set, `onAction` is required. */
  actionLabel?: string;
  /** Action press handler. Required when `actionLabel` is set. */
  onAction?: () => void;
  /** Pending work count; surfaces as "N pending" on the offline variant. */
  pendingCount?: number;
  /** aria-live politeness. Default 'polite'. */
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_MESSAGE: Record<OfflineBannerVariant, string> = {
  offline: "You're offline",
  syncing: 'Syncing…',
  'sync-failed': 'Sync failed',
};

function variantAccent(
  variant: OfflineBannerVariant,
  colors: {
    status: { error: string; warning: string };
    brand: string;
  },
): string {
  if (variant === 'offline') return colors.status.error;
  if (variant === 'syncing') return colors.brand;
  return colors.status.warning;
}

export function OfflineBanner({
  variant,
  message,
  actionLabel,
  onAction,
  pendingCount,
  accessibilityLiveRegion = 'polite',
  testID,
  style,
}: OfflineBannerProps) {
  const { colors } = useAppTheme();
  const accent = variantAccent(variant, colors);

  let text = message ?? DEFAULT_MESSAGE[variant];
  if (variant === 'offline' && pendingCount != null && pendingCount > 0) {
    text = `${text} · ${pendingCount} pending`;
  }

  const hasAction = actionLabel != null && onAction != null;

  return (
    <View
      testID={testID}
      accessibilityLiveRegion={accessibilityLiveRegion}
      style={[
        styles.shell,
        {
          backgroundColor: `${accent}14`,
          borderLeftColor: accent,
        },
        style,
      ]}
    >
      <View style={styles.dotWrap}>
        <View
          accessibilityElementsHidden
          style={[styles.dot, { backgroundColor: accent }]}
        />
      </View>
      <Text
        style={[
          styles.text,
          { color: colors.text },
        ]}
        numberOfLines={2}
      >
        {text}
      </Text>
      {hasAction ? (
        <View style={styles.actionWrap}>
          <MobilePrimaryButton
            onPress={onAction!}
            variant="ghost"
            accentColor={accent}
          >
            {actionLabel!}
          </MobilePrimaryButton>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderRadius: 8,
  },
  dotWrap: {
    paddingRight: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    flexShrink: 1,
    flexGrow: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  actionWrap: {
    flexShrink: 0,
    marginLeft: 8,
  },
});

export default OfflineBanner;

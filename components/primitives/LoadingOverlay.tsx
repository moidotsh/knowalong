// components/primitives/LoadingOverlay.tsx
// Full-screen blocking load. Renders inside MobileDialog (which portals via
// RN Modal) so the overlay escapes any host ScrollView / transform / clipping
// ancestry and always centers on the visible viewport. Non-dismissable by
// design: the consumer controls visibility with `visible` — backdrop taps,
// the X button, and Escape are all disabled.
//
// Audit C4: this file remains the canonical ActivityIndicator site for a
// blocking load (see `scripts/audit-component-quality.ts` C4_EXEMPT_FILES).
// c4-exempt: this primitive IS the ActivityIndicator wrapper.

import React from 'react';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';
import { useAppTheme } from '../../context';
import { theme } from '../../constants';
import { MobileDialog } from '../MobilePremium';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  subMessage?: string;
  /** Optional progress value between 0 and 100. */
  progress?: number;
  accentColor?: string;
}

export function LoadingOverlay({
  visible,
  message,
  subMessage,
  progress,
  accentColor,
}: LoadingOverlayProps) {
  const { colors } = useAppTheme();
  const accent = accentColor ?? colors.brand;

  // MobileDialog handles its own mounting. Pass `open` so it returns null
  // internally when invisible. The remaining props disable every dismiss
  // affordance — this is a blocking load the consumer controls.
  return (
    <MobileDialog
      open={visible}
      onOpenChange={() => {
        // Intentionally a no-op. Blocking loads are non-dismissable; the
        // consumer flips `visible` to false when the operation completes.
      }}
      closeOnBackdropTap={false}
      showCloseButton={false}
      accentColor={accent}
    >
      <View style={styles.body}>
        {/* c4-exempt: this primitive IS the ActivityIndicator wrapper. */}
        <ActivityIndicator size="large" color={accent} />
        {message ? (
          <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
        ) : null}
        {subMessage ? (
          <Text style={[styles.subMessage, { color: colors.textMuted }]}>
            {subMessage}
          </Text>
        ) : null}
        {progress !== undefined ? (
          <View style={[styles.progressTrack, { backgroundColor: colors.cardAlt }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: accent,
                  width: `${Math.min(Math.max(progress, 0), 100)}%`,
                },
              ]}
            />
          </View>
        ) : null}
      </View>
    </MobileDialog>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  message: {
    ...theme.typography.mobileAction,
    textAlign: 'center',
    marginTop: 16,
  },
  subMessage: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default LoadingOverlay;

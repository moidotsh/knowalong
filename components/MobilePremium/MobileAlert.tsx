// components/MobilePremium/MobileAlert.tsx
// Refined inline alert for the mobile premium kit.
//
// Premium signals:
//   • Smaller icon circle (24px) — fits the compact header budget.
//   • Considered typography — title uses 14/600, message uses 13/400.
//   • Same accent logic — error/warning/success/info each get their
//     accent color, used for the icon, the icon-circle tint, the border,
//     and the title.
//   • Horizontal layout — icon + text side-by-side, not the legacy
//     left-border bar.
//
// API compatibility: accepts both `type` and `variant` for the alert kind
// (same values, different prop name), and both `message` and `body` for the
// supporting text. Consumers can use whichever pair fits their calling
// convention; the component resolves `type ?? variant` and `message ?? body`.

import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from '@tamagui/lucide-icons-2';
import { useAppTheme } from '../../context';
import { MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';

export type MobileAlertType = 'error' | 'warning' | 'success' | 'info';
export type MobileAlertVariant = 'success' | 'warning' | 'error' | 'info';

export interface MobileAlertProps {
  /** Alert kind. `type` is the primary prop name. */
  type?: MobileAlertType;
  /** Alert kind. Alternative alias for `type` (same values, different name). */
  variant?: MobileAlertVariant;
  /** Single-line title. */
  title?: string;
  /** Supporting message (1-2 lines). `message` is the primary prop name. */
  message?: string;
  /** Supporting message. Alternative alias for `message`. */
  body?: string;
  /** Test ID. */
  testID?: string;
  /** Outer style pass-through. */
  style?: StyleProp<ViewStyle>;
}

const ALERT_TITLE_STYLE = {
  fontSize: 14,
  fontWeight: '600',
  lineHeight: 18,
  letterSpacing: 0,
} as const;

const ALERT_MESSAGE_STYLE = {
  fontSize: 13,
  fontWeight: '400',
  lineHeight: 18,
  letterSpacing: 0,
} as const;

/**
 * Refined inline alert.
 *
 * Sits inside the content area (typically above the primary action).
 * One per screen — multiple alerts stack into a list and break the
 * 490px fit. For multi-message states, consolidate into one alert.
 */
export function MobileAlert({
  type,
  variant,
  title,
  message,
  body,
  testID,
  style,
}: MobileAlertProps) {
  const { colors } = useAppTheme();
  const resolvedType = type ?? variant ?? 'info';
  const resolvedMessage = message ?? body;

  const accentMap: Record<MobileAlertType, { accent: string; Icon: typeof Info }> = {
    error: { accent: colors.status.error, Icon: AlertCircle },
    warning: { accent: colors.status.warning, Icon: AlertTriangle },
    success: { accent: colors.status.success, Icon: CheckCircle2 },
    info: { accent: colors.status.info, Icon: Info },
  };

  const { accent, Icon } = accentMap[resolvedType];

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: `${accent}14`,
          borderColor: `${accent}33`,
        },
        style,
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${accent}26` }]}>
        <Icon size={14} color={accent} strokeWidth={2.5} />
      </View>
      <View style={styles.text}>
        {title ? (
          <Text style={[ALERT_TITLE_STYLE, { color: accent }]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {resolvedMessage ? (
          <Text style={[ALERT_MESSAGE_STYLE, { color: colors.text }]} numberOfLines={3}>
            {resolvedMessage}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...MOBILE_CONTENT_WIDTH_STYLE,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});

export default MobileAlert;

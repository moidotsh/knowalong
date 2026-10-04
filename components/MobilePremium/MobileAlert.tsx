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
import { theme } from '../../constants';
import { useAppTheme } from '../../context';
import { hapticNotificationSuccess } from '../../utils/haptics';

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
  fontSize: theme.typography.mobileSubtitle.fontSize,
  fontWeight: theme.typography.mobileSubtitle.fontWeight as any,
  lineHeight: theme.typography.mobileSubtitle.lineHeight,
  letterSpacing: theme.typography.mobileSubtitle.letterSpacing,
} as const;

const ALERT_MESSAGE_STYLE = {
  fontSize: theme.typography.mobileMeta.fontSize,
  fontWeight: theme.typography.mobileMeta.fontWeight as any,
  lineHeight: theme.typography.mobileMeta.lineHeight,
  letterSpacing: theme.typography.mobileMeta.letterSpacing,
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

  // Success alerts ARE the celebration path — the confirmation haptic
  // lives here (once per mount) so every consumer's success signal feels
  // the same instead of each call site remembering to fire one.
  React.useEffect(() => {
    if (resolvedType === 'success') hapticNotificationSuccess();
  }, [resolvedType]);

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
      <View style={[styles.iconPlate, { backgroundColor: `${accent}26` }]}>
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
    // A notice is a ruled plate, not a rounded chip — the alert rides
    // the same shape language as every other control.
    borderRadius: theme.shapes.control,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    // Inline block: fills its container, like MobileSurface — the column
    // is owned by the layer above (SB1 screen body / portal panel).
    width: '100%',
  },
  iconPlate: {
    width: 24,
    height: 24,
    borderRadius: theme.shapes.control,
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

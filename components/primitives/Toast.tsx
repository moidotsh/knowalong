// components/primitives/Toast.tsx
// Toast notification component. Renders toasts in a fixed-position stack
// above all other UI (z-index: 999999 on web). Uses `createPortal` on web
// to render above RN Modals (which cap at z-index: 9999); native renders
// inline since RN Modal already portals at the OS level.
//
// Light-mode material: semi-transparent white surface, accent-tinted icon,
// 14px label. Adapts the MobileAlert horizontal layout at a more compact
// rhythm so multiple toasts stack cleanly without taking the full screen.

import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from '@tamagui/lucide-icons-2';
import { useToast, type Toast as ToastType, useAppTheme } from '../../context';
import { MOBILE_DIALOG_WIDTH_STYLE, theme } from '../../constants';

const ToastIcon = ({ type }: { type: ToastType['type'] }) => {
  const { colors } = useAppTheme();
  switch (type) {
    case 'success':
      return <CheckCircle2 size={18} color={colors.status.success} strokeWidth={2.25} />;
    case 'error':
      return <XCircle size={18} color={colors.status.error} strokeWidth={2.25} />;
    case 'warning':
      return <AlertTriangle size={18} color={colors.status.warning} strokeWidth={2.25} />;
    case 'info':
      return <Info size={18} color={colors.status.info} strokeWidth={2.25} />;
  }
};

interface ToastItemProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { colors } = useAppTheme();

  // The surface language follows `theme.toast.style` (the theme override
  // point, beside shapes/atmosphere): 'card' is the bordered card with
  // colored icons; 'chit' is the ink treatment — the announcement
  // strip's strong tone, floating. The chit inverts like every ink
  // surface: `colors.text` plate in light, bone in dark; paper
  // (`colors.background`) is its type.
  const chit = theme.toast.style === 'chit';
  const ink = colors.focus.background;
  const paper = colors.focus.text;

  // Type tint at 15% opacity for the LEFT accent stripe only — keeps
  // type identification without compromising readability. The body
  // uses the opaque card surface so the toast stays legible over any
  // background (critical in light mode where a 12% tint vanishes).
  const stripeByType: Record<ToastType['type'], string> = {
    success: colors.status.success,
    error: colors.status.error,
    warning: colors.status.warning,
    info: colors.status.info,
  };
  const borderByType: Record<ToastType['type'], string> = {
    success: `${colors.status.success}66`,
    error: `${colors.status.error}66`,
    warning: `${colors.status.warning}66`,
    info: `${colors.status.info}66`,
  };

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        chit
          ? { backgroundColor: ink, borderColor: ink }
          : {
              backgroundColor: colors.card,
              borderColor: borderByType[toast.type],
              borderLeftColor: stripeByType[toast.type],
              borderLeftWidth: 3,
              // Opaque card needs an elevation cue so it reads as a floating
              // surface, not a flat inline card. Uses the same dark slate
              // base as every other shadow in the design system (matches
              // mobilePremium.surfaceGlow in constants/theme.ts).
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
            },
      ]}
    >
      {chit ? (
        // The house dot — one 7px status dot carries the semantic tint;
        // the ink plate has no room for a colored icon triad.
        <View style={[styles.statusDot, { backgroundColor: colors.status[toast.type] }]} />
      ) : (
        <ToastIcon type={toast.type} />
      )}
      <Text
        style={chit ? [styles.messageChit, { color: paper }] : [styles.message, { color: colors.text }]}
        numberOfLines={3}
      >
        {toast.message}
      </Text>
      <Pressable
        onPress={() => onDismiss(toast.id)}
        hitSlop={8}
        style={styles.closeButton}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
      >
        <X size={14} color={chit ? `${paper}B3` : colors.textColors.muted} />
      </Pressable>
    </View>
  );
}

// Module-level portal container for web toasts (persists across renders).
let webPortalContainer: HTMLDivElement | null = null;

function getWebPortalContainer(): HTMLDivElement {
  if (!webPortalContainer) {
    const container = document.createElement('div');
    container.style.cssText =
      'position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:999999';
    document.body.appendChild(container);
    webPortalContainer = container;
  }
  return webPortalContainer;
}

export function ToastContainer() {
  const { toasts, hideToast } = useToast();

  if (toasts.length === 0) return null;

  const toastContent = (
    <View style={styles.stack} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={hideToast} />
      ))}
    </View>
  );

  // On web, use createPortal to render above all Modals.
  if (Platform.OS === 'web') {
    return createPortal(toastContent, getWebPortalContainer());
  }

  return toastContent;
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // The shape family token — a consumer retuning `theme.shapes` retunes
    // the toast with every other control, no component edit.
    borderRadius: theme.shapes.control,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 10,
    // Visual-policy alignment, NOT SB2 compliance. Toast renders via
    // web `createPortal` (not RN Modal), so it is outside SB2-portal's
    // direct scope. The 380pt dialog cap is applied here because toast
    // is intentionally a compact, centered, dialog-like overlay — using
    // the canonical spread keeps the width contract in one place and
    // tracks CONTENT_WIDTH_MODE. If a future consumer wants wider
    // toasts, the right move is to override this style locally, not to
    // redefine the policy.
    ...MOBILE_DIALOG_WIDTH_STYLE,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  // The chit's message: a transient system line reads as ledger output —
  // receipt mono when `fonts.mono` is declared, tabular, one size down.
  messageChit: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    letterSpacing: 0.2,
    fontFamily: theme.fonts.mono,
    fontVariant: ['tabular-nums'],
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: theme.shapes.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ToastContainer;

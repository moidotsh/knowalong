// utils/crossPlatformAlert.ts
// Cross-platform alert + toast convenience helpers. Routes through
// `toastEventEmitter` for non-blocking toasts and the native `Alert`
// (or web `window.alert`/`window.confirm`) for blocking dialogs.

import { Alert } from 'react-native';
import { isWeb } from './platform';
import { type ToastType } from './toastEventEmitter';
import { emitToast } from './toastEventEmitter';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/** Show a non-blocking toast (works on web + native). */
export const showToast = (type: ToastType, message: string, duration?: number) => {
  emitToast(type, message, duration);
};

/** Show a non-blocking info toast. */
export const showInfoToast = (message: string, duration?: number) => {
  showToast('info', message, duration);
};

/** Show a non-blocking success toast. */
export const showSuccessToast = (message: string, duration?: number) => {
  showToast('success', message, duration);
};

/** Show a non-blocking error toast. */
export const showErrorToast = (message: string, duration?: number) => {
  showToast('error', message, duration);
};

/** Show a non-blocking warning toast. */
export const showWarningToast = (message: string, duration?: number) => {
  showToast('warning', message, duration);
};

/**
 * Cross-platform alert. Web uses `window.alert`/`window.confirm`; native
 * uses `Alert.alert`. Multi-button support is preserved on both — web
 * collapses to OK/Cancel.
 */
export const showAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
) => {
  if (isWeb) {
    const fullMessage = [title, message].filter(Boolean).join('\n\n');

    if (!buttons || buttons.length <= 1) {
      window.alert(fullMessage);
      if (buttons && buttons[0]?.onPress) {
        buttons[0].onPress();
      }
      return;
    }

    const result = window.confirm(fullMessage);
    if (result) {
      const confirmButton = buttons.find((btn) => btn.style !== 'cancel');
      confirmButton?.onPress?.();
    } else {
      const cancelButton = buttons.find((btn) => btn.style === 'cancel');
      cancelButton?.onPress?.();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

/** Quick delete confirmation alert. */
export const showDeleteConfirmation = (
  itemName: string,
  onConfirm: () => void,
  onCancel?: () => void,
) => {
  showAlert('Delete Confirmation', `Are you sure you want to delete ${itemName}?`, [
    { text: 'Cancel', style: 'cancel', onPress: onCancel },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
};

/** Bulk delete confirmation alert. */
export const showBulkDeleteConfirmation = (
  count: number,
  itemType: string,
  onConfirm: () => void,
  additionalInfo?: string,
  onCancel?: () => void,
) => {
  const message = `Are you sure you want to delete ${count} ${itemType}${
    count > 1 ? 's' : ''
  }?${additionalInfo ? `\n\n${additionalInfo}` : ''}`;
  showAlert('Bulk Delete Confirmation', message, [
    { text: 'Cancel', style: 'cancel', onPress: onCancel },
    { text: 'Delete All', style: 'destructive', onPress: onConfirm },
  ]);
};

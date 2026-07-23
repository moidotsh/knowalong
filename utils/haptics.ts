// utils/haptics.ts
// Thin wrapper around expo-haptics that no-ops where no haptic engine is
// available, with a navigator.vibrate() fallback for web. Used for
// celebration transitions and similar subtle affordances — keep taps
// small and rare so they don't become noise.
//
// Platform support:
//   - Native iOS/Android: fires via expo-haptics (real Taptic Engine / vibrator)
//   - Android PWA (Chrome/Firefox): falls back to navigator.vibrate()
//   - iOS PWA: silent. Apple does not expose the Taptic Engine to web
//     content, and Safari doesn't implement navigator.vibrate(). There is
//     no API to call.

import * as Haptics from 'expo-haptics';
import { isWeb } from './platform';

const canVibrateWeb = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

const safeImpact = (style: Haptics.ImpactFeedbackStyle) => {
  if (!isWeb) {
    try {
      Haptics.impactAsync(style);
    } catch {
      // Silently ignore — haptics are best-effort and never load-bearing.
    }
    return;
  }
  if (!canVibrateWeb()) return;
  try {
    // expo-haptics exposes qualitative enums (light/medium/rigid) that
    // don't map 1:1 to a vibration duration; scale by feel.
    const duration =
      style === Haptics.ImpactFeedbackStyle.Light ? 10 :
      style === Haptics.ImpactFeedbackStyle.Medium ? 20 :
      30; // Rigid
    navigator.vibrate(duration);
  } catch {
    // Silently ignore.
  }
};

const safeNotification = (type: Haptics.NotificationFeedbackType) => {
  if (!isWeb) {
    try {
      Haptics.notificationAsync(type);
    } catch {
      // Silently ignore.
    }
    return;
  }
  if (!canVibrateWeb()) return;
  try {
    // Approximate the iOS notification patterns with buzz/pause shapes.
    const pattern =
      type === Haptics.NotificationFeedbackType.Success ? [30, 50, 30] :
      type === Haptics.NotificationFeedbackType.Warning ? [40] :
      [20, 30, 60]; // Error
    navigator.vibrate(pattern);
  } catch {
    // Silently ignore.
  }
};

const safeSelection = () => {
  if (!isWeb) {
    try {
      Haptics.selectionAsync();
    } catch {
      // Silently ignore.
    }
    return;
  }
  if (!canVibrateWeb()) return;
  try {
    navigator.vibrate(8);
  } catch {
    // Silently ignore.
  }
};

/** Subtle tap — session saved, screen transition, link tap. */
export const hapticImpactLight = () => safeImpact(Haptics.ImpactFeedbackStyle.Light);

/** Heavier tap — milestone crossed, mode change. */
export const hapticImpactMedium = () => safeImpact(Haptics.ImpactFeedbackStyle.Medium);

/** Sharper tap — bar crossings, achievement unlocked. */
export const hapticImpactRigid = () => safeImpact(Haptics.ImpactFeedbackStyle.Rigid);

/** Success fanfare — full chain complete, registration finished. */
export const hapticNotificationSuccess = () => safeNotification(Haptics.NotificationFeedbackType.Success);

/** Warning tap — gentle nudge, "are you sure". */
export const hapticNotificationWarning = () => safeNotification(Haptics.NotificationFeedbackType.Warning);

/** Error buzz — something went wrong. */
export const hapticNotificationError = () => safeNotification(Haptics.NotificationFeedbackType.Error);

/** Selection tick — picker / segmented control changes. */
export const hapticSelection = safeSelection;

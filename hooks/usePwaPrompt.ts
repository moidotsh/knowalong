// hooks/usePwaPrompt.ts
// Determines whether to show a PWA install prompt banner. Uses OS-level
// detection only (iOS Safari, Android Chrome, other-mobile) — no attempt
// to distinguish "wrong browser on the right OS" because mobile UAs are
// inconsistent. The install dialog shows the platform's canonical flow
// with the required browser named explicitly.
//
// Dismissal is sticky for 14 days (localStorage). `dismiss()` resets the
// cooldown.

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { isWeb } from '../utils';

const STORAGE_KEY = 'arqavellum:pwa-prompt-dismissed';
const COOLDOWN_DAYS = 14;

export type PwaPlatform = 'ios' | 'android' | 'other-mobile';

function detectPwaPlatform(): PwaPlatform | null {
  if (!isWeb || typeof navigator === 'undefined') return null;

  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Mobi|Mobile|Silk|BlackBerry|Opera Mini/.test(ua)) return 'other-mobile';

  return null;
}

function isStandalone(): boolean {
  if (!isWeb || typeof window === 'undefined') return false;
  // iOS Safari standalone
  return (
    (window as any).navigator?.standalone === true ||
    // Android Chrome / Edge
    window.matchMedia?.('(display-mode: standalone)')?.matches === true
  );
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const dismissedAt = new Date(parseInt(raw, 10));
    const now = new Date();
    const diffDays = (now.getTime() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays < COOLDOWN_DAYS;
  } catch {
    return false;
  }
}

function storeDismissal() {
  try {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  } catch {
    // Ignore storage errors (private browsing, quota).
  }
}

export interface UsePwaPromptResult {
  /** canInstall + not recently dismissed. Use for the install banner. */
  shouldShow: boolean;
  /** Platform-level capability (mobile browser, not standalone). No cooldown. */
  canInstall: boolean;
  /** Detected platform (null on desktop / native). */
  platform: PwaPlatform | null;
  /** Record dismissal — hides the prompt for COOLDOWN_DAYS. */
  dismiss: () => void;
}

export function usePwaPrompt(): UsePwaPromptResult {
  const [dismissed, setDismissed] = useState<boolean>(isDismissed);

  useEffect(() => {
    setDismissed(isDismissed());
  }, []);

  const platform = detectPwaPlatform();
  const standalone = isStandalone();

  // canInstall: the platform-level check (mobile browser, not standalone).
  const canInstall = isWeb && Platform.OS === 'web' && !standalone && platform !== null;

  // shouldShow: canInstall + not recently dismissed.
  const shouldShow = canInstall && !dismissed;

  const dismiss = () => {
    storeDismissal();
    setDismissed(true);
  };

  return { shouldShow, canInstall, platform, dismiss };
}

export default usePwaPrompt;

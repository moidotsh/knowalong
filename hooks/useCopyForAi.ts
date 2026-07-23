// hooks/useCopyForAi.ts
// Clipboard wrapper for the "Copy for AI" dev helper. Lives at the shell
// layer so any consumer screen can drop a `<CopyForAiButton>` in without
// re-implementing the clipboard / toast / logger plumbing.
//
// Contract:
//   • Web: prefers `expo-clipboard`'s `setStringAsync`, which uses
//     `navigator.clipboard.writeText` under the hood. If the Clipboard API
//     is unavailable (insecure context, browser support gap), the hook
//     emits a single error toast and returns false — no fallback to the
//     legacy `document.execCommand('copy')` path.
//   • Native: `setStringAsync` resolves on both iOS and Android.
//   • Single-flight: while a copy is in flight, subsequent calls are
//     ignored. Prevents toast-spam on rapid double-tap.
//   • All non-OK outcomes go through `logger` (S11) and `emitToast` —
//     no `console.*`, no `Alert.alert`.

import { useCallback, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { emitToast, isWeb, logger } from '../utils';

export interface UseCopyForAiResult {
  /** Copy the given payload. Resolves true on success, false on any failure. */
  copyForAi: (payload: string) => Promise<boolean>;
  /** True while a copy is in flight. */
  isCopying: boolean;
}

export function useCopyForAi(): UseCopyForAiResult {
  const [isCopying, setIsCopying] = useState(false);

  const copyForAi = useCallback(
    async (payload: string): Promise<boolean> => {
      if (isCopying) return false;
      if (typeof payload !== 'string' || payload.length === 0) {
        logger.warn('ui', 'Copy for AI skipped: empty payload');
        emitToast('error', 'Nothing to copy');
        return false;
      }

      if (isWeb) {
        const nav = typeof navigator !== 'undefined' ? navigator : undefined;
        const hasClipboardApi =
          !!nav &&
          typeof nav.clipboard === 'object' &&
          nav.clipboard !== null &&
          typeof (nav.clipboard as { writeText?: unknown }).writeText === 'function';
        if (!hasClipboardApi) {
          emitToast('error', 'Clipboard unavailable in this browser');
          logger.warn('ui', 'Copy for AI failed: navigator.clipboard API unavailable on web');
          return false;
        }
      }

      setIsCopying(true);
      try {
        await Clipboard.setStringAsync(payload);
        emitToast('success', 'Copied for AI');
        logger.ui.action('CopyForAiButton', 'copied', `${payload.length} chars`);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        emitToast('error', 'Copy failed — select and copy manually');
        logger.error('ui', 'Copy for AI failed', error instanceof Error ? error : undefined, {
          message,
        });
        return false;
      } finally {
        setIsCopying(false);
      }
    },
    [isCopying],
  );

  return { copyForAi, isCopying };
}

export default useCopyForAi;

// components/premium/shared/useDismissOnEscape.ts
// Escape-to-dismiss for portal surfaces (dialog, sheet). Web-only, gated
// by the surface's own enabled flag, with the paired listener cleanup
// audit R4b requires.
import { useEffect } from 'react';
import { isWeb } from '../../../utils';

export function useDismissOnEscape(
  open: boolean | undefined,
  enabled: boolean | undefined,
  onDismiss: () => void,
): void {
  useEffect(() => {
    if (!isWeb || !open || !enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, enabled, onDismiss]);
}

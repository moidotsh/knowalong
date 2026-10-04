// components/premium/shared/useDialogFocus.ts
// Dialog-focus contract for interruptive portals (the sheet, the
// dialog): when one opens, focus moves into the panel; when it closes,
// focus returns to the element that opened it. Screen readers follow
// focus — without this an opened sheet leaves the reader pointing at
// the page behind the scrim. Web-only (native modals own focus);
// jsdom-safe. The panel takes the returned ref plus `tabIndex={-1}`
// (web) so focus() has somewhere to land without joining the tab
// order.

import { useEffect, useRef } from 'react';
import { isWeb } from '../../../utils';

export function useDialogFocus(open: boolean) {
  const panelRef = useRef<{ focus?: () => void } | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isWeb) return;
    if (open) {
      openerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      // The panel mounts with `open` — give it a beat to exist.
      const t = window.setTimeout(() => {
        panelRef.current?.focus?.();
      }, 80);
      return () => {
        window.clearTimeout(t);
      };
    }
    // Close (or unmount→null render): hand focus back to the opener.
    openerRef.current?.focus?.();
    openerRef.current = null;
  }, [open]);

  return panelRef;
}

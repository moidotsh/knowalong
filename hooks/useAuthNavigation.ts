// hooks/useAuthNavigation.ts
// Navigation hook with View Transitions API support for seamless auth
// page transitions. Falls back to instant transitions on browsers that
// don't support the API.
//
// Audit C1 allows raw `router.push` / `router.replace` here — the hook
// is the second legitimate site for those calls (after
// navigation/NavigationHelper.tsx). Use this hook when you need a
// transition animation between auth screens; use NavigationHelper's
// functions for everything else.

import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { isWeb } from '../utils';

/**
 * Hook that provides navigation functions with View Transitions API
 * support. Falls back to instant transitions where the API is missing.
 */
export function useAuthNavigation() {
  const router = useRouter();

  const navigateWithTransition = useCallback(
    async (href: string) => {
      if (
        isWeb &&
        typeof document !== 'undefined' &&
        'startViewTransition' in document
      ) {
        const transition = (
          document as Document & {
            startViewTransition: (cb: () => void) => { finished: Promise<void> };
          }
        ).startViewTransition(() => {
          router.push(href);
        });

        await transition.finished;
      } else {
        router.push(href);
      }
    },
    [router],
  );

  const replaceWithTransition = useCallback(
    async (href: string) => {
      if (
        isWeb &&
        typeof document !== 'undefined' &&
        'startViewTransition' in document
      ) {
        const transition = (
          document as Document & {
            startViewTransition: (cb: () => void) => { finished: Promise<void> };
          }
        ).startViewTransition(() => {
          router.replace(href);
        });

        await transition.finished;
      } else {
        router.replace(href);
      }
    },
    [router],
  );

  return {
    navigateWithTransition,
    replaceWithTransition,
    router,
  };
}

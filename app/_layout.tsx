// app/_layout.tsx
// Root layout. Provider stack + PWA bootstrap.
//
// Provider stack (outer → inner):
//   TamaguiProvider(defaultTheme=colorScheme) → ThemeProvider →
//   SafeAreaProvider → AuthProvider → ToastProvider → QueryProvider → Stack
//   + <ToastContainer/> (sibling of Stack, picks up toasts from anywhere)
//
// ThemeProvider sits INSIDE TamaguiProvider so the dynamic `defaultTheme`
// (Tamagui's own light/dark) tracks the resolved colorScheme. Both stay
// in sync — provider order is load-bearing.
//
// Two web-only useEffect blocks are load-bearing:
//
//   1. PWA runtime injection — Expo Web's static export strips every
//      PWA-related tag from <head> except <link rel="icon">. This block
//      restores the manifest link, apple-touch-icon, apple-mobile-web-app-*
//      metas, and both theme-color metas at runtime. See
//      docs/architecture/pwa-installability.md §2-3.
//
//   2. Service worker registration — Android Chrome's installability
//      criteria require a registered SW with a fetch handler. Production-
//      only, gated on `isWeb` + `'serviceWorker' in navigator`. See
//      docs/architecture/pwa-installability.md §4.

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import config from '../tamagui.config';
import { isWeb, hasDocument, hasWindow } from '../utils/platform';
import { logger } from '../utils';
import { initializeNetworkListeners } from '../stores';
import { AuthProvider, ToastProvider, ThemeProvider, useAppTheme } from '../context';
import { AuthGuard, ToastContainer, AppErrorBoundary } from '../components/primitives';
import { QueryProvider } from '../lib/react-query';
import { SCREEN_BODY_STYLE } from '../constants';

function RootShell() {
  const { colorScheme, colors } = useAppTheme();

  // Network listener — web online/offline events. The cleanup is paired
  // so audit R4b's listener-pairing rule holds.
  useEffect(() => {
    const cleanup = initializeNetworkListeners();
    return cleanup;
  }, []);

  // PWA runtime injection + service worker registration. Both gated on
  // isWeb — native has no document or navigator.serviceWorker.
  useEffect(() => {
    if (!isWeb || !hasDocument() || !hasWindow()) return;

    // Inject PWA / Add-to-Home-Screen tags. Expo Web's static export
    // (`expo export --platform web`) strips everything in <head> except
    // <link rel="icon"> when generating dist/index.html — the manifest
    // link, apple-touch-icon, apple-mobile-web-app-* metas, and both
    // theme-color metas all disappear. Without these in the deployed
    // HTML, Chrome Android registers the service worker (registered
    // below) but shows an empty Manifest tab in DevTools and never
    // promotes "Add to Home Screen" to "Install app" — the install
    // flows fall back to a browser shortcut with an address bar.
    //
    // Each tag is guarded with an existence check so React StrictMode's
    // double-mount in dev doesn't append duplicates. The theme-color
    // metas pull from the LIVE palette so they follow colorScheme.
    const ensureMeta = (name: string, content: string, media?: string) => {
      const selector = `meta[name="${name}"]${media ? `[media="${media}"]` : ''}`;
      if (document.querySelector(selector)) return;
      const m = document.createElement('meta');
      m.name = name;
      m.content = content;
      if (media) m.setAttribute('media', media);
      document.head.appendChild(m);
    };
    const ensureLink = (rel: string, href: string, type?: string) => {
      if (document.querySelector(`link[rel="${rel}"][href="${href}"]`)) return;
      const l = document.createElement('link');
      l.rel = rel;
      l.href = href;
      if (type) l.type = type;
      document.head.appendChild(l);
    };
    ensureLink('manifest', '/manifest.json');
    ensureLink('apple-touch-icon', '/icons/192.png');
    ensureLink('icon', '/icons/192.png', 'image/png');
    ensureMeta('apple-mobile-web-app-capable', 'yes');
    ensureMeta('mobile-web-app-capable', 'yes');
    ensureMeta('apple-mobile-web-app-status-bar-style', colorScheme === 'dark' ? 'black' : 'default');
    ensureMeta('apple-mobile-web-app-title', 'KnowAlong');
    ensureMeta('theme-color', colors.background, '(min-width: 701px)');
    ensureMeta('theme-color', colors.brand, '(max-width: 700px)');

    // Inject the global scrollbar-hiding CSS at runtime. The same Expo
    // Web export/dev-server strip that removes PWA tags also drops the
    // inline <style> block from index.html — without this injection the
    // desktop scrollbar is always visible on the centered 420pt column.
    // Idempotent: keyed on id="global-scrollbar-css" so React StrictMode
    // double-mount doesn't duplicate.
    const ensureStyle = (id: string, css: string) => {
      if (document.getElementById(id)) return;
      const el = document.createElement('style');
      el.id = id;
      el.textContent = css;
      document.head.appendChild(el);
    };
    ensureStyle(
      'global-scrollbar-css',
      '*::-webkit-scrollbar{display:none}*{scrollbar-width:none;-ms-overflow-style:none}',
    );

    // Register the installability-enabling service worker (passthrough,
    // no caching). Android Chrome's PWA installability criteria require
    // a registered SW with a fetch handler; without it, "Add to Home
    // Screen" on Android Chrome creates a browser shortcut that opens
    // WITH the address bar visible. See public/sw.js for the SW itself.
    //
    // Production-only (the SW install/activate lifecycle across refreshes
    // is one less thing to debug when dev doesn't register one). The
    // load listener is paired with a removeEventListener cleanup so the
    // audit-R4b pairing rule holds.
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        logger.warn('general', 'SW registration failed:', err);
      });
    };
    if (document.readyState === 'complete') {
      register();
      return;
    }
    window.addEventListener('load', register, { once: true });
    // Note: cleanup for the load listener is in the parent effect's
    // cleanup phase below. The runtime-injected tags are intentionally
    // not cleaned up — they persist across the page lifetime.
    return () => {
      window.removeEventListener('load', register);
    };
  }, [colorScheme, colors]);

  return (
    <TamaguiProvider config={config} defaultTheme={colorScheme}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <AuthGuard>
              <ToastProvider>
                <QueryProvider>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: {
                        ...SCREEN_BODY_STYLE,
                        backgroundColor: colors.backgroundDeep,
                      },
                    }}
                  />
                  <ToastContainer />
                </QueryProvider>
              </ToastProvider>
            </AuthGuard>
          </AuthProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </TamaguiProvider>
  );
}

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <RootShell />
      </ThemeProvider>
    </AppErrorBoundary>
  );
}

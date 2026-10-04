// app/_layout.tsx
// Root layout. Provider stack + PWA bootstrap.
//
// Provider stack (outer → inner):
//   ThemeProvider → SafeAreaProvider → GestureHandlerRootView →
//   AuthProvider → AuthGuard → ToastProvider → QueryProvider → Stack
//   + <ToastContainer/> (sibling of Stack, picks up toasts from anywhere)
//
// No TamaguiProvider: the shell ships zero Tamagui components (MobilePremium
// is hand-rolled RN and themes itself through ThemeProvider). Icons — the
// one real Tamagui dependency — run provider-less via shims/helpers-icon.js
// (passthrough themed(); every call site passes explicit color/size).
//
// Three web-only useEffect blocks are load-bearing:
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
//
//   3. Boot-plate handshake — lifts the pre-JS cover pasted into
//      index.html (the opt-in boot recipe), after theme + fonts settle.
//      Setting data-boot-ready is a no-op when no boot CSS exists.

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { isWeb, hasDocument, hasWindow } from '../utils/platform';
import { logger } from '../utils';
import { initializeNetworkListeners } from '../stores';
import { AuthProvider, ToastProvider, ThemeProvider, useAppTheme } from '../context';
import { AuthGuard, ToastContainer, AppErrorBoundary } from '../components/primitives';
import { QueryProvider } from '../lib/react-query';
import { RouteCurtain } from '../components/MobilePremium';
import { curtainEnabled, markBootReady } from '../utils/routeTransition';
import { APP_DISPLAY_NAME, APP_LAYOUT, SCREEN_BODY_STYLE } from '../constants';

// The curtain is theme-declared machinery (theme.transition.style — a
// const at module scope), so the mount decision is made once. Under the
// starter's 'none' default this is false and nothing mounts.
const CURTAIN_ON = curtainEnabled();

function RootShell() {
  const { colorScheme, colors } = useAppTheme();

  // Network listener — web online/offline events. The cleanup is paired
  // so audit R4b's listener-pairing rule holds.
  useEffect(() => {
    const cleanup = initializeNetworkListeners();
    return cleanup;
  }, []);

  // Boot-plate handshake (web only): lift the pre-JS ink cover, if the
  // consumer pasted one into index.html (the opt-in boot recipe — see
  // the design-system docs). Setting data-boot-ready is a no-op when no
  // boot CSS exists.
  useEffect(() => {
    if (!isWeb || !hasDocument()) return;
    markBootReady();
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
      const existing = document.querySelector(selector) as HTMLMetaElement | null;
      if (existing) {
        // UPDATE — the meta ships a static value in index.html; the
        // runtime repaints it when the mode switches (PWA theme follows).
        existing.setAttribute('content', content);
        return;
      }
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
    ensureMeta('apple-mobile-web-app-title', APP_DISPLAY_NAME);
    ensureMeta('theme-color', colors.background, '(min-width: 701px)');
    ensureMeta('theme-color', colors.brand, '(max-width: 700px)');

    // THE ROOT PAINT — the global shell CSS hardcodes the night ground
    // (Night Metro is dark-first); every pixel the app does not
    // explicitly paint shows through it. Repaint both from the LIVE
    // palette so a daytime-timetable user owns the whole canvas too
    // (the PWA status-bar area included).
    document.documentElement.style.backgroundColor = colors.background;
    document.body.style.backgroundColor = colors.background;

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
      '*::-webkit-scrollbar{display:none}*{scrollbar-width:none;-ms-overflow-style:none}*{-webkit-user-select:none;user-select:none}html,body{transition:background-color 200ms ease}input,textarea{-webkit-user-select:auto;user-select:auto;font-size:16px !important}',
    );

    // The focus law (index.html #global-focus-css, mirrored here): the
    // UA outline never leaks; every focusable control carries OUR ring
    // — a 2px rule in its own ink.
    ensureStyle(
      'global-focus-css',
      [
        "button:focus,[role='button']:focus,[role='link']:focus,a:focus,select:focus{outline-width:0;box-shadow:0 0 0 2px currentColor}",
        // `outline: none`, not outline-width — WebKit's UA ring is
        // outline-style: auto and ignores a width kill.
        'input:focus,textarea:focus,select:focus{outline:none}',
      ].join(''),
    );

    // NIGHT METRO faces — runtime restore of index.html's id'd
    // @font-face block (the export strip drops <head> styles; the
    // build-time injector covers exported routes, this covers dev and
    // anything the strip still misses). Unbounded (display/rollsign),
    // Golos Text (body), PT Mono (ledger), PT Serif (the journey's
    // literary face — regular + bold + italic). Mirror trio: index.html,
    // scripts/inject-critical-web.ts, this block.
    const ensureFontLinks = () => {
      const fontFiles = [
        '/fonts/Unbounded-var.ttf',
        '/fonts/GolosText-var.ttf',
        '/fonts/PT_Serif-Web-Regular.ttf',
        '/fonts/PT_Serif-Web-Bold.ttf',
      ];
      for (const href of fontFiles) {
        if (document.querySelector(`link[rel="preload"][href="${href}"]`)) continue;
        const l = document.createElement('link');
        l.rel = 'preload';
        l.href = href;
        l.as = 'font';
        l.type = 'font/ttf';
        // crossorigin is load-bearing on font preloads — without it the
        // anonymous-mode fetch is cached under a different key and the
        // font downloads twice.
        l.setAttribute('crossorigin', '');
        document.head.appendChild(l);
      }
    };
    ensureFontLinks();
    ensureStyle(
      'global-font-face-css',
      [
        "@font-face{font-family:'Unbounded';font-style:normal;font-weight:200 900;font-display:swap;src:url('/fonts/Unbounded-var.ttf') format('truetype')}",
        "@font-face{font-family:'Golos Text';font-style:normal;font-weight:400 900;font-display:swap;src:url('/fonts/GolosText-var.ttf') format('truetype')}",
        "@font-face{font-family:'PT Mono';font-style:normal;font-weight:400;font-display:swap;src:url('/fonts/PTMono-Regular.ttf') format('truetype')}",
        "@font-face{font-family:'PT Serif';font-style:normal;font-weight:400;font-display:swap;src:url('/fonts/PT_Serif-Web-Regular.ttf') format('truetype')}",
        "@font-face{font-family:'PT Serif';font-style:normal;font-weight:700;font-display:swap;src:url('/fonts/PT_Serif-Web-Bold.ttf') format('truetype')}",
        "@font-face{font-family:'PT Serif';font-style:italic;font-weight:400;font-display:swap;src:url('/fonts/PT_Serif-Web-Italic.ttf') format('truetype')}",
      ].join(''),
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
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <AuthGuard enabled={APP_LAYOUT.authGuard}>
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
                {CURTAIN_ON ? <RouteCurtain /> : null}
              </QueryProvider>
            </ToastProvider>
          </AuthGuard>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
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

// public/sw.js
//
// Installability-enabling service worker for Android Chrome.
//
// Purpose: Android Chrome's PWA installability criteria require a
// registered service worker with a fetch handler. Without this, the
// browser menu offers only "Add to Home Screen," which creates a Chrome
// shortcut that opens WITH the address bar visible. With this SW
// registered, Chrome offers "Install app," and the installed launcher
// opens in `display: "standalone"` mode per public/manifest.json — no
// address bar, no browser chrome.
//
// This is a PASSTHROUGH service worker: it implements the install /
// activate / fetch event handlers Chrome requires but does NO caching.
// Offline support is a separate concern — adding naïve caching here
// would risk serving stale bundles after Vercel deploys. If offline
// support is pursued later, replace this file with a cache-aware SW
// (Workbox, cache-versioning, network-first strategies) — don't extend
// this one in place.
//
// Registered from app/_layout.tsx (production only, after window load).
// See docs/architecture/pwa-installability.md §4 for the registration
// gating rationale and the audit carve-outs (S8 + R4b) that this file
// relies on.

// Install: take over immediately so the SW is active for the current
// page's next navigation (no need to wait for all tabs to close).
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: claim existing clients so the SW controls the current
// page immediately, not just on next navigation.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Fetch: passthrough. Chrome's installability check requires a fetch
// handler to be registered; calling fetch() with the original request
// satisfies this without altering any network behavior.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

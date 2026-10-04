// public/sw.js
//
// Installability + repeat-visit service worker.
//
// Two jobs:
//
//   1. Installability — Android Chrome's PWA installability criteria
//      require a registered SW with a fetch handler. Without it the
//      browser menu offers only "Add to Home Screen," which creates a
//      Chrome shortcut that opens WITH the address bar visible. With
//      this SW registered, Chrome offers "Install app," and the
//      installed launcher opens in `display: "standalone"` mode per
//      public/manifest.json — no address bar, no browser chrome.
//
//   2. Repeat-visit speed — hashed build assets, fonts, and icons are
//      served cache-first (instant warm loads); navigations are
//      network-first with a cache fallback (a deploy's new HTML lands
//      on the very next visit, offline still boots); and everything
//      else is NOT intercepted at all — the browser's native HTTP
//      cache handles it. That last part is load-bearing: a blanket
//      `respondWith(fetch(request))` passthrough defeats Safari/
//      WebKit's HTTP cache (measured: the full compressed bundle
//      re-downloaded on every warm load), so this SW only responds
//      for the categories it actually caches.
//
// Deploy safety: build assets are content-hashed — a deploy's new HTML
// references new URLs, so stale chunks are never served; the fonts and
// icons use stale-while-revalidate (a redeploy lands one visit later
// for those); old caches drop out via the cache-name rotation below.
// Bump CACHE_VERSION when rotating deliberately.
//
// Registered from app/_layout.tsx (production only, after window load).
// See docs/architecture/pwa-installability.md §4 for the registration
// gating rationale and the audit carve-outs (S8 + R4b) that this file
// relies on.

// Night Metro cache. Renamed from the starter's `arqavellum-*` in the
// same change as the font trio landing — the activate handler drops
// any cache not matching this name, so old starter caches self-heal.
const CACHE_VERSION = 'v1';
const CACHE = `knowalong-${CACHE_VERSION}`;

// Install-time precache — the self-hosted faces (when a consumer
// declares any), so the FIRST visit after install renders statements
// and figures in their fonts even on a dead network;
// stale-while-revalidate keeps them fresh after that. Consumers edit
// this list to their own font files in the same change as the
// @font-face declarations (mirror trio).
const PRECACHE_URLS = [
  '/fonts/Unbounded-var.ttf',
  '/fonts/GolosText-var.ttf',
  '/fonts/PTMono-Regular.ttf',
];

// Cache-first categories. Hashed build output (/_expo/, /assets/) is
// pure cache-first — the URL changes on every deploy, so a background
// refresh can only ever re-download the same immutable bytes (that was
// a measured warm-visit bandwidth bug before this split). The
// self-hosted fonts/icons aren't hashed — they get stale-while-
// revalidate so a redeploy lands one visit later.
const HASHED_PREFIXES = ['/_expo/', '/assets/'];
const SWR_PREFIXES = ['/fonts/', '/icons/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      if (PRECACHE_URLS.length > 0) {
        const cache = await caches.open(CACHE);
        await cache.addAll(PRECACHE_URLS);
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n !== CACHE).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // APIs / insights: native path

  const hashed = HASHED_PREFIXES.some(
    (prefix) => url.pathname === prefix || url.pathname.startsWith(prefix),
  );
  const swr = SWR_PREFIXES.some(
    (prefix) => url.pathname === prefix || url.pathname.startsWith(prefix),
  );

  if (hashed) {
    // Pure cache-first: immutable bytes, refresh is pure waste.
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        } catch {
          return Response.error();
        }
      })(),
    );
    return;
  }

  if (swr) {
    // Cache-first + background refresh (SWR): fonts/icons aren't
    // content-hashed, so a redeploy lands on the following visit.
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        return hit || (await network) || Response.error();
      })(),
    );
    return;
  }

  if (req.mode === 'navigate') {
    // Network-first for route HTML: deploys land on the next visit;
    // offline falls back to the last-known shell (route HTML or /).
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const res = await fetch(req);
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        } catch {
          const hit =
            (await cache.match(req)) ||
            (await cache.match(url.pathname)) ||
            (await cache.match('/index.html'));
          if (hit) return hit;
          return Response.error();
        }
      })(),
    );
  }
  // Everything else: no respondWith — the browser's native HTTP cache
  // applies (the blanket passthrough was the warm-load tax).
});

# PWA Installability

**Canonical location:** `docs/architecture/pwa-installability.md`
**Status:** Active. Arqavellum ships manifest + SW + runtime meta-tag injection + placeholder icons. Consumers override the icons and brand colors.

This doc is the single source of truth for **what makes an arqavellum-derived
app installable** as a PWA. It covers the installability criteria, the
build-pipeline gotcha that motivates the runtime injection block, and
the procedure for changing the home-screen icon.

It is **distinct from** PWA-aware UI gating (compact vs. full variants
based on whether the user is in a standalone context), which lives in
`mobile-premium-design-system.md` §7. That doc answers "given the user
is in a PWA, what do we show them?"; this one answers "how do we make
the app installable as a PWA in the first place?"

When the doc and the source disagree, **the source wins**. Fix the
source, then update the doc in the same change.

---

## 1. The three installability criteria (Android Chrome)

Chrome on Android promotes "Add to Home Screen" to "Install app" only
when all three of the following are true for the origin:

1. **Web App Manifest** served over HTTPS with:
   - `name` or `short_name`
   - `start_url`
   - `display: "standalone"` (or `fullscreen`, `minimal-ui`)
   - At least one icon at **192px** or larger with `purpose: "any"`
   - At least one icon with `purpose: "maskable"` (Android adaptive icon)
2. **Service worker** registered with a `fetch` event handler (the handler
   can be a no-op passthrough — its presence is what Chrome checks).
3. **HTTPS**. Vercel serves over HTTPS by default — no action.

iOS Safari does not require a service worker; it uses the
`apple-mobile-web-app-capable` meta tag and the `apple-touch-icon` link
to determine standalone behavior and the home-screen icon. Both are
covered by the runtime injection block in §3.

The full set of PWA tags injected at runtime (source of truth:
`app/_layout.tsx` web-bootstrap effect):

| Tag | Purpose | Audience |
|---|---|---|
| `<link rel="manifest">` | Links the Web App Manifest | Android Chrome (installability), iOS 16.4+ |
| `<link rel="apple-touch-icon">` | Home-screen icon | iOS Safari |
| `<link rel="icon" type="image/png">` | Browser tab icon | All browsers |
| `<meta name="apple-mobile-web-app-capable">` | Standalone mode | iOS Safari |
| `<meta name="mobile-web-app-capable">` | Standalone mode (legacy) | Android Chrome (pre-manifest era) |
| `<meta name="apple-mobile-web-app-status-bar-style">` | Status bar appearance | iOS Safari |
| `<meta name="apple-mobile-web-app-title">` | Home-screen label | iOS Safari |
| `<meta name="theme-color" media="(min-width: 701px)">` | Browser UI tint (desktop) | Chrome desktop / Android |
| `<meta name="theme-color" media="(max-width: 700px)">` | Browser UI tint (mobile) | Chrome mobile |

---

## 2. The Expo Web stripping gotcha (load-bearing)

**This is the single biggest gotcha in the PWA stack.** Read it before
touching the runtime injection block.

Expo Web's static export (`expo export --platform web --output-dir dist`,
invoked by the Vercel build command) processes `index.html` through a
HTML transformer that **strips every PWA-related tag from `<head>`**
except `<link rel="icon">`. The following tags declared in `index.html`
are **removed from the deployed `dist/index.html`**:

- `<link rel="manifest">`
- `<link rel="apple-touch-icon">`
- All `<meta name="apple-mobile-web-app-*">` tags
- All `<meta name="theme-color">` tags
- `<meta name="mobile-web-app-capable">`

**Consequence:** even though `public/manifest.json` and `public/sw.js`
are correctly served by Vercel as static assets, Chrome Android finds no
`<link rel="manifest">` in the HTML to link them — the Manifest tab in
DevTools is empty and installability silently fails. The browser falls
back to "Add to Home Screen" which creates a Chrome shortcut with the
address bar visible, defeating the whole point.

The fix is runtime injection (§3). The runtime injection is what
actually ships the tags to the browser.

---

## 3. Runtime injection pattern

**File:** `app/_layout.tsx`, inside the main web-bootstrap `useEffect`.

On web, after mount, the bootstrap effect walks a list of `<link>` and
`<meta>` tag declarations and appends each to `<head>` if it's not
already present. Each tag is guarded with an existence check so
React StrictMode's double-mount in dev doesn't append duplicates.

```typescript
const ensureMeta = (name: string, content: string, media?: string) => {
  if (document.querySelector(`meta[name="${name}"]${media ? `[media="${media}"]` : ''}`)) return;
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
ensureMeta('apple-mobile-web-app-status-bar-style', 'default');
ensureMeta('apple-mobile-web-app-title', 'Arqavellum');
ensureMeta('theme-color', theme.colors.light.background, '(min-width: 701px)');
ensureMeta('theme-color', theme.colors.light.brand, '(max-width: 700px)');
```

Arqavellum's status-bar style is `default` (light surface). iOS Safari will
use the page background for the status bar area. Consumers wanting a
different status bar treatment override this in their `_layout.tsx`.

The `theme-color` media split:
- Desktop (`min-width: 701px`): neutral `background` — lets the browser
  chrome recede.
- Mobile (`max-width: 700px`): `brand` color — gives the address-bar
  tint a recognizable brand cue on a small viewport.

---

## 4. Service worker registration

**File:** `app/_layout.tsx`, separate `useEffect`.

```typescript
useEffect(() => {
  if (!isWeb || process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
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
  return () => window.removeEventListener('load', register);
}, []);
```

Gating rationale:

- **`isWeb`** — native has no `navigator.serviceWorker`.
- **`process.env.NODE_ENV !== 'production'`** — dev skips registration so
  the install/activate lifecycle across refreshes isn't one more thing
  to debug.
- **`'serviceWorker' in navigator`** — SSR / older browsers don't
  support it.
- **`window.addEventListener('load', register, { once: true })`** —
  defers until after first paint so the registration network request
  doesn't compete with initial bundle loads. Paired with a
  `removeEventListener` cleanup so audit R4b's listener-pairing rule
  holds and StrictMode's double-mount in dev doesn't double-register.

The SW itself is `public/sw.js` — a passthrough (no caching). Chrome's
installability check only requires a fetch handler to be registered;
calling `fetch()` with the original request satisfies this without
altering network behavior.

---

## 5. Changing the home-screen icon

Consumers replace the placeholder icons at `public/icons/`. Three files
required by the manifest:

| File | Size | Purpose |
|---|---|---|
| `public/icons/192.png` | 192×192 | Android Chrome (any), iOS apple-touch-icon |
| `public/icons/512.png` | 512×512 | Android Chrome (any), splash screen |
| `public/icons/512-maskable.png` | 512×512 | Android adaptive icon (maskable) |

For the maskable variant, keep content inside the inner 80% ("safe
zone") — Android's adaptive icon masking can crop the outer 20% on
some device launchers.

The placeholder generator at `scripts/generate-placeholder-icons.ts`
produces solid-color PNGs matching the brand color slot. It's a
convenience for freshening the placeholder when the brand changes;
consumers replace the output with actual brand artwork (the script's
output is intentionally minimal — just a solid color, not a logo).

After changing icons:

1. Verify all three files exist and are valid PNGs (`file public/icons/*.png`).
2. Update `manifest.json` if icon paths or sizes change.
3. Update the `apple-touch-icon` and `icon` `href` in the runtime
   injection block if the 192 path changes.
4. Redeploy and verify in Chrome DevTools → Application → Manifest
   (icons render correctly) and Lighthouse PWA audit (installable).

---

## 6. Verifying installability

The fastest verification path post-deploy:

1. **Chrome DevTools → Application → Manifest.** Should show the
   manifest fields populated, all three icons rendered, and "Install
   ability: ✓" (or the equivalent positive signal). If the tab is
   empty, the runtime injection block didn't fire — check console for
   errors.
2. **Chrome DevTools → Application → Service Workers.** Should show
   `/sw.js` registered and activated. If empty, the registration effect
   didn't fire (check `isWeb` + `NODE_ENV` gates).
3. **Lighthouse PWA audit.** "Installable" should be ✓. The full PWA
   badge is stricter (needs HTTPS, manifest fields, SW, etc.).
4. **Chrome Android (real device or emulator).** Open the deployed URL,
   open the browser menu — should say "Install app" (not "Add to Home
   Screen"). If it only offers "Add to Home Screen," one of the three
   criteria from §1 isn't met.
5. **iOS Safari.** Tap Share → Add to Home Screen. The installed icon
   should launch in standalone mode (no Safari chrome).

---

## 7. Consumer extension points

- **Override brand colors in manifest.** Edit `public/manifest.json`
  → `theme_color` and `background_color` to match the consumer's
  brand. Arqavellum defaults to indigo `#4F46E5` and white `#FFFFFF`.
- **Override status-bar style.** Edit the `apple-mobile-web-app-status-bar-style`
  meta in the runtime injection block. Arqavellum defaults to `default`
  (light surface treatment).
- **Override theme-color split.** Edit the two `theme-color` meta
  injections in `app/_layout.tsx`. Arqavellum splits desktop/mobile; a
  consumer can collapse to one or use different brand tints.
- **Add offline caching.** Replace `public/sw.js` with a cache-aware
  service worker (Workbox, etc.). Don't extend the passthrough in
  place — naive caching risks stale bundles after Vercel deploys.

#!/usr/bin/env bun
// scripts/inject-critical-web.ts
//
// Post-export critical-HTML injection. Expo Web's static export strips
// every <head> tag from index.html except <link rel="icon"> — including
// the PWA metas, theme-colors, and the id'd global CSS. The runtime
// injection in app/_layout.tsx restores them AFTER hydration; this
// script copies them into every exported dist/**/*.html <head> so the
// DEPLOYED first frame already carries them at parse time (correct
// theme-color at browser-chrome paint, no scrollbar flash, PWA metas
// present before any script runs).
//
// Extracted from index.html (the single source of truth — the mirror
// set is index.html, this script, and the runtime injection):
//
//   1. The PWA tags: both theme-color metas, the manifest /
//      apple-touch-icon / icon links, and the apple-mobile-web-app-*
//      metas.
//   2. Every id'd <style> block (the global shell CSS; a consumer's
//      self-hosted @font-face block rides the same mechanism).
//   3. Every id'd <script> block (a consumer's pre-JS boot plate lifts
//      on a handshake the root layout sets — the ink boot recipe).
//   4. Every <link rel="preload" as="font"> for self-hosted faces —
//      the starter ships none; consumers who add them get preloads in
//      every exported route for free.
//
// Every injection is idempotent, so re-running over an already-patched
// dist is a no-op. Chained into `build:web` and `vercel-build` after
// `expo export`.

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '..');
const SOURCE = join(PROJECT_ROOT, 'index.html');
const DIST = join(PROJECT_ROOT, 'dist');

const html = readFileSync(SOURCE, 'utf8');

const blocks: { key: string; markup: string; present: (out: string) => boolean }[] = [];

// 1 — the PWA tags (theme-colors, manifest/icons, apple metas). The
// title stays out: expo-router owns the exported <title>.
const PWA_TAG_RE = /<meta name="(?:theme-color|apple-mobile-web-app-capable|mobile-web-app-capable|apple-mobile-web-app-status-bar-style|apple-mobile-web-app-title)"[^>]*>|<link rel="(?:manifest|apple-touch-icon|icon)"[^>]*>/g;
const pwaTags = html.match(PWA_TAG_RE) ?? [];
if (pwaTags.length === 0) {
  console.error('  ✗ inject-critical-web: no PWA tags found in index.html');
  process.exit(1);
}
blocks.push({
  key: 'pwa tags',
  markup: pwaTags.join('\n    '),
  present: (out) => out.includes('name="theme-color"'),
});

// 2 — every id'd <style> block (order preserved).
const styleMatches = html.matchAll(/<style id="([\w-]+)">[\s\S]*?<\/style>/g);
for (const m of styleMatches) {
  blocks.push({
    key: `style #${m[1]}`,
    markup: m[0],
    present: (out) => out.includes(`id="${m[1]}"`),
  });
}

// 3 — every id'd <script> block (order preserved). The opt-in boot
// plate's pre-JS lifter rides this mechanism.
const scriptMatches = html.matchAll(/<script id="([\w-]+)"[^>]*>[\s\S]*?<\/script>/g);
for (const m of scriptMatches) {
  blocks.push({
    key: `script #${m[1]}`,
    markup: m[0],
    present: (out) => out.includes(`id="${m[1]}"`),
  });
}

// 4 — font preloads (self-hosted faces; the starter ships none).
const preloads = html.match(/<link[^>]*rel="preload"[^>]*\/fonts\/[^>]*>/g) ?? [];
if (preloads.length > 0) {
  blocks.push({
    key: `${preloads.length} font preload(s)`,
    markup: preloads.join('\n    '),
    present: (out) => /<link[^>]*rel="preload"[^>]*\/fonts\//.test(out),
  });
}

function listHtmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listHtmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

if (!statSync(DIST, { throwIfNoEntry: false })?.isDirectory()) {
  console.error('  ✗ dist/ does not exist — run the export first.');
  process.exit(1);
}

let patched = 0;
let skipped = 0;
let bytes = 0;
for (const file of listHtmlFiles(DIST)) {
  let out = readFileSync(file, 'utf8');
  const before = out.length;
  for (const block of blocks) {
    if (block.present(out)) continue;
    out = out.replace('</head>', `    ${block.markup}\n  </head>`);
  }
  if (out.length !== before) {
    writeFileSync(file, out);
    patched += 1;
    bytes += out.length - before;
  } else {
    skipped += 1;
  }
}

console.log(
  `  inject-critical-web: ${patched} patched, ${skipped} already patched (+${bytes} bytes) — PWA tags, id'd styles${preloads.length > 0 ? `, ${preloads.length} font preload(s)` : ''} in every exported route`,
);

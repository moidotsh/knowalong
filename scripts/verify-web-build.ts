#!/usr/bin/env bun
/**
 * scripts/verify-web-build.ts
 *
 * Build-contract assertion for the production static-web export.
 *
 * Catches the silent failure mode where `expo export --platform web` exits 0
 * but produces zero HTML route files in `dist/`. That class of failure was
 * observed when the Tamagui static extractor's esbuild child service died
 * with EPIPE under Metro/Jest worker contention; Tamagui's loader swallowed
 * the error, returned a null config, and static rendering skipped every
 * route. `dist/` ended up with only the static `public/` files (icons,
 * manifest, sw.js) — no `index.html`, no route HTML — but the build command
 * still exited 0.
 *
 * This script runs the production web build with non-secret placeholder
 * public Supabase env values and asserts:
 *
 *   1. The build exits 0.
 *   2. Every file in REQUIRED_HTML_ROUTES exists under `dist/` with the
 *      exact path/filename emitted by Expo Router's static export. The
 *      eight required routes are the starter's baseline shell; consumer
 *      domain routes may add more HTML files, and any extras are reported
 *      on success but do not fail the gate.
 *   3. The build log contains no Tamagui extraction-failure signatures
 *      (`Missing "themes"` or `Got a empty / proxied config!`).
 *
 * Cross-platform: uses only `Bun.spawn` (no GNU `timeout`, no shell-specific
 * syntax). The build itself is single-worker (`--max-workers=1`) to match
 * the production command and eliminate the concurrent-esbuild-service race
 * that triggered the original flake.
 *
 * Gate placement: NOT in `.husky/pre-commit` — a 15s build on top of the
 * existing ~10s structural gate roughly doubles commit latency. Recommended
 * permanent home is a pre-push hook or CI workflow.
 *
 * Contract scope: this script verifies required starter routes and static
 * output shape. It does NOT verify browser PWA installability, service-
 * worker registration or activation, manifest runtime validity, hydration
 * correctness, Vercel deployed behavior, Lighthouse/PWA status, or any
 * native platform target.
 *
 * Run: `bun run verify:web-build`
 * Exits 0 on contract pass, 1 on contract fail.
 */

import { existsSync, rmSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '..');
const DIST_DIR = join(PROJECT_ROOT, 'dist');
const BUILD_LOG = join(PROJECT_ROOT, '.verify-web-build.log');

// Required starter HTML routes emitted by `expo export --platform web` for
// the Arqavellum starter at baseline.
//
// Expo Router's static export emits one HTML file per route, named after
// the route's URL path with `+not-found` and `_sitemap` keeping their
// Expo-internal symbols:
//
//   app/index.tsx             -> dist/index.html
//   app/login.tsx             -> dist/login.html
//   app/register.tsx          -> dist/register.html
//   app/forgot-password.tsx   -> dist/forgot-password.html
//   app/settings/index.tsx    -> dist/settings/index.html
//   app/dev/premium.tsx       -> dist/dev/premium.html
//   (expo-router internal)    -> dist/_sitemap.html
//   (expo-router internal)    -> dist/+not-found.html
//
// KnowAlong note: `app/settings.tsx` was promoted to `app/settings/index.tsx`
// so the `app/settings/companion.tsx` sibling route can coexist under the
// `/settings` URL prefix. The export shape changed from `dist/settings.html`
// to `dist/settings/index.html` accordingly.
//
// Contract shape (since the 2026-07-19 extensibility refinement):
//   - Every file in REQUIRED_HTML_ROUTES must exist. A missing required
//     route fails the gate (the original Tamagui null-config regression
//     dropped routes silently).
//   - Additional HTML files under dist/ are ALLOWED. A consumer adding
//     domain routes produces extras; those extras are reported on success
//     so the consumer can confirm their routes shipped, but they do not
//     fail the gate.
//   - The starter's own baseline run produces zero extras (the eight
//     required routes are the entire emitted set).
const REQUIRED_HTML_ROUTES: readonly string[] = [
  'index.html',
  'login.html',
  'register.html',
  'forgot-password.html',
  'settings/index.html',
  'dev/premium.html',
  '_sitemap.html',
  '+not-found.html',
] as const;

// Tamagui extraction-failure signatures. Their presence means the static
// extractor's config load failed and component extraction was skipped —
// every dependent route silently drops out of the static export.
const FAILURE_SIGNATURES = [
  'Missing "themes" in your tamagui.config file',
  'Got a empty / proxied config!',
];

// Non-secret placeholder public env values. These are NOT real credentials —
// they exist only to satisfy `constants/supabase.ts`'s production-time
// requiredEnv() check during static rendering. The resulting bundle is never
// shipped; this script deletes `dist/` on success.
const PLACEHOLDER_ENV: Record<string, string> = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon-key',
};

function fail(message: string): never {
  console.error(`  ✗ ${message}`);
  console.error('');
  console.error(`  Build log: ${BUILD_LOG}`);
  console.error('  (dist/ preserved for inspection — delete manually before re-running.)');
  process.exit(1);
}

function listHtmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      out.push(...listHtmlFiles(join(dir, entry.name)));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

function countHtmlFiles(dir: string): number {
  return listHtmlFiles(dir).length;
}

async function main() {
  console.log('→ verify-web-build: production static-web build contract');
  console.log('');

  // Start from a clean generated-output state.
  if (existsSync(DIST_DIR)) {
    rmSync(DIST_DIR, { recursive: true, force: true });
  }

  const startTime = Date.now();

  // Spawn the production build. Single worker (`--max-workers=1`) to match
  // the pinned production command and avoid the concurrent esbuild-service
  // race that triggered the original flake.
  const proc = Bun.spawn(
    ['bunx', 'expo', 'export', '--platform', 'web', '--output-dir', 'dist', '--max-workers=1'],
    {
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        ...PLACEHOLDER_ENV,
        // Match vercel-build's TAMAGUI_TARGET=web so the build is identical
        // to production. EXPO_NO_DOTENV=1 prevents stray `.env.local` values
        // from leaking into the verification build.
        TAMAGUI_TARGET: 'web',
        EXPO_NO_DOTENV: '1',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );

  // Capture combined output for diagnostic assertion (#4) and log file.
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const combined = stdout + '\n' + stderr;
  await Bun.write(BUILD_LOG, combined);

  const exitCode = await proc.exited;
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`  Build exited ${exitCode} in ${durationSec}s`);

  // Assertion #1: build exit code.
  if (exitCode !== 0) {
    fail(`Build exited non-zero (exit=${exitCode}).`);
  }

  // Assertion #2: dist/ must exist (defensive — a passing exit code with
  // no dist/ would mean the build command was misconfigured, not that the
  // contract is unclear about which files to inspect below).
  if (!existsSync(DIST_DIR)) {
    fail(`dist/ does not exist — build exited 0 but produced no output directory.`);
  }

  // Assertion #3: required starter routes exist (subset contract).
  // Every file in REQUIRED_HTML_ROUTES must exist. The total HTML file
  // count is NOT asserted against the required length — consumer domain
  // routes legitimately add extras, and those extras are reported on
  // success (see below). The two halves together catch the original
  // silent-failure mode (missing routes) while leaving the gate open to
  // extension.
  const htmlCount = countHtmlFiles(DIST_DIR);
  const requiredCount = REQUIRED_HTML_ROUTES.length;
  console.log(`  HTML route files under dist/: ${htmlCount} (required ${requiredCount})`);

  const missing = REQUIRED_HTML_ROUTES.filter((rel) => !existsSync(join(DIST_DIR, rel)));
  if (missing.length > 0) {
    fail(
      `Missing ${missing.length} required HTML route file(s) under dist/:\n    ${missing.join('\n    ')}\n  Tamagui null-config regression or route export shape change suspected.`,
    );
  }

  // Compute extras (consumer-added domain routes). Reported on success;
  // never fails the gate. Walks dist/ and subtracts the required set.
  const emitted = listHtmlFiles(DIST_DIR).map((p) => p.replace(DIST_DIR + '/', ''));
  const required = new Set(REQUIRED_HTML_ROUTES);
  const extras = emitted
    .filter((p) => !required.has(p))
    .sort((a, b) => a.localeCompare(b));

  // Assertion #4: no Tamagui extraction-failure signatures.
  for (const signature of FAILURE_SIGNATURES) {
    if (combined.includes(signature)) {
      fail(`Build log contains Tamagui failure signature: "${signature}"`);
    }
  }

  // All assertions passed — clean up generated output and log.
  rmSync(DIST_DIR, { recursive: true, force: true });
  rmSync(BUILD_LOG, { force: true });

  console.log('');
  if (extras.length > 0) {
    console.log(`  Additional route HTML (consumer domain routes, allowed):`);
    for (const rel of extras) {
      console.log(`    + ${rel}`);
    }
    console.log('');
  }
  console.log('  ✓ build-contract pass (dist/ cleaned up)');
  process.exit(0);
}

main().catch((err) => {
  console.error('  ✗ verify-web-build threw unexpectedly:');
  console.error(err);
  process.exit(1);
});

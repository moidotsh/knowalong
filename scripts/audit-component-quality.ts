#!/usr/bin/env bun
/**
 * scripts/audit-component-quality.ts
 *
 * Component-quality audit. Enforces three checks that can be statically
 * verified:
 *
 *   C1 — no direct `router.push` / `router.replace` / `router.back`
 *        calls outside the navigation helper layer. All navigation
 *        must go through `navigation/NavigationHelper.tsx` (or a
 *        consumer-added `hooks/useAuthNavigation.ts` if it exists).
 *        Suppress with `// c1-exempt`.
 *
 *   C2 — no RN `Modal` (from `react-native`) usage outside the
 *        architecturally-exempt files. All modals must use the
 *        shared dialog primitive (`components/MobilePremium/MobileDialog.tsx`
 *        is the canonical dialog and the one legitimate RN Modal site).
 *        Suppress with `// c2-exempt`.
 *
 *   C4 — no `ActivityIndicator` outside the loading-component
 *        primitives. Arqavellum ships none of LoadingSpinner / LoadingOverlay /
 *        AppLoading by default (a consumer creates them). Only
 *        `components/MobilePremium/MobilePrimaryButton.tsx` is exempt
 *        because it owns its inline spinner. Suppress with `// c4-exempt`.
 *
 * Deferred to manual review (not statically auditable):
 *   C6 (ScrollView + .map for lists >10), C7 (custom touch handlers).
 *
 * No --fix mode: these violations aren't safely auto-fixable.
 *
 * Mirrors the structure of scripts/audit-security.ts /
 * scripts/audit-ui-theme.ts.
 *
 * Run: `bun run scripts/audit-component-quality.ts`
 * Exits 1 on any violation, 0 otherwise.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { extname, join, relative } from 'path';

const ROOT = process.cwd();

// ── File walking (shared with the other audit scripts) ───────────────

// Directories that should never be walked.
const EXCLUDE_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.next',
  '__tests__',
  '__mocks__',
  'scripts',
]);

const SOURCE_EXTS = ['.ts', '.tsx', '.js', '.jsx'];

// Path prefixes that should never be walked. `supabase/functions` is Deno-side
// code with different conventions (console.* logging, https:// imports) —
// client-side audits don't apply.
const EXCLUDE_PATH_PREFIXES = ['supabase/functions'];

function isExcluded(absPath: string): boolean {
  const rel = relative(ROOT, absPath);
  // The root itself is never excluded.
  if (rel === '') return false;
  if (rel.startsWith('..')) return true;
  const parts = rel.split('/');
  if (parts.some((p) => EXCLUDE_DIRS.has(p))) return true;
  for (const prefix of EXCLUDE_PATH_PREFIXES) {
    if (rel === prefix || rel.startsWith(prefix + '/')) return true;
  }
  return false;
}

function walk(dir: string, out: string[] = []): string[] {
  if (isExcluded(dir)) return out;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, out);
    } else if (st.isFile() && SOURCE_EXTS.includes(extname(full))) {
      if (!isExcluded(full)) out.push(full);
    }
  }
  return out;
}

// ── Violation type ────────────────────────────────────────────────────

type Check = 'C1' | 'C2' | 'C4';

interface Violation {
  check: Check;
  file: string;
  line: number;
  message: string;
}

function lineOf(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
}

// Lookback window for `// <check>-exempt` suppression markers.
const EXEMPT_LOOKBACK_CHARS = 300;

// A line whose portion before the match starts with `//`, `/*`, `*`
// (JSDoc continuation), or `{/*` (JSX comment) is a comment — not a
// live statement. Same heuristic as S7 in audit-ui-theme.ts, extended
// to also cover JSX comments where the word "Modal" commonly appears.
const COMMENT_PREFIX_REGEX = /^\s*(\/\/|\/\*|\*|\{\/\*)/;

// Given the file content and a match index, return the text from the
// start of the containing line up to the match position. Used to test
// the comment-prefix heuristic.
function textBeforeMatchOnLine(content: string, matchIndex: number): string {
  let lineStart = matchIndex;
  while (lineStart > 0 && content[lineStart - 1] !== '\n') lineStart--;
  return content.slice(lineStart, matchIndex);
}

// ── C1: direct router.push / router.replace / router.back ────────────
//
// Navigation must go through `navigation/NavigationHelper.tsx` (the
// wrapper layer) or `hooks/useAuthNavigation.ts` (a consumer-added
// specialized hook, if it exists). These two files are the only places
// where raw `router.*` calls are legitimate.

const C1_REGEX = /router\.(push|replace|back)\s*\(/g;

const C1_EXEMPT_FILES = new Set([
  join(ROOT, 'navigation/NavigationHelper.tsx'),
  join(ROOT, 'hooks/useAuthNavigation.ts'),
]);

const C1_EXEMPT_REGEX = /\bc1-exempt\b/;

function auditC1(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    if (C1_EXEMPT_FILES.has(file)) continue;
    const content = readFileSync(file, 'utf8');
    C1_REGEX.lastIndex = 0;
    let match;
    while ((match = C1_REGEX.exec(content)) !== null) {
      const exemptScanStart = Math.max(
        0,
        match.index - EXEMPT_LOOKBACK_CHARS,
      );
      const exemptScan = content.slice(exemptScanStart, match.index);
      if (C1_EXEMPT_REGEX.test(exemptScan)) continue;

      violations.push({
        check: 'C1',
        file: relative(ROOT, file),
        line: lineOf(content, match.index),
        message:
          'direct router.push/replace/back call — use a navigation/NavigationHelper helper (or add // c1-exempt with justification)',
      });
    }
  }
  return violations;
}

// ── C2: RN Modal from react-native ──────────────────────────────────
//
// All modals must use the shared dialog primitive. The canonical
// dialog primitive is `components/MobilePremium/MobileDialog.tsx` —
// it deliberately wraps RN Modal to escape host ScrollView / transform /
// clipping contexts. This is the one place in arqavellum where RN Modal
// is the point.

const C2_REGEX = /\bModal\b/g;

const C2_EXEMPT_FILES = new Set([
  // MobileDialog is the MobilePremium kit's canonical dialog primitive.
  // It deliberately wraps RN Modal to escape host ScrollView / transform /
  // clipping contexts. This is the one place where RN Modal is the point.
  join(ROOT, 'components/MobilePremium/MobileDialog.tsx'),
  // MobileSheet is the MobilePremium kit's canonical bottom/top sheet. Same
  // load-bearing reason as MobileDialog: a sheet MUST portal to the OS level
  // or it gets clipped by ancestor surfaces (MobileSurface has overflow:hidden
  // + borderRadius, and host ScrollViews swallow absolute positioning).
  join(ROOT, 'components/MobilePremium/MobileSheet.tsx'),
]);

const C2_EXEMPT_REGEX = /\bc2-exempt\b/;

function auditC2(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    if (C2_EXEMPT_FILES.has(file)) continue;
    const content = readFileSync(file, 'utf8');
    C2_REGEX.lastIndex = 0;
    let match;
    while ((match = C2_REGEX.exec(content)) !== null) {
      // Comment skip — `//`, `/*`, `*` (JSDoc), `{/*` (JSX).
      const beforeMatch = textBeforeMatchOnLine(content, match.index);
      if (COMMENT_PREFIX_REGEX.test(beforeMatch)) continue;

      const exemptScanStart = Math.max(
        0,
        match.index - EXEMPT_LOOKBACK_CHARS,
      );
      const exemptScan = content.slice(exemptScanStart, match.index);
      if (C2_EXEMPT_REGEX.test(exemptScan)) continue;

      violations.push({
        check: 'C2',
        file: relative(ROOT, file),
        line: lineOf(content, match.index),
        message:
          'RN Modal usage — use the shared dialog from components/MobilePremium/MobileDialog.tsx (or add // c2-exempt with justification)',
      });
    }
  }
  return violations;
}

// ── C4: ActivityIndicator outside loading components ────────────────
//
// Inline / form / init loading must go through consumer-created loading
// primitives: `LoadingSpinner` (inline), `LoadingOverlay` (full-screen),
// `AppLoading` (init). Arqavellum ships none of these by default — the
// exempt list starts empty except for `MobilePrimaryButton.tsx`, which
// owns its inline spinner.

const C4_REGEX = /\bActivityIndicator\b/g;

const C4_EXEMPT_FILES = new Set([
  // Arqavellum ships the three loading primitives — each wraps
  // ActivityIndicator as its core job. Consumers can add their own
  // primitives (or wrap these) without re-touching this list.
  join(ROOT, 'components/primitives/LoadingSpinner.tsx'),
  join(ROOT, 'components/primitives/LoadingOverlay.tsx'),
  join(ROOT, 'components/primitives/AppLoading.tsx'),
  // MobilePrimaryButton owns its inline spinner — the canonical spot
  // for an inline ActivityIndicator inside a button primitive.
  join(ROOT, 'components/MobilePremium/MobilePrimaryButton.tsx'),
]);

const C4_EXEMPT_REGEX = /\bc4-exempt\b/;

function auditC4(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    if (C4_EXEMPT_FILES.has(file)) continue;
    const content = readFileSync(file, 'utf8');
    C4_REGEX.lastIndex = 0;
    let match;
    while ((match = C4_REGEX.exec(content)) !== null) {
      // Comment skip — `//`, `/*`, `*` (JSDoc), `{/*` (JSX).
      const beforeMatch = textBeforeMatchOnLine(content, match.index);
      if (COMMENT_PREFIX_REGEX.test(beforeMatch)) continue;

      const exemptScanStart = Math.max(
        0,
        match.index - EXEMPT_LOOKBACK_CHARS,
      );
      const exemptScan = content.slice(exemptScanStart, match.index);
      if (C4_EXEMPT_REGEX.test(exemptScan)) continue;

      violations.push({
        check: 'C4',
        file: relative(ROOT, file),
        line: lineOf(content, match.index),
        message:
          'ActivityIndicator outside loading primitives — use LoadingSpinner / LoadingOverlay / AppLoading (or add // c4-exempt with justification)',
      });
    }
  }
  return violations;
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  const allFiles = walk(ROOT);
  const violations: Violation[] = [
    ...auditC1(allFiles),
    ...auditC2(allFiles),
    ...auditC4(allFiles),
  ];

  if (violations.length === 0) {
    console.log('✓ PASS: No component-quality violations found.');
    process.exit(0);
  }

  const byFile = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = byFile.get(v.file) ?? [];
    list.push(v);
    byFile.set(v.file, list);
  }

  console.error(
    `✗ FAIL: ${violations.length} component-quality violation(s) found.\n`,
  );
  for (const [file, fileViolations] of byFile) {
    for (const v of fileViolations) {
      console.error(`  ${file}:${v.line}  [${v.check}]`);
      console.error(`    ${v.message}`);
      console.error('');
    }
  }
  process.exit(1);
}

main();

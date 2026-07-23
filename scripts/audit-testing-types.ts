#!/usr/bin/env bun
/**
 * scripts/audit-testing-types.ts
 *
 * Testing & types audit. Enforces three checks that can be statically
 * verified:
 *
 *   D6 — no UI code (in `app/`/`components/`/`hooks/`) importing raw
 *        wire/runtime types from `shared/types/api.ts` or
 *        `shared/types/env.ts`. UI code must consume repository-normalized
 *        types or component-local types instead. Suppress with `// d6-exempt`.
 *
 *   T1 — test files live under `__tests__/`. Any `*.test.{ts,tsx}`
 *        found in the walked source tree is a misplaced test that
 *        must be moved. No suppression (move the file).
 *
 *   T2 — (Part A) no inline `vi.mock()` module mocks inside individual
 *        `*.test.{ts,tsx}` files; module mocks must be centralized in
 *        `__tests__/setup.ts`. `vi.fn()` / `vi.spyOn()` are allowed
 *        (per-test stubs). Suppress with `// t2-exempt`.
 *        (Part B) no Jest leftovers — arqavellum runs on Vitest. Flags any
 *        `.test.ts` / `.test.tsx` / `.spec.ts` filename (jest-era
 *        conventions) and bans `jest.{mock,fn,spyOn,…}()` calls plus
 *        a root `jest.config.*` file. Arqavellum uses vitest; `*.test.ts`
 *        files are acceptable but should still live under `__tests__/`.
 *        Suppress with `// t2-exempt`.
 *
 * Deferred to manual review (not statically auditable):
 *   T1 (Test Coverage) — "components without tests" is subjective.
 *
 * No --fix mode: these violations aren't safely auto-fixable.
 *
 * Mirrors the structure of scripts/audit-security.ts /
 * audit-component-quality.ts.
 *
 * Run: `bun run scripts/audit-testing-types.ts`
 * Exits 1 on any violation, 0 otherwise.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { basename, extname, join, relative } from 'path';

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

// walkTestDir — walks ONLY the root-level `__tests__/` directory (which
// the shared `walk()` deliberately excludes). Returns just the
// `*.test.{ts,tsx}` files — `__tests__/setup.ts` and other non-`.test.`
// helpers are skipped, which is exactly what T2 Part A wants (module
// mocks belong in `setup.ts`, not in test files).
const TEST_EXTS = ['.ts', '.tsx'];

function walkTestDir(dir: string, out: string[] = []): string[] {
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
      walkTestDir(full, out);
    } else if (st.isFile() && TEST_EXTS.includes(extname(full))) {
      if (/\.test\.(ts|tsx)$/.test(basename(full))) out.push(full);
    }
  }
  return out;
}

// ── Violation type ────────────────────────────────────────────────────

type Check = 'D6' | 'T1' | 'T2';

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

// ── D6: UI components importing raw wire types from shared/types ────
//
// Scope: only `app/`, `components/`, `hooks/` — D6 is about UI code
// consuming API/env wire shapes. `shared/types/` itself is outside
// scope (it's the barrel the rule protects against); repositories and
// services define their own normalized types.
//
// Matches any import path referencing `shared/types/api` or
// `shared/types/env` regardless of depth or alias prefix:
//   `'../shared/types/api'`, `'../../shared/types/api'`,
//   `'@shared/types/api'`, `'../../../shared/types/env/index'`, etc.

const D6_SCAN_DIRS = ['app', 'components', 'hooks'];

const D6_REGEX = /from\s+['"][^'"]*shared\/types\/(api|env)/g;

const D6_EXEMPT_REGEX = /\bd6-exempt\b/;

function auditD6(files: string[]): Violation[] {
  const violations: Violation[] = [];
  const scanSet = files.filter((f) => {
    const rel = relative(ROOT, f);
    return D6_SCAN_DIRS.some((d) => rel === d || rel.startsWith(d + '/'));
  });

  for (const file of scanSet) {
    const content = readFileSync(file, 'utf8');
    D6_REGEX.lastIndex = 0;
    let match;
    while ((match = D6_REGEX.exec(content)) !== null) {
      const exemptScanStart = Math.max(
        0,
        match.index - EXEMPT_LOOKBACK_CHARS,
      );
      const exemptScan = content.slice(exemptScanStart, match.index);
      if (D6_EXEMPT_REGEX.test(exemptScan)) continue;
      violations.push({
        check: 'D6',
        file: relative(ROOT, file),
        line: lineOf(content, match.index),
        message:
          'UI code imports raw wire types from shared/types/api or shared/types/env — use repository-normalized or component-local types (or add // d6-exempt with justification)',
      });
    }
  }
  return violations;
}

// ── T1: test files outside __tests__/ ────────────────────────────────
//
// The shared `walk()` already excludes `__tests__/`, so any `*.test.`
// file it returns is by definition misplaced. No suppression — the
// fix is to move the file under `__tests__/`.

const T1_REGEX = /\.test\.(ts|tsx)$/;

function auditT1(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file);
    if (!T1_REGEX.test(rel)) continue;
    violations.push({
      check: 'T1',
      file: rel,
      line: 1,
      message:
        'test file outside __tests__/ — move it under __tests__/ mirroring src structure',
    });
  }
  return violations;
}

// ── T2 Part A: inline vi.mock() in test files ────────────────────────
//
// Module-level `vi.mock()` calls must live in `__tests__/setup.ts`.
// `walkTestDir` returns only `*.test.{ts,tsx}` files, so `setup.ts`
// (not a `.test.` file) is naturally exempt — that's where centralized
// mocks belong. `vi.fn()` and `vi.spyOn()` are NOT violations; per-test
// stubs legitimately live in test files.

const T2_MOCK_REGEX = /\bvi\.mock\s*\(/g;

const T2_EXEMPT_REGEX = /\bt2-exempt\b/;

function auditT2InlineMock(testFiles: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of testFiles) {
    const content = readFileSync(file, 'utf8');
    T2_MOCK_REGEX.lastIndex = 0;
    let match;
    while ((match = T2_MOCK_REGEX.exec(content)) !== null) {
      const exemptScanStart = Math.max(
        0,
        match.index - EXEMPT_LOOKBACK_CHARS,
      );
      const exemptScan = content.slice(exemptScanStart, match.index);
      if (T2_EXEMPT_REGEX.test(exemptScan)) continue;
      violations.push({
        check: 'T2',
        file: relative(ROOT, file),
        line: lineOf(content, match.index),
        message:
          'inline vi.mock() in test file — centralize in __tests__/setup.ts (or add // t2-exempt with justification)',
      });
    }
  }
  return violations;
}

// ── T2 Part B: Jest leftovers ────────────────────────────────────────
//
// Arqavellum runs on Vitest. Any `jest.*` method call or root-level
// `jest.config.*` file is a leftover from a pre-Vitest era (or an
// accidental reintroduction) and must be removed. Scanned across all
// walked source files AND `__tests__/**.test.{ts,tsx}`.
//
// Additionally flags `.spec.ts` files anywhere in the walked tree —
// the `.spec.` naming convention is a Jasmine/Jest artifact; arqavellum
// standardizes on `*.test.ts` (vitest convention). Files named
// `*.test.ts` / `*.test.tsx` are acceptable in the walked source tree
// *only* if they live under `__tests__/` (T1 already catches the
// misplaced ones); this check does not re-flag them.

const T2_JEST_REGEX =
  /\bjest\.(mock|fn|spyOn|clearAllMocks|resetAllMocks|advanceTimersByTime|useFakeTimers)\s*\(/g;

const JEST_CONFIG_FILES = [
  'jest.config.js',
  'jest.config.ts',
  'jest.config.json',
  'jest.config.mjs',
  'jest.config.cjs',
];

function auditT2Jest(files: string[], testFiles: string[]): Violation[] {
  const violations: Violation[] = [];
  const all = [...files, ...testFiles];
  for (const file of all) {
    const content = readFileSync(file, 'utf8');
    T2_JEST_REGEX.lastIndex = 0;
    let match;
    while ((match = T2_JEST_REGEX.exec(content)) !== null) {
      const exemptScanStart = Math.max(
        0,
        match.index - EXEMPT_LOOKBACK_CHARS,
      );
      const exemptScan = content.slice(exemptScanStart, match.index);
      if (T2_EXEMPT_REGEX.test(exemptScan)) continue;
      violations.push({
        check: 'T2',
        file: relative(ROOT, file),
        line: lineOf(content, match.index),
        message:
          'Jest leftover (jest.* call) — project runs on Vitest; use vi.fn / vi.spyOn / vi.mock or remove (or add // t2-exempt with justification)',
      });
    }
  }

  // Root-level jest.config.* files.
  for (const cfg of JEST_CONFIG_FILES) {
    const cfgPath = join(ROOT, cfg);
    if (existsSync(cfgPath)) {
      violations.push({
        check: 'T2',
        file: cfg,
        line: 1,
        message:
          'Jest config file present at project root — project runs on Vitest (vitest.config.ts); remove the jest.config.* file',
      });
    }
  }

  // .spec.ts / .spec.tsx files — Jest/Jasmine naming convention.
  // Arqavellum standardizes on *.test.ts (vitest convention).
  for (const file of all) {
    if (/\.spec\.(ts|tsx)$/.test(basename(file))) {
      violations.push({
        check: 'T2',
        file: relative(ROOT, file),
        line: 1,
        message:
          '.spec.{ts,tsx} file — arqavellum uses the *.test.{ts,tsx} vitest convention; rename (or add // t2-exempt with justification)',
      });
    }
  }

  return violations;
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  const allFiles = walk(ROOT);
  const testFiles = walkTestDir(join(ROOT, '__tests__'));
  const violations: Violation[] = [
    ...auditD6(allFiles),
    ...auditT1(allFiles),
    ...auditT2InlineMock(testFiles),
    ...auditT2Jest(allFiles, testFiles),
  ];

  if (violations.length === 0) {
    console.log('✓ PASS: No testing/type violations found.');
    process.exit(0);
  }

  const byFile = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = byFile.get(v.file) ?? [];
    list.push(v);
    byFile.set(v.file, list);
  }

  console.error(
    `✗ FAIL: ${violations.length} testing/type violation(s) found.\n`,
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

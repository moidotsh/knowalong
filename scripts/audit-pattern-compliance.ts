#!/usr/bin/env bun
/**
 * scripts/audit-pattern-compliance.ts
 *
 * Pattern compliance audit. Enforces two checks that can be statically
 * verified:
 *
 *   S19 — no `package-lock.json` or `yarn.lock` committed anywhere in
 *         arqavellum's tree (Bun is the package manager — `bun.lock` at
 *         root is the only lockfile). Files inside `node_modules/` are
 *         excluded by the shared walk, so any lockfile found in the
 *         walked source tree is a violation. No suppression — these
 *         files must never exist in arqavellum's tree.
 *
 *   C10 — no imports of deprecated symbols from their legacy shims.
 *         Arqavellum ships with an empty deprecated-symbols table (a
 *         consumer populates it as symbols are deprecated during
 *         domain work). The structural check stays in place — it just
 *         never matches until the consumer adds a rule. Suppress with
 *         `// c10-exempt`.
 *
 * No --fix mode: these violations aren't safely auto-fixable.
 *
 * Mirrors the structure of scripts/audit-testing-types.ts /
 * audit-security.ts.
 *
 * Run: `bun run scripts/audit-pattern-compliance.ts`
 * Exits 1 on any violation, 0 otherwise.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
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

// walkForLockfiles — same traversal as `walk()` but returns files whose
// basename is `package-lock.json` or `yarn.lock` regardless of extension
// (S19 targets two specific filenames, not source extensions).
const LOCKFILE_NAMES = new Set(['package-lock.json', 'yarn.lock']);

function walkForLockfiles(dir: string, out: string[] = []): string[] {
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
      walkForLockfiles(full, out);
    } else if (st.isFile() && LOCKFILE_NAMES.has(basename(full))) {
      if (!isExcluded(full)) out.push(full);
    }
  }
  return out;
}

// ── Violation type ────────────────────────────────────────────────────

type Check = 'S19' | 'C10';

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

// ── S19: lockfile hygiene ────────────────────────────────────────────
//
// Bun is the package manager; `bun.lock` at root is the only lockfile.
// Any `package-lock.json` or `yarn.lock` found in arqavellum's tree
// (outside node_modules, which the shared walk already excludes) is a
// violation. No suppression — these files must never exist here.

function auditS19(): Violation[] {
  const violations: Violation[] = [];
  const lockfiles = walkForLockfiles(ROOT);
  for (const file of lockfiles) {
    violations.push({
      check: 'S19',
      file: relative(ROOT, file),
      line: 1,
      message:
        'package-lock.json / yarn.lock committed — Bun is the package manager (remove the file; only bun.lock belongs at root)',
    });
  }
  return violations;
}

// ── C10: deprecated symbol imports ───────────────────────────────────
//
// Hardcoded table of deprecated symbols. Arqavellum ships with an empty
// table — a consumer populates it as symbols are deprecated during
// domain work. Each rule flags any `import … from '…'` (or
// `export … from '…'`) whose:
//   (a) path matches `pathMatch` (references the deprecated module), AND
//   (b) binding contains the rule's `symbol` (word-boundary match).
//
// The pathMatch regexes use segment boundaries so that, e.g.,
// `components/Button` does NOT match `components/primitives/Button`.
//
// `shimAllowlist` lists repo-relative paths that may legitimately
// reference the symbol (the shim itself plus intermediate shims).

interface C10Rule {
  symbol: string;
  pathMatch: RegExp;
  shimAllowlist: string[];
  replacement: string;
}

// Escapes regex metacharacters in a symbol name so it can be safely
// embedded in a word-boundary binding check.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Arqavellum ships with no deprecated symbols. Consumers add rules here as
// symbols are deprecated during domain work. The structural check
// stays in place — it just never matches until a rule is added.
const C10_RULES: C10Rule[] = [];

const C10_EXEMPT_REGEX = /\bc10-exempt\b/;

// Captures `import|export [type] <binding> from '<path>'`. `[\s\S]*?`
// is non-greedy so multi-statement lines parse as separate matches.
// Both `import` and `export ... from` (re-exports) are scanned —
// re-exporting a deprecated symbol from a non-shim file propagates it.
const C10_STMT_REGEX =
  /\b(?:import|export)\s+(?:type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;

function auditC10(files: string[]): Violation[] {
  // Fast path: no rules means no possible violations. Skip the file
  // scan entirely so this audit is a no-op until a consumer adds rules.
  if (C10_RULES.length === 0) return [];
  const violations: Violation[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file);
    const content = readFileSync(file, 'utf8');
    C10_STMT_REGEX.lastIndex = 0;
    let match;
    while ((match = C10_STMT_REGEX.exec(content)) !== null) {
      const binding = match[1];
      const importPath = match[2];

      for (const rule of C10_RULES) {
        // (a) path must reference the deprecated module.
        if (!rule.pathMatch.test(importPath)) continue;
        // (b) binding must include the deprecated symbol (word boundary).
        const symbolRegex = new RegExp(`\\b${escapeRegex(rule.symbol)}\\b`);
        if (!symbolRegex.test(binding)) continue;
        // (c) shim allowlist exempts the deprecated module's own files.
        if (rule.shimAllowlist.includes(rel)) continue;

        // Suppression marker within 300-char lookback before the match.
        const exemptScanStart = Math.max(
          0,
          match.index - EXEMPT_LOOKBACK_CHARS,
        );
        const exemptScan = content.slice(exemptScanStart, match.index);
        if (C10_EXEMPT_REGEX.test(exemptScan)) continue;

        violations.push({
          check: 'C10',
          file: rel,
          line: lineOf(content, match.index),
          message: `deprecated \`${rule.symbol}\` import — use ${rule.replacement} instead (or add // c10-exempt with justification)`,
        });
      }
    }
  }
  return violations;
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  const allFiles = walk(ROOT);
  const violations: Violation[] = [
    ...auditS19(),
    ...auditC10(allFiles),
  ];

  if (violations.length === 0) {
    console.log('✓ PASS: No pattern-compliance violations found.');
    process.exit(0);
  }

  const byFile = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = byFile.get(v.file) ?? [];
    list.push(v);
    byFile.set(v.file, list);
  }

  console.error(
    `✗ FAIL: ${violations.length} pattern-compliance violation(s) found.\n`,
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

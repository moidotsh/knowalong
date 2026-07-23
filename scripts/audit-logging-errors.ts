#!/usr/bin/env bun
/**
 * scripts/audit-logging-errors.ts
 *
 * Logging & error-handling audit. Enforces the two checks that can be
 * statically verified:
 *
 *   S11 — no live `console.(log|error|warn|info|debug)(` calls. Use the
 *         `logger` from `utils/logger.ts` instead. Suppress with
 *         `// s11-exempt`. Commented-out lines (`//console.log(...)`,
 *         ` *   console.log(...)` in JSDoc `@example`) are NOT violations
 *         — they are dead text, not live statements, and are skipped by
 *         the leading-comment heuristic. `utils/logger.ts` is skipped
 *         wholesale (it IS the logger; legitimately calls `console.*`).
 *
 *   S10-throw — no raw `throw new Error(...)` outside the carve-out list
 *         (`utils/errors.ts`, which throws `AppError` instead). Raw throws
 *         crossing a service boundary must use `throw new AppError(...)`.
 *         Suppress with `// s10-exempt` (same marker as the S10 Alert
 *         sub-check in audit-security.ts — both are "raw errors reaching
 *         users", and the exempt file lists do not overlap).
 *
 * The remaining S10 sub-checks (generic `catch (e) { console.log(e) }`,
 * silent `catch (e) {}`, unhandled promise rejections) are not statically
 * auditable with a regex-based approach — they require type/flow analysis.
 * They are documented as manual.
 *
 * No --fix mode: these violations aren't safely auto-fixable.
 *
 * Run: `bun run scripts/audit-logging-errors.ts`
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

type Check = 'S11' | 'S10';

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

// ── Shared exemption lookback ────────────────────────────────────────

const EXEMPT_LOOKBACK_CHARS = 300;

// ── S11: live console.* calls ────────────────────────────────────────
//
// `utils/logger.ts` IS the logger — it legitimately calls `console.*`
// internally. Skip it wholesale.

const S11_SKIP_FILES = new Set([join(ROOT, 'utils/logger.ts')]);

// Matches `console.log(`, `console.error(`, etc. Word boundary on the
// `console` identifier prevents false positives like `myconsole.log(`.
const S11_CONSOLE_REGEX = /\bconsole\.(log|error|warn|info|debug)\s*\(/g;

const S11_EXEMPT_REGEX = /\bs11-exempt\b/;

// A line whose portion before `console.` starts with `//`, `/*`, or `*`
// is a comment — not a live statement. This covers:
//   `//console.log(...)`       (commented-out debug logging)
//   `// console.log(...)`      (same, with space)
//   `/* console.log(...) */`   (block comment)
//   ` *   console.log(...);`   (JSDoc `@example` continuation line)
const S11_COMMENT_PREFIX_REGEX = /^\s*(\/\/|\/\*|\*)/;

function auditS11(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    if (S11_SKIP_FILES.has(file)) continue;
    const content = readFileSync(file, 'utf8');
    S11_CONSOLE_REGEX.lastIndex = 0;
    let match;
    while ((match = S11_CONSOLE_REGEX.exec(content)) !== null) {
      // Find the start of the current line by scanning back to the
      // previous newline (or start of file).
      let lineStart = match.index;
      while (lineStart > 0 && content[lineStart - 1] !== '\n') lineStart--;

      // Skip commented-out lines and JSDoc @example continuations. Only
      // the portion of the line before `console.` is tested: the regex
      // `^\s*(//|/*|*)` matches when the line opens with a comment
      // marker, meaning the `console.` is inside a comment, not a live
      // statement. Handles `//console.log(...)`, `// console.log(...)`,
      // `/* console.log(...) */`, and JSDoc ` *   console.log(...);`.
      const beforeConsole = content.slice(lineStart, match.index);
      if (S11_COMMENT_PREFIX_REGEX.test(beforeConsole)) continue;

      // Look back up to 300 chars for a suppression marker.
      const exemptScanStart = Math.max(
        0,
        match.index - EXEMPT_LOOKBACK_CHARS,
      );
      const exemptScan = content.slice(exemptScanStart, match.index);
      if (S11_EXEMPT_REGEX.test(exemptScan)) continue;

      violations.push({
        check: 'S11',
        file: relative(ROOT, file),
        line: lineOf(content, match.index),
        message:
          'console.* call in app code — use logger from utils/logger (or add // s11-exempt with justification)',
      });
    }
  }
  return violations;
}

// ── S10-throw: raw `throw new Error(...)` ────────────────────────────
//
// Outside the carve-out list, a raw `throw new Error(...)` must be
// converted to `throw new AppError(ErrorCode.X, message, ...)`.
// The carve-out list is `utils/errors.ts` — the canonical error factory
// that throws `AppError` (not the built-in `Error`), so it legitimately
// appears in the raw-throw regex below as a false-positive guard.

const S10_EXEMPT_FILES = new Set<string>([
  // Error factory — throws AppError, not Error.
  'utils/errors.ts',
]);

// Matches `throw new Error(`. Word boundary on `Error` prevents matching
// `throw new AppError(` or `throw new MyCustomError(` — only the bare
// built-in `Error` constructor is flagged. Global so we can walk every
// match and read `match.index` for the lookback window.
const S10_THROW_REGEX = /\bthrow\s+new\s+Error\s*\(/g;

const S10_EXEMPT_REGEX = /\bs10-exempt\b/;

function auditS10Throw(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file);
    const isExemptFile = S10_EXEMPT_FILES.has(rel);
    const content = readFileSync(file, 'utf8');
    S10_THROW_REGEX.lastIndex = 0;
    let match;
    while ((match = S10_THROW_REGEX.exec(content)) !== null) {
      // File-level carve-out (no marker needed).
      if (isExemptFile) continue;

      // Marker-based suppression within 300-char lookback.
      const exemptScanStart = Math.max(
        0,
        match.index - EXEMPT_LOOKBACK_CHARS,
      );
      const exemptScan = content.slice(exemptScanStart, match.index);
      if (S10_EXEMPT_REGEX.test(exemptScan)) continue;

      violations.push({
        check: 'S10',
        file: rel,
        line: lineOf(content, match.index),
        message:
          'raw `throw new Error(...)` — use `throw new AppError(ErrorCode.X, message)` for boundary-crossing throws, or add // s10-exempt',
      });
    }
  }
  return violations;
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  const allFiles = walk(ROOT);
  const violations: Violation[] = [
    ...auditS11(allFiles),
    ...auditS10Throw(allFiles),
  ];

  if (violations.length === 0) {
    console.log('✓ PASS: No logging or error-handling violations found.');
    process.exit(0);
  }

  const byFile = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = byFile.get(v.file) ?? [];
    list.push(v);
    byFile.set(v.file, list);
  }

  console.error(
    `✗ FAIL: ${violations.length} logging/error-handling violation(s) found.\n`,
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

#!/usr/bin/env bun
/**
 * scripts/audit-ui-theme.ts
 *
 * UI & theming audit. Light is default; dark is opt-in. Both modes
 * resolve through `theme.colors[colorScheme].*` via useAppTheme() (or a
 * direct constants import). Two checks enforce this:
 *
 *   S7 — no hardcoded hex color string literals ( `'#1a1a1a'`,
 *        `"#0A84FF"`, `'#0A84FF80'` ) outside color-definition /
 *        visual-asset files. Consumer code must reference
 *        `theme.colors.light.*` or `theme.colors.dark.*` via
 *        `useAppTheme()`. Suppress with `// s7-exempt`.
 *
 *   C3 — no `Dimensions.get('window'/'screen')` calls (the old
 *        non-reactive API). Use the `useResponsive()` hook or the
 *        `useWindowDimensions()` reactive hook instead. Suppress
 *        with `// c3-exempt`.
 *
 * No --fix mode: these violations aren't safely auto-fixable.
 *
 * Run: `bun run scripts/audit-ui-theme.ts`
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

// Path prefixes that should never be walked (treated like EXCLUDE_DIRS
// but matched as prefix so subdirectories are also excluded).
const EXCLUDE_PATH_PREFIXES = ['public', 'supabase/functions'];

const SOURCE_EXTS = ['.ts', '.tsx', '.js', '.jsx'];

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

type Check = 'S7' | 'C3';

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

// ── S7: hardcoded hex color string literals ──────────────────────────
//
// Matches any quoted string containing exactly a hex color:
//   '#1a1a1a'  "#0A84FF"  '#0A84FF80'
// Does NOT match hex in comments (no quotes), URLs (non-hex chars
// break the match), or unquoted hex.

const S7_HEX_REGEX = /['"`]#[0-9a-fA-F]{3,8}['"`]/g;

const S7_EXEMPT_REGEX = /\bs7-exempt\b/;

// A line whose portion before the hex literal starts with `//`, `/*`,
// or `*` is a comment — not a live statement. Same heuristic as S11
// in audit-logging-errors.ts. Handles:
//   `// const x = '#ff0000'`       (commented-out code)
//   `/* color: '#ff0000' */`       (block comment)
//   ` *   accentColor="#0a84ff"`   (JSDoc @example continuation)
const S7_COMMENT_PREFIX_REGEX = /^\s*(\/\/|\/\*|\*)/;

// Color-definition / palette files that legitimately hardcode hex
// colors. SVG vector files (any file matching `*.svg.ts` or
// `*Vector.tsx`) are also exempt via the filename test in auditS7.
const S7_EXEMPT_FILES = new Set<string>([
  // Canonical theme token source
  'constants/theme.ts',
  // Tamagui config — mirrors constants/theme.ts into Tamagui's token
  // system. Theme tokens live here by definition.
  'tamagui.config.ts',
  // Palette stops — the 7 atmosphere palettes
  'components/premium/shared/atmospherePalettes.ts',
]);

// SVG vector files — any file whose name ends with `.svg.ts` or
// `Vector.tsx`. These are illustrations that hardcode hex colors as
// fill/stroke stops and are exempt by convention.
function isSvgVectorFile(rel: string): boolean {
  return (
    rel.endsWith('.svg.ts') ||
    rel.endsWith('Vector.tsx')
  );
}

function auditS7(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file);
    if (S7_EXEMPT_FILES.has(rel)) continue;
    if (isSvgVectorFile(rel)) continue;
    const content = readFileSync(file, 'utf8');
    S7_HEX_REGEX.lastIndex = 0;
    let match;
    while ((match = S7_HEX_REGEX.exec(content)) !== null) {
      // Find the start of the current line by scanning back to the
      // previous newline (or start of file).
      let lineStart = match.index;
      while (lineStart > 0 && content[lineStart - 1] !== '\n') lineStart--;

      // Skip commented-out lines and JSDoc @example continuations.
      const beforeHex = content.slice(lineStart, match.index);
      if (S7_COMMENT_PREFIX_REGEX.test(beforeHex)) continue;

      // Look back up to 300 chars for a suppression marker.
      const exemptScanStart = Math.max(
        0,
        match.index - EXEMPT_LOOKBACK_CHARS,
      );
      const exemptScan = content.slice(exemptScanStart, match.index);
      if (S7_EXEMPT_REGEX.test(exemptScan)) continue;

      violations.push({
        check: 'S7',
        file: rel,
        line: lineOf(content, match.index),
        message:
          'hardcoded hex color string literal — use theme.colors.* via useAppTheme() or constants import (or add // s7-exempt with justification)',
      });
    }
  }
  return violations;
}

// ── C3: Dimensions.get('window'/'screen') ───────────────────────────
//
// The old non-reactive `Dimensions.get(...)` API must not be used in
// consumer code. Use `useResponsive()` (breakpoint logic) or
// `useWindowDimensions()` (reactive hook) instead. `useWindowDimensions()`
// is the official RN reactive hook and is NOT a violation.

const C3_DIMENSIONS_REGEX =
  /Dimensions\.get\(\s*['"](window|screen)['"]\s*\)/g;

const C3_EXEMPT_REGEX = /\bc3-exempt\b/;

const C3_EXEMPT_FILES = new Set<string>([
  // These ARE the responsive system — they legitimately use Dimensions.
  'hooks/useResponsive.ts',
  'context/ResponsiveContext.tsx',
]);

function auditC3(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file);
    if (C3_EXEMPT_FILES.has(rel)) continue;
    const content = readFileSync(file, 'utf8');
    C3_DIMENSIONS_REGEX.lastIndex = 0;
    let match;
    while ((match = C3_DIMENSIONS_REGEX.exec(content)) !== null) {
      // Look back up to 300 chars for a suppression marker.
      const exemptScanStart = Math.max(
        0,
        match.index - EXEMPT_LOOKBACK_CHARS,
      );
      const exemptScan = content.slice(exemptScanStart, match.index);
      if (C3_EXEMPT_REGEX.test(exemptScan)) continue;

      violations.push({
        check: 'C3',
        file: rel,
        line: lineOf(content, match.index),
        message:
          "Dimensions.get('window'/'screen') is non-reactive — use useResponsive() or useWindowDimensions() (or add // c3-exempt with justification)",
      });
    }
  }
  return violations;
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  const allFiles = walk(ROOT);
  const violations: Violation[] = [
    ...auditS7(allFiles),
    ...auditC3(allFiles),
  ];

  if (violations.length === 0) {
    console.log('✓ PASS: No UI/theme violations found.');
    process.exit(0);
  }

  const byFile = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = byFile.get(v.file) ?? [];
    list.push(v);
    byFile.set(v.file, list);
  }

  console.error(
    `✗ FAIL: ${violations.length} UI/theme violation(s) found.\n`,
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

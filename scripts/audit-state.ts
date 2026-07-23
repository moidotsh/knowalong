#!/usr/bin/env bun
/**
 * scripts/audit-state.ts
 *
 * State management audit. Enforces two of the CODE_GARDENING Prompt 3
 * checks that can be statically verified:
 *
 *   D3  — every `useMutation({...})` block must touch a React Query cache
 *         primitive (invalidateQueries | setQueryData | removeQueries |
 *         `.clear()`) or carry a `// d3-exempt` comment. Catches the bug
 *         pattern "server write with the cache left untouched."
 *
 *   D10 — every Zustand store (a file in `stores/` containing a `create<`
 *         or `create(` factory call) must contain all 5 canonical section
 *         markers (`// SECTION: Loading|Error|Modals|Selection|UI`) or
 *         carry a `// d10-exempt` comment. The marker format is textual;
 *         the surrounding `// ===` borders are not enforced.
 *
 * S4 (server-vs-UI state separation) and D2 (optimistic updates) remain
 * manual — see the CODE_GARDENING.md Prompt 3 note.
 *
 * No --fix mode: these violations aren't safely auto-fixable.
 *
 * Mirrors the structure of scripts/audit-barrels.ts / audit-data-layer.ts.
 *
 * Run: `bun run scripts/audit-state.ts`
 * Exits 1 on any violation, 0 otherwise.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { extname, join, relative } from 'path';

const ROOT = process.cwd();

// ── File walking (shared with audit-barrels.ts / audit-data-layer.ts) ──

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

const EXCLUDE_PATH_PREFIXES: string[] = ['supabase/functions'];

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

type Check = 'D3' | 'D10';

interface Violation {
  check: Check;
  file: string;
  line: number;
  message: string;
}

// ── D10: Zustand store section markers ────────────────────────────────
//
// Walk only top-level files in `stores/`. Stores are flat — no
// subdirectories exist today. If one is added, this walk should become
// recursive (one-line change). Filter to "real" stores via the zustand
// factory call signature (`create<...>()` or `create(...)`), which
// naturally skips index.ts (barrel) and storage.ts (custom adapter).

const D10_STORE_DIR = join(ROOT, 'stores');

// Matches `create<` (typed) and `create(` (untyped) but NOT e.g.
// `createSelector` or `myCreate<`. The word boundary handles the prefix.
const D10_STORE_REGEX = /\bcreate\s*[<(]/;

const D10_EXEMPT_REGEX = /\bd10-exempt\b/;

// Collect every `// SECTION: <Name>` marker in the file.
const D10_SECTION_REGEX = /\/\/\s*SECTION:\s*(\w+)/g;

const D10_REQUIRED_SECTIONS = ['Loading', 'Error', 'Modals', 'Selection', 'UI'];

function auditD10(): Violation[] {
  const violations: Violation[] = [];
  let entries: string[];
  try {
    entries = readdirSync(D10_STORE_DIR);
  } catch {
    // No stores/ directory — nothing to check.
    return violations;
  }

  for (const entry of entries) {
    const full = join(D10_STORE_DIR, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (!st.isFile()) continue; // top-level files only — stores/ is flat
    if (!SOURCE_EXTS.includes(extname(full))) continue;

    const content = readFileSync(full, 'utf8');
    if (!D10_STORE_REGEX.test(content)) continue;
    if (D10_EXEMPT_REGEX.test(content)) continue;

    const present = new Set<string>();
    D10_SECTION_REGEX.lastIndex = 0;
    let m;
    while ((m = D10_SECTION_REGEX.exec(content)) !== null) {
      present.add(m[1]);
    }
    const missing = D10_REQUIRED_SECTIONS.filter((s) => !present.has(s));
    if (missing.length > 0) {
      violations.push({
        check: 'D10',
        file: relative(ROOT, full),
        line: 1,
        message: `Zustand store missing required SECTION markers: ${missing.join(', ')} — add canonical \`// SECTION: <Name>\` blocks (or // d10-exempt to opt out)`,
      });
    }
  }
  return violations;
}

// ── D3: mutation cache primitives ─────────────────────────────────────
//
// For each `useMutation(` call site, brace-count forward through the
// options object and look for a cache primitive or a `// d3-exempt`
// comment. The lite parser tracks strings, template literals, and line/
// block comments to avoid false positives from braces appearing inside
// them. Best-effort: a `}` inside a regex literal in a mutationFn body
// can fool it — suppress a resulting false positive with `// d3-exempt`.

const D3_USE_MUTATION_REGEX = /\buseMutation\s*/g;

const D3_EXEMPT_REGEX = /\bd3-exempt\b/;

// A primitive is "referenced" if any of these substrings appears in the
// options block. `.clear()` is `queryClient.clear()` — the only
// mutation-adjacent `.clear()` call we care about; matching the textual
// form is intentional (any `.clear()` inside a mutation block is either
// the cache wipe or a vanishingly rare same-named call).
const D3_CACHE_PRIMITIVES = [
  'invalidateQueries',
  'setQueryData',
  'removeQueries',
  '.clear()',
];

// Skip a string starting at index i (content[i] is the quote char).
// Handles escapes. Template-literal `${...}` content is treated as part
// of the string — we deliberately ignore braces inside template literals
// per the plan's "best-effort" note.
function skipString(content: string, i: number): number {
  const quote = content[i];
  const n = content.length;
  i++; // past opening quote
  while (i < n) {
    const c = content[i];
    if (c === '\\') {
      i += 2; // skip escaped char
      continue;
    }
    if (c === quote) {
      return i + 1;
    }
    i++;
  }
  return i;
}

function skipLineComment(content: string, i: number): number {
  const n = content.length;
  while (i < n && content[i] !== '\n') i++;
  return i;
}

function skipBlockComment(content: string, i: number): number {
  const n = content.length;
  i += 2; // past `/*`
  while (i < n - 1) {
    if (content[i] === '*' && content[i + 1] === '/') return i + 2;
    i++;
  }
  return n;
}

// Scan from just-after `useMutation` through the balanced options object.
// Handles an optional generic `<...>` and then `({...})`. Returns the
// half-open range [start, end) of the `{...}` block, or null if the
// call doesn't match the expected shape.
function findOptionsBlock(
  content: string,
  start: number,
): { start: number; end: number } | null {
  let i = start;
  const n = content.length;

  // 1. Skip the optional generic `<...>` (depth-aware, string/comment-aware).
  if (i < n && content[i] === '<') {
    let depth = 1;
    i++;
    while (i < n && depth > 0) {
      const c = content[i];
      if (c === "'" || c === '"' || c === '`') {
        i = skipString(content, i);
        continue;
      }
      if (c === '/' && i + 1 < n && content[i + 1] === '/') {
        i = skipLineComment(content, i);
        continue;
      }
      if (c === '/' && i + 1 < n && content[i + 1] === '*') {
        i = skipBlockComment(content, i);
        continue;
      }
      if (c === '<') depth++;
      else if (c === '>') depth--;
      i++;
    }
    if (depth !== 0) return null;
  }

  // 2. Skip whitespace and the opening `(`.
  while (i < n && /\s/.test(content[i])) i++;
  if (i >= n || content[i] !== '(') return null;
  i++;
  while (i < n && /\s/.test(content[i])) i++;

  // 3. Find the first `{` of the options object.
  if (i >= n || content[i] !== '{') return null;
  const openBrace = i;

  // 4. Brace-count forward through strings and comments to the matching `}`.
  let depth = 1;
  i++;
  while (i < n && depth > 0) {
    const c = content[i];
    if (c === "'" || c === '"' || c === '`') {
      i = skipString(content, i);
      continue;
    }
    if (c === '/' && i + 1 < n && content[i + 1] === '/') {
      i = skipLineComment(content, i);
      continue;
    }
    if (c === '/' && i + 1 < n && content[i + 1] === '*') {
      i = skipBlockComment(content, i);
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    i++;
  }
  if (depth !== 0) return null;
  return { start: openBrace, end: i };
}

function lineOf(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
}

function auditD3(files: string[]): Violation[] {
  const violations: Violation[] = [];
  // Exempt comments may sit on the line(s) above the useMutation call
  // (function-level suppression) OR inside the options block. Scan a small
  // window backwards from the useMutation token for the `// d3-exempt`
  // marker — mirrors the D5 "method line or line above" precedent.
  const EXEMPT_LOOKBACK_CHARS = 300;
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    D3_USE_MUTATION_REGEX.lastIndex = 0;
    let match;
    while ((match = D3_USE_MUTATION_REGEX.exec(content)) !== null) {
      const after = match.index + match[0].length;
      const range = findOptionsBlock(content, after);
      if (!range) continue; // not a useMutation({...}) we can analyze
      const block = content.slice(range.start, range.end);
      const exemptScanStart = Math.max(0, match.index - EXEMPT_LOOKBACK_CHARS);
      const exemptScan = content.slice(exemptScanStart, range.end);
      if (D3_EXEMPT_REGEX.test(exemptScan)) continue;
      const hasPrimitive = D3_CACHE_PRIMITIVES.some((p) =>
        block.includes(p),
      );
      if (hasPrimitive) continue;
      violations.push({
        check: 'D3',
        file: relative(ROOT, file),
        line: lineOf(content, match.index),
        message:
          'useMutation block does not touch a React Query cache primitive (invalidateQueries / setQueryData / removeQueries / .clear()) — add one, or `// d3-exempt` if no cache key depends on this write',
      });
    }
  }
  return violations;
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  const allFiles = walk(ROOT);
  const violations: Violation[] = [...auditD3(allFiles), ...auditD10()];

  if (violations.length === 0) {
    console.log('✓ PASS: No state management violations found.');
    process.exit(0);
  }

  const byFile = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = byFile.get(v.file) ?? [];
    list.push(v);
    byFile.set(v.file, list);
  }

  console.error(`✗ FAIL: ${violations.length} state violation(s) found.\n`);
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

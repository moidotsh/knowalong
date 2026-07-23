#!/usr/bin/env bun
/**
 * scripts/audit-security.ts
 *
 * Security & validation audit. Enforces three of the CODE_GARDENING
 * checks that can be statically verified:
 *
 *   S12 — no anchored regex literals ( `/^…/` or `/…$/` ) used with
 *         `.test(` in `app/`/`components/`/`hooks/`. Form-input validation
 *         must go through the canonical validators in `utils/validation.ts`.
 *         Suppress with `// s12-exempt`.
 *
 *   SE2 — no direct `@react-native-async-storage/async-storage` imports
 *         outside the allowlist (`stores/storage.ts`), and every allowed
 *         import must carry a `// asyncstorage-exempt: <reason>` comment
 *         at the import line. Ensures all storage access is funnelled
 *         through the `stores/storage` wrapper.
 *
 *   S10 — no `Alert.alert(` / `showAlert(` calls whose same or next 5
 *         lines reference `error.message` / `err.message` / `e.message`
 *         or `*.toString()`. Raw API errors must not reach users.
 *         Suppress with `// s10-exempt`.
 *
 * No --fix mode: these violations aren't safely auto-fixable.
 *
 * Run: `bun run scripts/audit-security.ts`
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

type Check = 'S12' | 'SE2' | 'S10';

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

// ── S12: anchored regex literals used with .test() ───────────────────
//
// Scope: only `app/`, `components/`, `hooks/` — S12 is about form-input
// validation in client-facing code, not utility code. The canonical
// validator home (`utils/validation.ts`) is skipped entirely so it can
// keep using `.test()` on anchored patterns — that's literally its job.

const S12_SCAN_DIRS = ['app', 'components', 'hooks'];

const S12_SKIP_FILES = new Set([
  join(ROOT, 'utils/validation.ts'),
]);

// Matches a regex literal that starts with `^` OR ends with `$`,
// immediately followed by `.test(` (allowing for flags between the
// closing `/` and `.test`). Two alternations:
//   /^…/  followed by optional flags + `.test(`
//   /…$/  followed by optional flags + `.test(`
// The body `…` is `[^/\\]+` (one-or-more chars that are not `/` or `\`,
// to stay on a single regex literal). Escapes (`\\.`) are tolerated via
// the alternation `\\.` consuming the next char.
// Global so we can use exec() + lastIndex to walk every match in a file
// and read `match.index` for the lookback window (mirrors D3).
const S12_REGEX = /\/\^(?:[^/\\]|\\.)+\/[gimu]*\.test\(|\/(?:[^/\\]|\\.)+\$\/[gimu]*\.test\(/g;

const S12_EXEMPT_REGEX = /\bs12-exempt\b/;

const EXEMPT_LOOKBACK_CHARS = 300;

function auditS12(files: string[]): Violation[] {
  const violations: Violation[] = [];
  const scanSet = files.filter((f) => {
    if (S12_SKIP_FILES.has(f)) return false;
    const rel = relative(ROOT, f);
    return S12_SCAN_DIRS.some((d) => rel === d || rel.startsWith(d + '/'));
  });

  for (const file of scanSet) {
    const content = readFileSync(file, 'utf8');
    S12_REGEX.lastIndex = 0;
    let match;
    while ((match = S12_REGEX.exec(content)) !== null) {
      const exemptScanStart = Math.max(
        0,
        match.index - EXEMPT_LOOKBACK_CHARS,
      );
      const exemptScan = content.slice(exemptScanStart, match.index);
      if (S12_EXEMPT_REGEX.test(exemptScan)) continue;
      violations.push({
        check: 'S12',
        file: relative(ROOT, file),
        line: lineOf(content, match.index),
        message:
          'anchored regex literal used with .test() in client code — move to utils/validation.ts (or add // s12-exempt with justification)',
      });
    }
  }
  return violations;
}

// ── SE2: AsyncStorage boundary ───────────────────────────────────────
//
// Every direct `@react-native-async-storage/async-storage` import must
// be (a) in the allowlist below AND (b) carry an inline
// `// asyncstorage-exempt: <reason>` comment on the import line.
// Both must pass; failing either is a violation.

const SE2_ALLOWLIST = new Set<string>([
  'stores/storage.ts',
]);

const SE2_IMPORT_REGEX =
  /from\s+['"]@react-native-async-storage\/async-storage['"]/;

const SE2_EXEMPT_REGEX = /\/\/\s*asyncstorage-exempt\b/;

function auditSE2(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file);
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (!SE2_IMPORT_REGEX.test(line)) return;

      const inAllowlist = SE2_ALLOWLIST.has(rel);
      const hasExempt = SE2_EXEMPT_REGEX.test(line);

      if (!inAllowlist) {
        violations.push({
          check: 'SE2',
          file: rel,
          line: i + 1,
          message:
            'direct AsyncStorage import outside allowlist — use stores/storage wrapper, or add to allowlist + `// asyncstorage-exempt: <reason>`',
        });
        return;
      }
      if (!hasExempt) {
        violations.push({
          check: 'SE2',
          file: rel,
          line: i + 1,
          message:
            'direct AsyncStorage import missing `// asyncstorage-exempt: <reason>` comment',
        });
      }
    });
  }
  return violations;
}

// ── S10: raw error messages in Alert/showAlert calls ─────────────────

const S10_CALL_REGEX = /\b(Alert\.alert|showAlert)\s*\(/g;

// Matches `error.message`, `err.message`, `e.message` (word boundary on
// the identifier, `.message` or `.toString()`).
const S10_RAW_MESSAGE_REGEX =
  /\b(error|err|e)\.(message|toString\(\))/;

const S10_FORWARD_SCAN_LINES = 5;

const S10_EXEMPT_REGEX = /\bs10-exempt\b/;

function auditS10(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    S10_CALL_REGEX.lastIndex = 0;
    let match;
    while ((match = S10_CALL_REGEX.exec(content)) !== null) {
      const exemptScanStart = Math.max(
        0,
        match.index - EXEMPT_LOOKBACK_CHARS,
      );
      const exemptScan = content.slice(exemptScanStart, match.index);
      if (S10_EXEMPT_REGEX.test(exemptScan)) continue;

      const callLine = lineOf(content, match.index) - 1; // 0-indexed
      const limit = Math.min(
        lines.length,
        callLine + 1 + S10_FORWARD_SCAN_LINES,
      );
      let raw = false;
      for (let j = callLine; j < limit; j++) {
        if (S10_RAW_MESSAGE_REGEX.test(lines[j])) {
          raw = true;
          break;
        }
      }
      if (raw) {
        violations.push({
          check: 'S10',
          file: relative(ROOT, file),
          line: callLine + 1,
          message:
            'Alert/showAlert call references raw error.message / *.toString() — use a user-safe AppError message or ALERT_MESSAGES constant (or add // s10-exempt)',
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
    ...auditS12(allFiles),
    ...auditSE2(allFiles),
    ...auditS10(allFiles),
  ];

  if (violations.length === 0) {
    console.log('✓ PASS: No security violations found.');
    process.exit(0);
  }

  const byFile = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = byFile.get(v.file) ?? [];
    list.push(v);
    byFile.set(v.file, list);
  }

  console.error(
    `✗ FAIL: ${violations.length} security violation(s) found.\n`,
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

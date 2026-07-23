#!/usr/bin/env bun
/**
 * scripts/audit-runtime-resilience.ts
 *
 * Runtime resilience audit. Enforces the three patterns that can be
 * statically verified without a high false-positive rate:
 *
 *   R4a — setInterval / clearInterval pairing. A file that calls
 *         setInterval(...) but contains no clearInterval(...) anywhere is
 *         leaking the timer handle (its callback keeps firing).
 *
 *   R4b — addEventListener / removeEventListener pairing. A file that calls
 *         addEventListener(...) but contains no removeEventListener(...)
 *         anywhere is likely leaking the listener. File-level allowlist for
 *         intentional app-lifetime/global listeners. Same-file heuristic
 *         under-reports (one removeEventListener exempts every
 *         addEventListener in the file) — accepted for a low-noise
 *         tripwire; per-effect gaps are backstopped by manual review.
 *
 *   R1  — async-in-effect without a cancellation guard. Scans React
 *         lifecycle code only (app/, components/, hooks/, context/). For
 *         each useEffect whose body awaits (await / .then) and then calls
 *         a setState or navigation function, WITHOUT one of the guard
 *         tokens (cancelled / isMounted / AbortController / ignore /
 *         active / ...), it is flagged. The window is approximate — regex
 *         can't brace-match — so triage handles misfires.
 *
 * Arqavellum does not ship the R1 RPC `verify_session` audit (that's a
 * separate `audit-rpc-auth.ts` for PIN-based auth — arqavellum uses
 * email/password by default; a consumer re-adds it if they switch to
 * PIN auth).
 *
 * Suppress R4 with `// r4-exempt` and R1 with `// r1-exempt` (300-char
 * lookback before the reported match).
 *
 * Mirrors the structure of scripts/audit-pattern-compliance.ts.
 *
 * Run: `bun run scripts/audit-runtime-resilience.ts`
 * Exits 1 on any violation, 0 otherwise.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
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

type Check = 'R4a' | 'R4b' | 'R1';

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

// ── R4a: setInterval / clearInterval pairing ─────────────────────────
//
// Flags any file that calls setInterval(...) but contains no
// clearInterval(...) anywhere. A leaked interval keeps firing its callback
// after the component/service is gone. Regression tripwire.

const R4A_SETINTERVAL_REGEX = /\bsetInterval\s*\(/g;
const R4_EXEMPT_REGEX = /\br4-exempt\b/;

function auditR4a(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file);
    const content = readFileSync(file, 'utf8');
    R4A_SETINTERVAL_REGEX.lastIndex = 0;
    if (!R4A_SETINTERVAL_REGEX.test(content)) continue;
    // File calls setInterval(...) — does it clear anywhere?
    if (/\bclearInterval\s*\(/.test(content)) continue;
    // No clearInterval in the file. Report at the first setInterval call.
    R4A_SETINTERVAL_REGEX.lastIndex = 0;
    const match = R4A_SETINTERVAL_REGEX.exec(content);
    if (!match) continue;
    const exemptScanStart = Math.max(0, match.index - EXEMPT_LOOKBACK_CHARS);
    const exemptScan = content.slice(exemptScanStart, match.index);
    if (R4_EXEMPT_REGEX.test(exemptScan)) continue;
    violations.push({
      check: 'R4a',
      file: rel,
      line: lineOf(content, match.index),
      message:
        'setInterval(...) with no clearInterval(...) in this file — timer handle is leaked and the callback keeps firing (add clearInterval in the cleanup, or add // r4-exempt with justification)',
    });
  }
  return violations;
}

// ── R4b: addEventListener / removeEventListener pairing ──────────────
//
// Flags any file that calls addEventListener(...) but contains no
// removeEventListener(...) anywhere. Same-file heuristic: one
// removeEventListener anywhere exempts every addEventListener in the file
// (under-reports per-effect gaps). Accepted for a low-noise tripwire.

const R4B_ADD_REGEX = /\baddEventListener\s*\(/g;

// File-level allowlist: intentional app-lifetime / global listeners that
// live for the entire app session and are never torn down per-effect.
// Arqavellum allowlists the service worker — its fetch/install/activate
// listeners ARE the SW's reason to exist and live for the SW lifetime.
// Consumers add entries here when they introduce their own legitimate
// app-lifetime listeners (global error handler, singleton store, etc.).
const R4B_ALLOWLIST = new Set<string>(['public/sw.js']);

function auditR4b(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file);
    if (R4B_ALLOWLIST.has(rel)) continue;
    const content = readFileSync(file, 'utf8');
    R4B_ADD_REGEX.lastIndex = 0;
    if (!R4B_ADD_REGEX.test(content)) continue;
    if (/\bremoveEventListener\s*\(/.test(content)) continue;
    R4B_ADD_REGEX.lastIndex = 0;
    const match = R4B_ADD_REGEX.exec(content);
    if (!match) continue;
    const exemptScanStart = Math.max(0, match.index - EXEMPT_LOOKBACK_CHARS);
    const exemptScan = content.slice(exemptScanStart, match.index);
    if (R4_EXEMPT_REGEX.test(exemptScan)) continue;
    violations.push({
      check: 'R4b',
      file: rel,
      line: lineOf(content, match.index),
      message:
        'addEventListener(...) with no removeEventListener(...) in this file — listener is leaked (pair with removeEventListener in cleanup, add to R4B_ALLOWLIST for an app-lifetime global, or add // r4-exempt with justification)',
    });
  }
  return violations;
}

// ── R1: async-in-effect without cancellation guard ───────────────────
//
// Scoped to React lifecycle code: app/, components/, hooks/, context/.
// NOT services/ or stores/ (their async concerns are behavioral and
// resist static analysis).
//
// For each `useEffect(` we capture a forward body window bounded by the
// next `useEffect(`, the effect's deps close `}, [`, or ~3000 chars
// (whichever comes first). The window is flagged when it:
//   (a) awaits (await / .then), AND
//   (b) calls a setState (setXyz()) or a navigation helper, AND
//   (c) contains NONE of the guard tokens that signal an unmount/cancel
//       guard is already in place.

const R1_SCAN_PREFIXES = ['app/', 'components/', 'hooks/', 'context/'];

const R1_EFFECT_REGEX = /\buseEffect\s*\(/g;

const R1_ASYNC_REGEX = /\bawait\b|\.then\s*\(/;
const R1_SETSTATE_REGEX = /\bset[A-Z]\w*\s*\(/;
const R1_NAV_REGEX =
  /\bNavigationHelper\b|\brouter\s*\.\s*(?:replace|navigate|push|back)\b|\b(?:replaceWith|navigateTo)\w*\s*\(/;
const R1_GUARD_REGEX =
  /\b(?:cancelled|isCancelled|isMounted|isMountedRef|AbortController|AbortSignal|didCancel|isFocused|ignore|active)\b/;

const R1_EXEMPT_REGEX = /\br1-exempt\b/;

const R1_WINDOW_CHAR_LIMIT = 3000;

// Find the end of a single effect's body, scanning forward from `start`.
// The effect callback closes with `}, [` (arrow-body brace + comma + deps
// array). Returns the index of the closing brace, clamped to
// start + R1_WINDOW_CHAR_LIMIT and to content.length. Regex can't
// brace-match, so this is a best-effort tripwire.
function findEffectBodyEnd(content: string, start: number): number {
  const limit = Math.min(content.length, start + R1_WINDOW_CHAR_LIMIT);
  for (let i = start; i < limit - 2; i++) {
    if (content[i] === '}' && content[i + 1] === ',') {
      let j = i + 2;
      while (
        j < limit &&
        (content[j] === ' ' ||
          content[j] === '\n' ||
          content[j] === '\t' ||
          content[j] === '\r')
      ) {
        j++;
      }
      if (content[j] === '[') return i;
    }
  }
  return limit;
}

interface EffectSpan {
  start: number;
  end: number; // exclusive — first char after the matched `useEffect(` text
}

function auditR1(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file);
    if (!R1_SCAN_PREFIXES.some((p) => rel.startsWith(p))) continue;
    const content = readFileSync(file, 'utf8');

    const spans: EffectSpan[] = [];
    R1_EFFECT_REGEX.lastIndex = 0;
    let m;
    while ((m = R1_EFFECT_REGEX.exec(content)) !== null) {
      spans.push({ start: m.index, end: m.index + m[0].length });
    }

    for (let e = 0; e < spans.length; e++) {
      const { start: matchIndex, end: headerEnd } = spans[e];
      const bodyEnd = findEffectBodyEnd(content, headerEnd);
      const nextEffect =
        e + 1 < spans.length ? spans[e + 1].start : content.length;
      const windowEnd = Math.min(bodyEnd, nextEffect);
      const window = content.slice(headerEnd, windowEnd);

      const hasAsync = R1_ASYNC_REGEX.test(window);
      const hasSideEffect =
        R1_SETSTATE_REGEX.test(window) || R1_NAV_REGEX.test(window);
      const hasGuard = R1_GUARD_REGEX.test(window);
      if (hasAsync && hasSideEffect && !hasGuard) {
        const exemptScanStart = Math.max(0, matchIndex - EXEMPT_LOOKBACK_CHARS);
        const exemptScan = content.slice(exemptScanStart, matchIndex);
        if (R1_EXEMPT_REGEX.test(exemptScan)) continue;
        violations.push({
          check: 'R1',
          file: rel,
          line: lineOf(content, matchIndex),
          message:
            'useEffect awaits (await / .then) then calls setState/navigation with no cancellation guard — add a `cancelled` / `isMountedRef` / AbortController guard, or add // r1-exempt: <reason> if the call is genuinely fire-and-forget',
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
    ...auditR4a(allFiles),
    ...auditR4b(allFiles),
    ...auditR1(allFiles),
  ];

  if (violations.length === 0) {
    console.log('✓ PASS: No runtime-resilience violations found.');
    process.exit(0);
  }

  const byFile = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = byFile.get(v.file) ?? [];
    list.push(v);
    byFile.set(v.file, list);
  }

  console.error(
    `✗ FAIL: ${violations.length} runtime-resilience violation(s) found.\n`,
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

#!/usr/bin/env bun
/**
 * scripts/audit-data-layer.ts
 *
 * Data layer integrity audit. Enforces three of the CODE_GARDENING Prompt 2
 * checks that can be statically verified:
 *
 *   S9  — no direct Supabase client usage in app/hooks/components/context. All
 *         backend access must go through utils/supabase/**, services/**, or
 *         lib/react-query/**. Flags both `@supabase/supabase-js` imports and
 *         `supabase.{from,auth,rpc,channel,storage,functions}` calls.
 *
 *   S13 — no inline `queryKey: [...]` array literals. All React Query
 *         query keys must be produced via the `queryKeys` factory in
 *         lib/react-query/queryKeys.ts.
 *
 *   D5  — repository methods return RepositoryResult<T>. Every static async
 *         method in utils/supabase/repositories/*.ts must have a return type
 *         containing `RepositoryResult`. Opt out per-method with a
 *         `// d5-exempt` comment on the method line or the line above.
 *
 * S8 (raw fetch) is enforced separately by eslint.structure.config.js.
 * D4 (queue extends base) is a design-pattern check — manual only, see
 * CODE_GARDENING.md Prompt 2 note.
 *
 * No --fix mode: these violations aren't safely auto-fixable.
 *
 * Mirrors the structure of scripts/audit-barrels.ts.
 *
 * Run: `bun run scripts/audit-data-layer.ts`
 * Exits 1 on any violation, 0 otherwise.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { extname, join, relative } from 'path';

const ROOT = process.cwd();

// ── File walking (shared with audit-barrels.ts) ──────────────────────

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

type Check = 'S9-import' | 'S9-call' | 'S13' | 'D5';

interface Violation {
  check: Check;
  file: string;
  line: number;
  message: string;
}

// ── S9: direct Supabase usage in app/hooks/components/context ─────────
//
// Only these four client-facing trees are scanned. Files in utils/supabase/,
// services/, and lib/react-query/ ARE the service layer — scanning them
// would be noise.

const S9_SCAN_DIRS = ['app', 'hooks', 'components', 'context'];

// Allowed folders where supabase usage is permitted.
const S9_ALLOWED_PREFIXES = [
  'utils/supabase/',
  'services/',
  'lib/react-query/',
];

const S9_IMPORT_REGEX = /from\s+['"]@supabase\/supabase-js['"]/;

// Matches `supabase.from(`, `supabase.auth.`, `supabase.rpc(`,
// `supabase.channel(`, `supabase.storage(`, `supabase.functions(`.
// The leading \b prevents false positives like `mySupabase.from(...)`.
const S9_CALL_REGEX = /\bsupabase\.(from|auth|rpc|channel|storage|functions)\b/;

function isS9Allowed(absPath: string): boolean {
  const rel = relative(ROOT, absPath);
  return S9_ALLOWED_PREFIXES.some(
    (prefix) => rel === prefix.slice(0, -1) || rel.startsWith(prefix),
  );
}

function auditS9(files: string[]): Violation[] {
  const violations: Violation[] = [];
  const scanSet = files.filter((f) => {
    const rel = relative(ROOT, f);
    return S9_SCAN_DIRS.some((d) => rel === d || rel.startsWith(d + '/'));
  });

  for (const file of scanSet) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (S9_IMPORT_REGEX.test(line)) {
        violations.push({
          check: 'S9-import',
          file: relative(ROOT, file),
          line: i + 1,
          message:
            'imports @supabase/supabase-js directly — use a service layer (utils/supabase/**, services/**, or lib/react-query/**)',
        });
      }
      if (S9_CALL_REGEX.test(line)) {
        violations.push({
          check: 'S9-call',
          file: relative(ROOT, file),
          line: i + 1,
          message:
            'calls the supabase client directly — route through a service layer (utils/supabase/**, services/**, or lib/react-query/**)',
        });
      }
    });
  }
  return violations;
}

// ── S13: inline queryKey arrays ───────────────────────────────────────
//
// queryKeys.ts is the factory and is exempt. queryClient.ts reads query
// keys off cache events (not declarations) and is also exempt.

const S13_SKIP_FILES = new Set([
  join(ROOT, 'lib/react-query/queryKeys.ts'),
  join(ROOT, 'lib/react-query/queryClient.ts'),
]);

// Match `queryKey:` followed by an opening `[` that does not immediately
// start a `...queryKeys` spread. Allows:
//   queryKey: queryKeys.x.y()        (no array literal — passes)
//   queryKey: [...queryKeys.x, 'z']  (spread — passes)
const S13_REGEX = /queryKey\s*:\s*\[(?!\.\.\.queryKeys)/;

function auditS13(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    if (S13_SKIP_FILES.has(file)) continue;
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (S13_REGEX.test(line)) {
        violations.push({
          check: 'S13',
          file: relative(ROOT, file),
          line: i + 1,
          message:
            'inline queryKey array — use the queryKeys factory from lib/react-query/queryKeys.ts',
        });
      }
    });
  }
  return violations;
}

// ── D5: repository return types ───────────────────────────────────────

const D5_SCAN_DIR = join(ROOT, 'utils/supabase/repositories');

// `static async methodName` — captures the name so violations can name it.
const D5_METHOD_REGEX = /static\s+async\s+(\w+)/;

// Lines to scan forward from the method declaration looking for the return
// type. Existing signatures span up to ~17 lines (uploadSizeStatistics);
// 20 gives headroom.
const D5_WINDOW = 20;

const D5_EXEMPT_REGEX = /\bd5-exempt\b/;

function auditD5(): Violation[] {
  const violations: Violation[] = [];
  const files = walk(D5_SCAN_DIR);

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      const m = D5_METHOD_REGEX.exec(line);
      if (!m) return;
      const methodName = m[1];

      // Scan forward for the first line containing `Promise<`.
      let promiseLineIdx = -1;
      const limit = Math.min(lines.length, i + D5_WINDOW);
      for (let j = i; j < limit; j++) {
        if (lines[j].includes('Promise<')) {
          promiseLineIdx = j;
          break;
        }
      }
      // No return type found within the window — skip (not necessarily a
      // violation; could be a non-data static helper).
      if (promiseLineIdx === -1) return;

      // Opt-out: `// d5-exempt` on the method line or the line above.
      const exempt =
        D5_EXEMPT_REGEX.test(line) ||
        (i > 0 && D5_EXEMPT_REGEX.test(lines[i - 1]));
      if (exempt) return;

      if (!lines[promiseLineIdx].includes('RepositoryResult')) {
        violations.push({
          check: 'D5',
          file: relative(ROOT, file),
          line: i + 1,
          message: `static async ${methodName}() return type does not use RepositoryResult<T> — repositories must return RepositoryResult (add // d5-exempt to opt out)`,
        });
      }
    });
  }
  return violations;
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  const allFiles = walk(ROOT);
  const violations: Violation[] = [
    ...auditS9(allFiles),
    ...auditS13(allFiles),
    ...auditD5(),
  ];

  if (violations.length === 0) {
    console.log('✓ PASS: No data layer violations found.');
    process.exit(0);
  }

  const byFile = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = byFile.get(v.file) ?? [];
    list.push(v);
    byFile.set(v.file, list);
  }

  console.error(`✗ FAIL: ${violations.length} data layer violation(s) found.\n`);
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

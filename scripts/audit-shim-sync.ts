#!/usr/bin/env bun
/**
 * scripts/audit-shim-sync.ts
 *
 * Enforces the barrel-shim sync rule (shims/ are load-bearing perf — see
 * CLAUDE.md's pre-commit section). metro.config.js redirects the exact
 * specifiers `@tamagui/lucide-icons-2` and `date-fns` to shims/*.js, which
 * re-export ONLY the symbols the app uses. A named import that the shim
 * doesn't re-export is silently `undefined` at runtime — the typecheck
 * passes (the sibling .d.ts re-exports the packages' own barrel types) and
 * the metro build passes too (verified: a reachable import of a
 * non-shimmed icon builds clean). So the sync rule needs this audit, not
 * the compiler. The chained `sync-barrel-shims.ts` regenerates shims
 * before every expo command; this audit is the commit-time net that
 * catches an import added and committed without a build in between.
 *
 * Three checks:
 *
 *   shim-sync  — every named import/re-export of a shimmed specifier across
 *                repo source must exist as a re-export in the shim. FAILS.
 *
 *   redirect   — metro.config.js must still redirect both specifiers to the
 *                shims. Removing the redirect silently reverts to the full
 *                barrels (importing one icon pulls all 3520; the icon pack
 *                alone measured −27% of this repo's raw export bundle).
 *                FAILS.
 *
 *   dead-shim  — shim entries no repo source imports anymore. Warns only:
 *                stale entries bloat the bundle but can't break runtime.
 *
 * Limitations (acceptable for a regression gate): regex parsing, not AST —
 * dynamic imports and namespace imports (`import * as`) are skipped. Errs
 * toward false negatives.
 *
 * Run: `bun run scripts/audit-shim-sync.ts`
 * Exits 1 on any failure, 0 otherwise.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { extname, join, relative } from 'path';

const ROOT = process.cwd();

const SHIMMED_SPECIFIERS = ['@tamagui/lucide-icons-2', 'date-fns'] as const;

const SHIM_FILES: Record<string, string> = {
  '@tamagui/lucide-icons-2': 'shims/lucide-icons-2.js',
  'date-fns': 'shims/date-fns.js',
};

const METRO_CONFIG = 'metro.config.js';

const EXCLUDE_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.next',
  '__tests__',
  '__mocks__',
  'scripts',
  'shims',
]);

const EXCLUDE_PATH_PREFIXES: string[] = ['supabase/functions'];

const SOURCE_EXTS = ['.ts', '.tsx', '.js', '.jsx'];

function isExcluded(absPath: string): boolean {
  const rel = relative(ROOT, absPath);
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

/** Names inside an import/export brace block — handles `X`, `type X`, `X as Y`. */
function parseNames(blob: string): string[] {
  const names: string[] = [];
  for (let raw of blob.split(',')) {
    raw = raw.trim();
    if (!raw) continue;
    raw = raw.replace(/^type\s+/, '');
    const asMatch = raw.match(/\bas\s+([A-Za-z_$][\w$]*)$/);
    if (asMatch) {
      names.push(asMatch[1]);
      continue;
    }
    if (/^[A-Za-z_$][\w$]*$/.test(raw)) {
      names.push(raw);
    }
  }
  return names;
}

interface Use {
  file: string;
  line: number;
  specifier: string;
  names: string[];
}

/** Named imports and re-exports of the shimmed bare specifiers. */
function findUses(files: string[]): Use[] {
  const uses: Use[] = [];
  const specAlternation = SHIMMED_SPECIFIERS.map((s) => s.replace(/\//g, '\\/')).join('|');
  // import { A, B } from '<spec>'   /   export { A } from '<spec>'
  // ([^}]+] spans newlines — multi-line named imports are covered.
  const regex = new RegExp(
    `(?:import|export)\\s+(?:type\\s+)?\\{([^}]+)\\}\\s*from\\s*['"](${specAlternation})['"]`,
    'g',
  );
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const line = content.slice(0, match.index).split('\n').length;
      uses.push({
        file: relative(ROOT, file),
        line,
        specifier: match[2],
        names: parseNames(match[1]),
      });
    }
  }
  return uses;
}

/** Re-exported names in a shim file. */
function shimmedNames(shimPath: string): Set<string> {
  const content = readFileSync(join(ROOT, shimPath), 'utf8');
  const names = new Set<string>();
  // export { X } from '...'   /   export { default as X } from '...'
  const regex = /export\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    for (const raw of match[1].split(',')) {
      const asMatch = raw.trim().match(/(?:default\s+as\s+)?([A-Za-z_$][\w$]*)\s*$/);
      if (asMatch) names.add(asMatch[1]);
    }
  }
  return names;
}

function main() {
  const failures: string[] = [];
  const warnings: string[] = [];

  // Check 1: the redirect still exists in metro.config.js.
  const metro = readFileSync(join(ROOT, METRO_CONFIG), 'utf8');
  for (const spec of SHIMMED_SPECIFIERS) {
    const shim = SHIM_FILES[spec];
    if (!metro.includes(shim)) {
      failures.push(
        `${METRO_CONFIG} no longer redirects '${spec}' to ${shim} — the shim is load-bearing; ` +
          `removing the redirect reverts to the full barrel (importing one icon pulls all 3520, ` +
          `measured −27% of this repo's raw export bundle when shimmed).`,
      );
    }
  }

  const files = walk(ROOT);
  const uses = findUses(files);

  // Check 2: every used name is shimmed.
  const usedBySpec = new Map<string, Set<string>>();
  for (const use of uses) {
    const shim = SHIM_FILES[use.specifier];
    const shimmed = shimmedNames(shim);
    for (const name of use.names) {
      if (!shimmed.has(name)) {
        failures.push(
          `${use.file}:${use.line} imports '${name}' from '${use.specifier}' — not re-exported by ` +
            `${shim}. The build will NOT catch it: the name is silently undefined at runtime. ` +
            `Add the re-export line to ${shim} in the same change.`,
        );
      }
      const set = usedBySpec.get(use.specifier) ?? new Set<string>();
      set.add(name);
      usedBySpec.set(use.specifier, set);
    }
  }

  // Check 3 (warn): shim entries nothing imports anymore.
  for (const spec of SHIMMED_SPECIFIERS) {
    const shim = SHIM_FILES[spec];
    const used = usedBySpec.get(spec) ?? new Set<string>();
    for (const name of shimmedNames(shim)) {
      if (!used.has(name)) {
        warnings.push(
          `${shim} re-exports '${name}' but no repo source imports it — a stale entry ships dead ` +
            `bytes in every bundle. Remove the line unless the import is landing in the same change.`,
        );
      }
    }
  }

  for (const w of warnings) console.error(`  ⚠ ${w}`);

  if (failures.length === 0) {
    console.log('✓ PASS: shim sync — every shimmed-specifier import has its shim re-export.');
    process.exit(0);
  }

  console.error(`✗ FAIL: ${failures.length} barrel-shim sync violation(s):\n`);
  for (const f of failures) console.error(`  ${f}\n`);
  process.exit(1);
}

main();

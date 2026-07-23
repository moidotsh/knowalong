#!/usr/bin/env bun
/**
 * scripts/audit-barrels.ts
 *
 * S5 Structural integrity audit. Enforces barrel imports so the codebase
 * stays acyclic and imports flow through public module boundaries.
 *
 * Two checks:
 *
 *   S5 Internal — a file importing from its own barrel (e.g., `'.'`, `'..'`).
 *                 Creates circular dependencies. Always flagged.
 *
 *   S5 External — a file importing via a direct path when a barrel re-exports
 *                 the same symbol from that exact source module. The fix is to
 *                 import from the barrel instead.
 *                 Skipped when the matching barrel sits in the same directory
 *                 as the importer (intra-module sub-barrel usage is fine, e.g.,
 *                 `components/Onboarding/TrainingApproachStep.tsx` importing
 *                 from `./hooks/useStep`).
 *
 * Symbols deliberately kept out of barrels (see utils/index.ts: "direct import
 * when needed" comments) are never in the symbol map and therefore never
 * flagged — the carve-outs handle themselves.
 *
 * Limitations (acceptable for a regression gate):
 *   - Regex parsing, not full AST. Dynamic imports and deeply chained
 *     re-exports may be missed. Errs toward false negatives.
 *   - `export * from` wildcards are skipped. Symbols exported only via
 *     wildcard will not be flagged.
 *
 * Run: `bun run scripts/audit-barrels.ts`
 * Exits 1 on any violation, 0 otherwise.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { extname, join, dirname, normalize, relative } from 'path';

const ROOT = process.cwd();

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

function isBarrelFile(absPath: string): boolean {
  const base = absPath.split('/').pop() ?? '';
  return base.startsWith('index.') && SOURCE_EXTS.includes(extname(base));
}

// Resolve a relative module specifier to an absolute file path.
// Returns null if no file matches.
function resolveModule(fromDir: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const joined = normalize(join(fromDir, spec));
  // Try the spec as a file with a source extension.
  for (const ext of SOURCE_EXTS) {
    const candidate = joined + ext;
    try {
      const st = statSync(candidate);
      if (st.isFile()) return candidate;
    } catch {
      /* try next */
    }
  }
  // Try the spec as a directory containing an index file.
  for (const ext of SOURCE_EXTS) {
    const candidate = join(joined, 'index' + ext);
    try {
      const st = statSync(candidate);
      if (st.isFile()) return candidate;
    } catch {
      /* try next */
    }
  }
  return null;
}

// Parse the inside of an `export { ... }` or `import { ... }` brace block.
// Handles: `name`, `type name`, `default as alias`, `name as alias`.
function parseNames(blob: string): string[] {
  const names: string[] = [];
  for (let raw of blob.split(',')) {
    raw = raw.trim();
    if (!raw) continue;
    // Strip `type ` prefix (TS type-only export/import syntax).
    raw = raw.replace(/^type\s+/, '');
    // `X as Y` → use Y.
    const asMatch = raw.match(/\bas\s+([A-Za-z_$][\w$]*)$/);
    if (asMatch) {
      names.push(asMatch[1]);
      continue;
    }
    // `default` (for `export { default as Foo }`).
    if (raw === 'default') {
      names.push('default');
      continue;
    }
    if (/^[A-Za-z_$][\w$]*$/.test(raw)) {
      names.push(raw);
    }
  }
  return names;
}

interface BarrelExport {
  barrelPath: string;
  barrelDir: string;
  sourceModule: string;
}

// Map: symbolName → list of barrels that re-export it (with source module).
function buildBarrelMap(
  barrelFiles: string[],
): Map<string, BarrelExport[]> {
  const map = new Map<string, BarrelExport[]>();
  // Matches: export [type] { ... } from './relative'
  // Does NOT match `export * from` (wildcard) — skipped deliberately.
  const exportRegex =
    /export\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;

  for (const barrelPath of barrelFiles) {
    const content = readFileSync(barrelPath, 'utf8');
    const barrelDir = dirname(barrelPath);
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      const namesBlob = match[1];
      const sourceSpec = match[2];
      if (!sourceSpec.startsWith('.')) continue;
      const sourceModule = resolveModule(barrelDir, sourceSpec);
      if (!sourceModule) continue;
      const names = parseNames(namesBlob);
      for (const name of names) {
        const list = map.get(name) ?? [];
        list.push({ barrelPath, barrelDir, sourceModule });
        map.set(name, list);
      }
    }
  }
  return map;
}

interface ImportStatement {
  file: string;
  fileDir: string;
  line: number;
  specifier: string;
  clause: string | null; // everything between `import` and `from`
  resolvedTarget: string | null;
  targetIsBarrel: boolean;
}

function parseImports(content: string, file: string): ImportStatement[] {
  const results: ImportStatement[] = [];
  const fileDir = dirname(file);
  // Match: import <clause> from '<spec>'
  // The clause may span multiple lines (named imports across lines).
  const importRegex =
    /import\s+(?:([^;]+?)\s+from\s+)?['"]([^'"]+)['"]/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const clause = match[1] ?? null;
    const specifier = match[2];

    // Side-effect-only imports (`import './foo'`) have no clause. They don't
    // bind names so they can't violate S5 External. Skip.
    if (clause === null) continue;

    // Skip namespace imports — we can't introspect which symbols they pull.
    if (/\*\s+as\s+/.test(clause)) continue;

    const upTo = content.slice(0, match.index);
    const line = upTo.split('\n').length;

    const resolvedTarget = specifier.startsWith('.')
      ? resolveModule(fileDir, specifier)
      : null;
    const targetIsBarrel = resolvedTarget
      ? isBarrelFile(resolvedTarget)
      : false;

    results.push({
      file,
      fileDir,
      line,
      specifier,
      clause,
      resolvedTarget,
      targetIsBarrel,
    });
  }
  return results;
}

// Extract imported names (default + named) from an import clause.
function importedNamesFromClause(clause: string): string[] {
  const names: string[] = [];
  // Default import: the identifier before `{` or comma.
  const braceStart = clause.indexOf('{');
  const head = braceStart >= 0 ? clause.slice(0, braceStart) : clause;
  const trimmedHead = head.replace(/,\s*$/, '').trim();
  if (trimmedHead && /^[A-Za-z_$][\w$]*$/.test(trimmedHead)) {
    names.push('default');
  }
  // Named imports inside { }.
  if (braceStart >= 0) {
    const braceEnd = clause.lastIndexOf('}');
    if (braceEnd > braceStart) {
      const blob = clause.slice(braceStart + 1, braceEnd);
      for (const n of parseNames(blob)) names.push(n);
    }
  }
  return names;
}

interface Violation {
  kind: 'S5-internal' | 'S5-external';
  file: string;
  /** Absolute path to the violating file. */
  absPath: string;
  line: number;
  specifier: string;
  message: string;
  /** Barrel import specifier to use as the fix (e.g., '../context'). */
  fixSpec?: string;
  fix?: string;
}

function audit(): Violation[] {
  const allFiles = walk(ROOT);
  const barrelFiles = allFiles.filter(isBarrelFile);
  const sourceFiles = allFiles.filter((f) => !isBarrelFile(f));

  const barrelMap = buildBarrelMap(barrelFiles);
  const violations: Violation[] = [];

  // Specifiers that are always self-barrel references. Examples: '.', '..',
  // './index', '../index', './', '../'.
  const SELF_BARREL_SPEC = /^\.+(\/index)?\/?$/;

  for (const file of sourceFiles) {
    const content = readFileSync(file, 'utf8');
    const imports = parseImports(content, file);

    for (const imp of imports) {
      if (!imp.specifier.startsWith('.')) continue;
      const relFile = relative(ROOT, imp.file);

      // S5 Internal: imports from own/parent barrel via bare dots.
      if (SELF_BARREL_SPEC.test(imp.specifier)) {
        violations.push({
          kind: 'S5-internal',
          file: relFile,
          absPath: imp.file,
          line: imp.line,
          specifier: imp.specifier,
          message: `imports from barrel via '${imp.specifier}' — circular dependency`,
          fix: 'import directly from the relative module path (e.g., ./Foo) instead of the barrel',
        });
        continue;
      }

      // S5 External: direct-path import where a barrel re-exports the same
      // symbol from the same source module. Only flag when a single barrel
      // covers ALL imported names — otherwise the fix would require splitting
      // the import, which is not a safe mechanical change.
      if (imp.targetIsBarrel) continue; // already going through a barrel
      if (!imp.resolvedTarget) continue;
      if (!imp.clause) continue;

      const importedNames = importedNamesFromClause(imp.clause);
      if (importedNames.length === 0) continue;

      // Collect candidate barrels: barrels that re-export from the same source
      // module and are not intra-module relative to the importer.
      const candidateBarrels: BarrelExport[] = [];
      const seenBarrelPaths = new Set<string>();
      for (const name of importedNames) {
        const entries = barrelMap.get(name);
        if (!entries) continue;
        for (const entry of entries) {
          if (entry.sourceModule !== imp.resolvedTarget) continue;
          // Skip intra-module: importer lives inside the barrel's package —
          // i.e., in the barrel's directory or a subdirectory of it.
          if (
            imp.fileDir === entry.barrelDir ||
            imp.fileDir.startsWith(entry.barrelDir + '/')
          )
            continue;
          if (seenBarrelPaths.has(entry.barrelPath)) continue;
          seenBarrelPaths.add(entry.barrelPath);
          candidateBarrels.push(entry);
        }
      }

      // Find a barrel that re-exports ALL imported names from this source.
      // Build a quick lookup of which names each candidate covers.
      let bestBarrel: BarrelExport | null = null;
      for (const candidate of candidateBarrels) {
        const coversAll = importedNames.every((name) => {
          const entries = barrelMap.get(name);
          if (!entries) return false;
          return entries.some(
            (e) =>
              e.barrelPath === candidate.barrelPath &&
              e.sourceModule === imp.resolvedTarget,
          );
        });
        if (coversAll) {
          bestBarrel = candidate;
          break;
        }
      }

      if (bestBarrel) {
        const barrelDir = dirname(bestBarrel.barrelPath);
        const dirRel = relative(imp.fileDir, barrelDir);
        // Build an import specifier that points at the barrel directory.
        let fixSpec: string;
        if (dirRel === '') {
          fixSpec = '.';
        } else if (dirRel === '..') {
          fixSpec = '..';
        } else if (dirRel.startsWith('../')) {
          fixSpec = dirRel;
        } else {
          fixSpec = './' + dirRel;
        }
        violations.push({
          kind: 'S5-external',
          file: relFile,
          absPath: imp.file,
          line: imp.line,
          specifier: imp.specifier,
          fixSpec,
          message: `imports directly from '${imp.specifier}' when a barrel re-exports the same symbol(s)`,
          fix: `import { ... } from '${fixSpec}'  (barrel: ${relative(ROOT, bestBarrel.barrelPath)})`,
        });
      }
    }
  }

  return violations;
}

function applyFixes(violations: Violation[]): number {
  // Group by absolute file path. Within each file, track per-violation line
  // numbers so we only replace the specifier on flagged import lines — not
  // every occurrence of the same path string (which could include imports
  // whose symbols are NOT all in the barrel).
  const byFile = new Map<
    string,
    Array<{ line: number; oldSpec: string; newSpec: string }>
  >();
  for (const v of violations) {
    if (v.kind !== 'S5-external' || !v.fixSpec) continue;
    const list = byFile.get(v.absPath) ?? [];
    list.push({ line: v.line, oldSpec: v.specifier, newSpec: v.fixSpec });
    byFile.set(v.absPath, list);
  }

  let filesChanged = 0;
  for (const [absPath, fixes] of byFile) {
    const lines = readFileSync(absPath, 'utf8').split('\n');
    for (const { line, oldSpec, newSpec } of fixes) {
      // The `from '...'` clause may be on the import start line or a few
      // lines later (multi-line named imports). Scan forward to find it.
      for (let i = line - 1; i < Math.min(line + 19, lines.length); i++) {
        const text = lines[i];
        const singleFrom = `from '${oldSpec}'`;
        const doubleFrom = `from "${oldSpec}"`;
        if (text.includes(singleFrom)) {
          lines[i] = text.replace(singleFrom, `from '${newSpec}'`);
          break;
        }
        if (text.includes(doubleFrom)) {
          lines[i] = text.replace(doubleFrom, `from "${newSpec}"`);
          break;
        }
      }
    }
    writeFileSync(absPath, lines.join('\n'));
    filesChanged++;
  }
  return filesChanged;
}

function main() {
  const wantFix = process.argv.includes('--fix');
  const violations = audit();

  if (wantFix && violations.some((v) => v.kind === 'S5-external' && v.fixSpec)) {
    const changed = applyFixes(violations);
    console.log(`Applied fixes to ${changed} file(s).`);
    // Re-audit to report any remaining (e.g., S5-internal that --fix doesn't handle).
    const remaining = audit();
    if (remaining.length === 0) {
      console.log('✓ PASS: All auto-fixable violations resolved.');
      process.exit(0);
    }
    console.error(`\n✗ ${remaining.length} violation(s) remain after --fix:\n`);
    for (const v of remaining) {
      console.error(`  ${v.file}:${v.line}  [${v.kind}]  ${v.message}`);
      if (v.fix) console.error(`    fix: ${v.fix}`);
    }
    process.exit(1);
  }

  if (violations.length === 0) {
    console.log('✓ PASS: No barrel import violations found.');
    process.exit(0);
  }

  const byFile = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = byFile.get(v.file) ?? [];
    list.push(v);
    byFile.set(v.file, list);
  }

  console.error(`✗ FAIL: ${violations.length} barrel import violation(s) found.\n`);
  for (const [file, fileViolations] of byFile) {
    for (const v of fileViolations) {
      console.error(`  ${file}:${v.line}  [${v.kind}]`);
      console.error(`    ${v.message}`);
      if (v.fix) console.error(`    fix: ${v.fix}`);
      console.error('');
    }
  }
  process.exit(1);
}

main();

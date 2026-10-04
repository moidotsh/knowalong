// scripts/check-shell-drift.ts
// THE SYNC DRIFT CHECK — consumer kit files are never byte-identical
// to the shell (values and comments are ours by design), so drift is
// governed by a COMMITTED BASELINE: `scripts/shell-drift-baseline.json`
// maps each shell-owned kit file to the sha256 of the copy this repo
// last REVIEWED. Any drift from the baseline fails the check —
// re-baselining (`bun run scripts/check-shell-drift.ts --rebaseline`)
// is a deliberate act that lands in the same commit as the change it
// blesses. The standing file-level diff vs ../arqavellum is printed
// for orientation; it is expected to be non-empty.

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dir, '..');
const SHELL = join(ROOT, '..', 'arqavellum');
const BASELINE = join(ROOT, 'scripts', 'shell-drift-baseline.json');
const KIT_DIRS = ['components/MobilePremium', 'components/premium/shared'];

function sha(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

const files: string[] = [];
for (const dir of KIT_DIRS) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) continue;
  const { readdirSync } = require('fs') as typeof import('fs');
  for (const f of readdirSync(abs)) {
    if (f.endsWith('.tsx') || f.endsWith('.ts')) files.push(`${dir}/${f}`);
  }
}
files.sort();

const baseline: Record<string, string> = existsSync(BASELINE)
  ? JSON.parse(readFileSync(BASELINE, 'utf8'))
  : {};

if (process.argv.includes('--rebaseline')) {
  const next: Record<string, string> = {};
  for (const f of files) next[f] = sha(join(ROOT, f));
  writeFileSync(BASELINE, JSON.stringify(next, null, 2) + '\n');
  console.log(`check-shell-drift: baseline rewritten (${files.length} files). Commit it with the change it blesses.`);
  process.exit(0);
}

let standing = 0;
let gated = 0;
for (const f of files) {
  const ours = sha(join(ROOT, f));
  const shellPath = join(SHELL, f);
  const differsFromShell = existsSync(shellPath) && sha(shellPath) !== ours;
  const known = baseline[f];
  if (known == null) {
    console.log(`✗ ${f} — not in the baseline (run --rebaseline and commit it)`);
    gated++;
    continue;
  }
  if (known !== ours) {
    console.log(`✗ ${f} — drifted from the reviewed baseline (re-review, then --rebaseline)`);
    gated++;
  } else if (differsFromShell) {
    standing++;
  }
}
console.log(
  `check-shell-drift: ${files.length} kit files · ${standing} standing (reviewed) differences vs the shell · ${gated} unreviewed.`,
);
if (gated > 0) process.exit(1);

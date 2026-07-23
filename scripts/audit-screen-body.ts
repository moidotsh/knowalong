#!/usr/bin/env bun
/**
 * scripts/audit-screen-body.ts
 *
 * SB1 — every full-screen route in app/ (excluding _layout.tsx,
 * +not-found.tsx, and the dev/ subtree) must apply SCREEN_BODY_STYLE.
 * The constant is the single source of truth for the centered mobile
 * content column; without it, screen bodies drift to the left edge
 * on wide viewports (the bug that motivated this audit — five screens
 * silently lost the constraint between QA1 and QA2).
 *
 * Detection: regex match for the literal `SCREEN_BODY_STYLE` in the
 * file. Coarse but cheap — both the import and the usage reference the
 * name. The audit doesn't care HOW the constant is applied (spread in
 * a StyleSheet entry, inline in style={[...]}, etc.); it only verifies
 * the screen author acknowledged the constraint by importing the name.
 *
 * ── Policy mode ──────────────────────────────────────────────────────
 *
 * SB1 reads `CONTENT_WIDTH_MODE` from constants/styles.ts at module
 * load — the same source runtime styles consume. This is load-bearing:
 * a single constant governs both the runtime shape and the pre-commit
 * enforcement, so flipping the mode actually changes both in lockstep.
 *
 *   'constrained' (default) — SB1 actively enforces the centered
 *                              mobile column on every app/*.tsx screen
 *                              body.
 *
 *   'fluid'                  — The consumer owns width behavior. SB1
 *                              prints an informational skip message
 *                              and exits 0. The mode does NOT relax
 *                              any non-width audit.
 *
 * Suppress with `// sb1-exempt`. Reserve for genuinely-different screen
 * shapes (full-bleed camera, AR overlay). Auth screens with the standard
 * SafeAreaView → MobileAtmosphere → MobileHeader → body shape are NOT
 * exempt.
 *
 * When a consumer adopts a real tablet/desktop layout strategy, the
 * right move is to flip CONTENT_WIDTH_MODE to 'fluid' (single source
 * of truth) rather than sprinkle `// sb1-exempt` across desktop-shaped
 * routes. See docs/contributing.md → "Adding desktop support" for the
 * evolution path.
 *
 * Mirrors the structure of scripts/audit-component-quality.ts.
 *
 * Run: `bun run scripts/audit-screen-body.ts`
 * Exits 1 on any violation, 0 otherwise.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';
import { CONTENT_WIDTH_MODE } from '../constants/styles';

const ROOT = process.cwd();
const APP_DIR = join(ROOT, 'app');

const EXCLUDED_FILENAMES = new Set(['_layout.tsx', '+not-found.tsx']);

function walk(dir: string, out: string[] = []): string[] {
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
      // The dev/ subtree holds the showcase & visual review tools, not
      // shipping screens. Skip the whole branch.
      if (entry === 'dev') continue;
      walk(full, out);
    } else if (st.isFile() && entry.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

// Fluid-mode skip: same source as runtime styles. Print an
// informational message but DO NOT warn or fail. Every non-width
// audit remains active; only the SB1 screen-body finding is skipped.
if (CONTENT_WIDTH_MODE === 'fluid') {
  console.log(
    'ℹ SKIP: CONTENT_WIDTH_MODE is fluid — SB1 screen-body finding is skipped. All other audits remain active.',
  );
  process.exit(0);
}

const files = walk(APP_DIR);
const violations: { file: string; message: string }[] = [];

for (const file of files) {
  const rel = relative(join(ROOT, 'app'), file).split(sep).join('/');
  const filename = rel.split('/').pop()!;
  if (EXCLUDED_FILENAMES.has(filename)) continue;

  const content = readFileSync(file, 'utf8');

  // Skip files without a default export — they're not route screens.
  if (!/export\s+default\s+(function|const)/.test(content)) continue;

  // Skip files with the escape hatch.
  if (/\/\/\s*sb1-exempt/.test(content)) continue;

  if (!/SCREEN_BODY_STYLE/.test(content)) {
    violations.push({
      file: `app/${rel}`,
      message:
        '[SB1] Screen does not apply SCREEN_BODY_STYLE. Import from ../constants and spread into the body StyleSheet entry (e.g. `body: { ...SCREEN_BODY_STYLE, paddingHorizontal: 20 }`).',
    });
  }
}

if (violations.length > 0) {
  console.error('');
  for (const v of violations) {
    console.error(`  ${v.file}: ${v.message}`);
  }
  console.error('');
  console.error(`  SB1: ${violations.length} violation(s) found.`);
  console.error('  Suppress with // sb1-exempt (use sparingly).');
  console.error('');
  process.exit(1);
}

console.error('✓ PASS: No screen-body violations found.');
process.exit(0);

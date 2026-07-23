#!/usr/bin/env bun
/**
 * scripts/audit-mobile-content-width.ts
 *
 * SB2 — Portal Content Width
 *
 * Enforces the mobile-width policy on portal-rendered MobilePremium
 * content. Sibling to SB1 (audit-screen-body.ts): both are structural
 * audits for the centered mobile content column, applied at different
 * rendering boundaries.
 *
 *   SB1 — the normal screen-body column (app/*.tsx). The host layout
 *         already provides the column via SCREEN_BODY_STYLE.
 *   SB2 — portal content rendered outside that column via RN Modal
 *         (components/MobilePremium/* and similar portal primitives).
 *         Once a component portals via Modal, it leaves the screen-body
 *         column behind; whatever width constraint the host had no
 *         longer applies. SB2 ensures the portal panel re-asserts the
 *         constraint explicitly via the canonical policy style.
 *
 * Audit codes and constitution pattern codes are separate namespaces.
 * SB1 already establishes that an audit code need not appear in the
 * ARCHITECTURE.md pattern index. SB2 follows that precedent — it is
 * documented alongside SB1 in CLAUDE.md → "Pre-commit checks" and in
 * the structural-audit / layout-constraint material, NOT in the
 * C-pattern constitution index.
 *
 * ── Policy mode ──────────────────────────────────────────────────────
 *
 * Both SB1 and SB2 read `CONTENT_WIDTH_MODE` from constants/styles.ts
 * at module load — the same source runtime styles consume. This is
 * load-bearing: a single constant governs both the runtime shape and
 * the pre-commit enforcement, so flipping the mode actually changes
 * both in lockstep.
 *
 *   'constrained' (default) — SB1 + SB2 actively enforce the centered
 *                              mobile column on screen bodies and
 *                              portal panels respectively.
 *
 *   'fluid'                  — The consumer owns width behavior. SB1
 *                              and SB2 print an informational skip
 *                              message and exit 0. The mode is a
 *                              repository-level architecture decision;
 *                              it does NOT relax Modal safety (C2),
 *                              accessibility, theme, reduced motion,
 *                              or any other audit.
 *
 * ── Two checks (constrained mode only) ───────────────────────────────
 *
 *   SB2-portal — every file under components/ that imports Modal from
 *                'react-native' must spread `MOBILE_CONTENT_WIDTH_STYLE`
 *                or `MOBILE_DIALOG_WIDTH_STYLE` inside a StyleSheet
 *                entry named sheet / card / cardWrapper / dialog /
 *                panel. Importing the constant is NOT sufficient — the
 *                spread must land on the visible portal panel.
 *
 *                Naming convention is the load-bearing signal: a file
 *                with the spread only on a non-panel element (e.g. a
 *                trigger wrapper named `group`) does NOT satisfy the
 *                check. This is the fix for the false-negative observed
 *                in the first implementation (MobileSelect's `sheet`
 *                style had no constraint but the trigger's `group`
 *                style satisfied a looser file-level check).
 *
 *                Suppress with `// sb2-exempt` (file-level) for the
 *                narrow case of a Modal with no visible content panel
 *                to constrain (e.g. an offscreen measurement surface).
 *
 *   SB2-magic-number — no literal numeric `maxWidth: <digits>` under
 *                      components/ (excluding comment lines and the
 *                      canonical definitions in constants/styles.ts).
 *                      Literal maxWidth values bypass the canonical
 *                      policy style; use the spread instead.
 *
 *                      Same-line `// sb2-exempt` suppresses a single
 *                      instance. Reserve for a one-off bespoke width
 *                      that genuinely can't adopt the policy.
 *
 * Scope is intentionally narrow: this audit governs `maxWidth` only.
 * It is NOT a generic numeric-layout ban. Other numeric layout values
 * (heights, radii, padding) remain valid inline.
 *
 * Run: `bun run scripts/audit-mobile-content-width.ts`
 * Exits 1 on any violation, 0 otherwise.
 *
 * Test fixtures live in __tests__/scripts/audit-mobile-content-width.test.ts.
 * The pure check functions below are exported solely for that test.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { extname, join, relative } from 'path';
import { CONTENT_WIDTH_MODE } from '../constants/styles';

const ROOT = process.cwd();
const COMPONENTS_DIR = join(ROOT, 'components');
const STYLES_CONSTANTS_FILE = join(ROOT, 'constants/styles.ts');

// ── File walking (shared shape with the other audit scripts) ─────────
//
// Walk only components/. The mobile-width system is a component-level
// concern; app/ screens are covered by SB1 (SCREEN_BODY_STYLE).

const EXCLUDE_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.next',
  '__tests__',
  '__mocks__',
]);

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
      if (EXCLUDE_DIRS.has(entry)) continue;
      walk(full, out);
    } else if (st.isFile() && (extname(full) === '.tsx' || extname(full) === '.ts')) {
      out.push(full);
    }
  }
  return out;
}

// ── Shared helpers (mirror audit-component-quality.ts conventions) ───

// A line whose portion before the match starts with `//`, `/*`, `*`
// (JSDoc continuation), or `{/*` (JSX comment) is a comment — not a
// live statement. Same heuristic as audit-component-quality.ts and
// audit-ui-theme.ts.
const COMMENT_PREFIX_REGEX = /^\s*(\/\/|\/\*|\*|\{\/\*)/;

// File-level / same-line escape hatch. Matches the existing audit
// convention (`// s7-exempt`, `// c1-exempt`, `// sb1-exempt`).
const SB2_EXEMPT_REGEX = /\bsb2-exempt\b/;

function lineOf(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
}

function textBeforeMatchOnLine(content: string, matchIndex: number): string {
  let lineStart = matchIndex;
  while (lineStart > 0 && content[lineStart - 1] !== '\n') lineStart--;
  return content.slice(lineStart, matchIndex);
}

// ── Detection regexes (exported for the test) ────────────────────────
//
// Detection of an RN Modal import is intentionally stricter than the
// C2 audit's `/\bModal\b/g`. C2 flags ANY use of the word Modal; SB2
// only flags files that actually import Modal from 'react-native'.
// This avoids false positives on:
//   - prose mentions in comments (audit skips comment lines anyway)
//   - MobileDialog / MobileSheet wrappers used elsewhere (the word
//     "Modal" is not a substring of "MobileDialog" so this is moot
//     in practice, but the stricter import-only detection also handles
//     hypothetical type-only references)
export const RN_MODAL_IMPORT_REGEX =
  /import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*['"]react-native['"]/;

// Portal-panel style name convention. A StyleSheet.create entry with
// one of these keys is treated as the visible portal panel:
//   sheet       — MobileSheet, MobileSelect
//   cardWrapper — MobileDialog
//   card        — common dialog/card naming
//   dialog      — explicit dialog naming
//   panel       — generic panel naming
//
// A file that spreads the policy style on a non-panel style name
// (e.g. MobileSelect's trigger `group`) does NOT satisfy the regex
// below — only a spread on a panel-named entry does. This closes the
// false-negative observed in the first implementation.
const PANEL_STYLE_NAMES = '(?:sheet|cardWrapper|card|dialog|panel)';

// Acceptance: a portal panel style entry containing the policy-style
// spread. Matches:
//   sheet: {
//     borderTopLeftRadius: 20,
//     ...MOBILE_CONTENT_WIDTH_STYLE,
//   },
// and equivalent single-line / multi-line variations. `[^}]*` bounds
// the match to a single object literal so the spread can't be picked
// up from a sibling entry.
export const PORTAL_PANEL_POLICY_SPREAD_REGEX = new RegExp(
  PANEL_STYLE_NAMES +
    '\\s*:\\s*\\{[^}]*\\.\\.\\.\\s*MOBILE_(CONTENT|DIALOG)_WIDTH_STYLE\\b',
);

// Magic-number detector — literal uses of the canonical policy caps
// (420 for content, 380 for dialog). Global flag because we iterate
// all matches in a file. The comment-prefix heuristic skips comment
// lines; the same-line sb2-exempt marker suppresses individual cases.
//
// Scope is intentionally narrow: only the two canonical cap values
// the policy defines. Arbitrary local numeric maxWidth values (e.g.
// `maxWidth: 220` for a small inline popover, `maxWidth: 120` for an
// avatar) are LEGITIMATE local layout and remain allowed. This audit
// exists to catch direct uses of the policy cap numbers that bypass
// the canonical spread — not to ban numeric maxWidth wholesale.
// Future fluid/tablet/desktop work will need local numeric widths;
// keep this regex pinned to the policy caps.
export const MAXWIDTH_LITERAL_REGEX = /maxWidth\s*:\s*(?:420|380)\b/g;

export type PortalCheck = 'SB2-portal' | 'SB2-magic-number';

export interface Violation {
  check: PortalCheck;
  file: string;
  line: number;
  message: string;
}

// ── SB2-portal ────────────────────────────────────────────────────────
//
// For each file under components/ that imports RN Modal, require the
// file to also spread MOBILE_CONTENT_WIDTH_STYLE or
// MOBILE_DIALOG_WIDTH_STYLE inside a panel-named StyleSheet entry.
// Files can opt out entirely with a `// sb2-exempt` marker anywhere
// in the source — reserve for genuine exceptions (e.g. a Modal used
// only as an offscreen measurement surface with no visual panel).

export function fileImportsRnModal(content: string): boolean {
  return RN_MODAL_IMPORT_REGEX.test(content);
}

export function appliesPolicySpreadToPortalPanel(content: string): boolean {
  return PORTAL_PANEL_POLICY_SPREAD_REGEX.test(content);
}

export function fileHasSb2Exempt(content: string): boolean {
  return SB2_EXEMPT_REGEX.test(content);
}

function auditPortal(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    if (!fileImportsRnModal(content)) continue;
    if (fileHasSb2Exempt(content)) continue;
    if (appliesPolicySpreadToPortalPanel(content)) continue;
    violations.push({
      check: 'SB2-portal',
      file: relative(ROOT, file),
      line: 1,
      message:
        "Portal panel missing MOBILE_CONTENT_WIDTH_STYLE or MOBILE_DIALOG_WIDTH_STYLE spread. Apply the policy spread to the visible panel style entry (sheet / card / cardWrapper / dialog / panel) — importing the constant is not sufficient (or add // sb2-exempt with justification).",
    });
  }
  return violations;
}

// ── SB2-magic-number ──────────────────────────────────────────────────
//
// For each non-comment `maxWidth: 420` or `maxWidth: 380` literal
// under components/, flag a violation. Those are the canonical
// policy-cap values defined in constants/styles.ts; using them inline
// bypasses the policy spread and would silently drift if the caps
// ever changed. The canonical literal definitions in styles.ts are
// excluded by file path. Same-line `// sb2-exempt` markers suppress
// individual lines (e.g. for a one-off bespoke width that genuinely
// can't adopt the policy).
//
// Other numeric maxWidth values (`maxWidth: 220`, `maxWidth: 120`,
// etc.) are LEGITIMATE local layout and remain allowed. This audit
// is the canonical-cap detector, not a generic maxWidth ban.
//
// Known limitation: only line-start comment prefixes are detected.
// An inline trailing comment like `const x = 5; // was maxWidth: 420`
// would match the regex. No such pattern exists in the repo today;
// if one is introduced, the same-line `// sb2-exempt` marker is the
// escape hatch.

function lineHasSb2Exempt(content: string, matchIndex: number): boolean {
  const lineEnd = content.indexOf('\n', matchIndex);
  const lineTail = content.slice(
    matchIndex,
    lineEnd === -1 ? content.length : lineEnd,
  );
  return SB2_EXEMPT_REGEX.test(lineTail);
}

/**
 * Scan one source string for magic-number violations, applying both the
 * comment-prefix and same-line `// sb2-exempt` filters. Exported solely
 * so the test can exercise the filter chain against synthetic source
 * without writing a temp file.
 */
export function scanMagicNumberViolations(
  content: string,
  fileRel: string,
): Violation[] {
  const out: Violation[] = [];
  MAXWIDTH_LITERAL_REGEX.lastIndex = 0;
  let match;
  while ((match = MAXWIDTH_LITERAL_REGEX.exec(content)) !== null) {
    const before = textBeforeMatchOnLine(content, match.index);
    if (COMMENT_PREFIX_REGEX.test(before)) continue;
    if (lineHasSb2Exempt(content, match.index)) continue;

    out.push({
      check: 'SB2-magic-number',
      file: fileRel,
      line: lineOf(content, match.index),
      message:
        'Literal maxWidth: 420 or maxWidth: 380 bypasses the canonical policy style — spread ...MOBILE_CONTENT_WIDTH_STYLE or ...MOBILE_DIALOG_WIDTH_STYLE instead (or add // sb2-exempt on this line with justification). Other numeric maxWidth values are allowed; only the canonical policy caps are flagged.',
    });
  }
  return out;
}

function auditMagicNumber(files: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    // Skip the canonical definitions file — that's where the literal
    // values are supposed to live.
    if (file === STYLES_CONSTANTS_FILE) continue;

    const content = readFileSync(file, 'utf8');
    violations.push(...scanMagicNumberViolations(content, relative(ROOT, file)));
  }
  return violations;
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  // Fluid-mode skip: same source as runtime styles. Print an
  // informational message so the gate output explains why no checks
  // ran — but DO NOT warn or fail. Every non-width audit remains
  // active; only SB1/SB2 content-width findings are skipped.
  if (CONTENT_WIDTH_MODE === 'fluid') {
    console.log(
      'ℹ SKIP: CONTENT_WIDTH_MODE is fluid — SB1/SB2 content-width findings are skipped. All other audits remain active.',
    );
    process.exit(0);
  }

  const files = walk(COMPONENTS_DIR);
  const violations: Violation[] = [
    ...auditPortal(files),
    ...auditMagicNumber(files),
  ];

  if (violations.length === 0) {
    console.log('✓ PASS: No portal-content-width violations found.');
    process.exit(0);
  }

  const byFile = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = byFile.get(v.file) ?? [];
    list.push(v);
    byFile.set(v.file, list);
  }

  console.error(
    `✗ FAIL: ${violations.length} portal-content-width violation(s) found (CONTENT_WIDTH_MODE = '${CONTENT_WIDTH_MODE}').\n`,
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

// When run as a script, execute main(). When imported (by the test),
// skip — the test calls the exported audit functions directly.
if (import.meta.main) {
  main();
}

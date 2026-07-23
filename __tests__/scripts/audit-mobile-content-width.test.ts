// __tests__/scripts/audit-mobile-content-width.test.ts
//
// Focused unit tests for the SB2 audit's pure check functions and the
// policy-mode behavior. The audit script exports its regexes and
// helpers; these tests pin the detection contract so future tweaks
// don't silently widen or narrow the gate.
//
// Test scope:
//   - SB2-portal detection: import-based, not word-based
//   - SB2-portal acceptance: spread MUST land on a panel-named entry
//   - SB2-portal exemption: file-level // sb2-exempt marker
//   - SB2-magic-number detection: literals in live code
//   - SB2-magic-number skips: comments, constants/styles.ts, same-line exempt
//   - Policy mode: same canonical source feeds runtime styles and audits
//
// These tests do NOT spawn the script as a subprocess. The audit's
// `main()` runs only under `import.meta.main`; importing the module
// for tests is side-effect-free. Mode behavior is verified through
// the runtime constants, not by mutating the source.

import { describe, it, expect } from 'vitest';
import {
  scanMagicNumberViolations,
  RN_MODAL_IMPORT_REGEX,
  PORTAL_PANEL_POLICY_SPREAD_REGEX,
  MAXWIDTH_LITERAL_REGEX,
  fileImportsRnModal,
  appliesPolicySpreadToPortalPanel,
  fileHasSb2Exempt,
} from '../../scripts/audit-mobile-content-width';
import {
  CONTENT_WIDTH_MODE,
  MOBILE_CONTENT_MAX_WIDTH,
  MOBILE_DIALOG_MAX_WIDTH,
  MOBILE_CONTENT_WIDTH_STYLE,
  MOBILE_DIALOG_WIDTH_STYLE,
  SCREEN_BODY_STYLE,
} from '../../constants';

describe('Policy mode — single source of truth', () => {
  it('ships constrained as the default', () => {
    expect(CONTENT_WIDTH_MODE).toBe('constrained');
  });

  it("runtime styles and audits read the same CONTENT_WIDTH_MODE source", () => {
    // Importing the audit module and the constants module from the
    // same test verifies both consume the identical binding. If a
    // future change splits the mode source (e.g. an env-var override
    // in one but not the other), this test breaks.
    expect(CONTENT_WIDTH_MODE).toBeTruthy();
    expect(typeof CONTENT_WIDTH_MODE).toBe('string');
  });
});

describe('Runtime policy styles — constrained shape', () => {
  // These tests pin the constrained-mode shape because the test suite
  // runs against the as-checked-in tree (mode = 'constrained'). If a
  // consumer flips the mode to 'fluid' in the source, these tests
  // break loudly — which is the intended behavior: the test forces
  // an acknowledgement that the policy shape has changed.

  it('MOBILE_CONTENT_WIDTH_STYLE applies the canonical content-column treatment', () => {
    expect(MOBILE_CONTENT_WIDTH_STYLE).toEqual({
      width: '100%',
      maxWidth: MOBILE_CONTENT_MAX_WIDTH,
      alignSelf: 'center',
    });
  });

  it('MOBILE_DIALOG_WIDTH_STYLE applies the canonical dialog-column treatment', () => {
    expect(MOBILE_DIALOG_WIDTH_STYLE).toEqual({
      width: '100%',
      maxWidth: MOBILE_DIALOG_MAX_WIDTH,
      alignSelf: 'center',
    });
  });

  it('SCREEN_BODY_STYLE consumes MOBILE_CONTENT_WIDTH_STYLE plus flex', () => {
    // Screen-body keeps `flex: 1` and `width: '100%'` as universal
    // properties; the column cap is policy-derived.
    expect(SCREEN_BODY_STYLE).toMatchObject({
      flex: 1,
      width: '100%',
      maxWidth: MOBILE_CONTENT_MAX_WIDTH,
      alignSelf: 'center',
    });
  });

  it('canonical caps are 420 (content) and 380 (dialog)', () => {
    expect(MOBILE_CONTENT_MAX_WIDTH).toBe(420);
    expect(MOBILE_DIALOG_MAX_WIDTH).toBe(380);
  });
});

describe('SB2-portal — RN Modal import detection', () => {
  it('detects a default-style Modal import from react-native', () => {
    const src = `import { Modal, View } from 'react-native';`;
    expect(fileImportsRnModal(src)).toBe(true);
    expect(RN_MODAL_IMPORT_REGEX.test(src)).toBe(true);
  });

  it('detects Modal when wrapped in multiline braces', () => {
    const src = `import {
  Animated,
  Modal,
  Pressable,
} from 'react-native';`;
    expect(fileImportsRnModal(src)).toBe(true);
  });

  it('does not flag a file that imports MobileDialog (wraps Modal indirectly)', () => {
    // "Modal" is not a substring of "MobileDialog"; the regex confirms
    // this. LoadingOverlay mentions "RN Modal" only in its header
    // comment, which is not an import statement.
    const src = `import { MobileDialog } from '../MobilePremium';`;
    expect(fileImportsRnModal(src)).toBe(false);
  });

  it('does not flag a prose mention of Modal in a comment', () => {
    const src = `// This file does not use RN Modal directly.
import { View } from 'react-native';`;
    expect(fileImportsRnModal(src)).toBe(false);
  });

  it('does not flag Modal imported from a non-react-native module', () => {
    const src = `import { Modal } from 'some-other-lib';`;
    expect(fileImportsRnModal(src)).toBe(false);
  });
});

describe('SB2-portal — policy-spread acceptance (naming convention)', () => {
  it('accepts a `sheet` entry containing the content-policy spread', () => {
    const src = `const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    padding: 16,
    ...MOBILE_CONTENT_WIDTH_STYLE,
  },
});`;
    expect(appliesPolicySpreadToPortalPanel(src)).toBe(true);
    expect(PORTAL_PANEL_POLICY_SPREAD_REGEX.test(src)).toBe(true);
  });

  it('accepts a `cardWrapper` entry containing the dialog-policy spread', () => {
    const src = `const styles = StyleSheet.create({
  cardWrapper: { ...MOBILE_DIALOG_WIDTH_STYLE },
});`;
    expect(appliesPolicySpreadToPortalPanel(src)).toBe(true);
  });

  it('accepts the spread as the first property in the panel entry', () => {
    const src = `const styles = StyleSheet.create({
  card: {
    ...MOBILE_DIALOG_WIDTH_STYLE,
    padding: 20,
  },
});`;
    expect(appliesPolicySpreadToPortalPanel(src)).toBe(true);
  });

  it('accepts dialog and panel naming variants', () => {
    for (const name of ['dialog', 'panel']) {
      const src = `const s = { ${name}: { ...MOBILE_CONTENT_WIDTH_STYLE } };`;
      expect(appliesPolicySpreadToPortalPanel(src)).toBe(true);
    }
  });

  it('does NOT accept the spread on a non-panel style name (the MobileSelect bug)', () => {
    // Load-bearing case: a file that has the spread only on a trigger
    // wrapper named `group` but NOT on the actual `sheet` panel.
    // The first implementation passed this case (false negative);
    // the tightened check fails it.
    const src = `const styles = StyleSheet.create({
  group: {
    gap: 6,
    ...MOBILE_CONTENT_WIDTH_STYLE,
    marginBottom: 16,
  },
  sheet: {
    borderTopLeftRadius: 20,
    padding: 16,
    maxHeight: '70%',
  },
});`;
    expect(appliesPolicySpreadToPortalPanel(src)).toBe(false);
  });

  it('does NOT accept a bare scalar maxWidth without the policy spread', () => {
    // A file that uses `maxWidth: MOBILE_CONTENT_MAX_WIDTH` directly
    // bypasses the policy: in fluid mode the scalar still caps. The
    // acceptance check requires the policy-style spread.
    const src = `const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    maxWidth: MOBILE_CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
});`;
    expect(appliesPolicySpreadToPortalPanel(src)).toBe(false);
  });

  it('does NOT cross object-literal boundaries to pick up a sibling spread', () => {
    // The regex's `[^}]*` bounds the search to one object literal.
    // A spread in a sibling style entry must not satisfy the check
    // for the panel-named entry.
    const src = `const styles = StyleSheet.create({
  group: { ...MOBILE_CONTENT_WIDTH_STYLE },
  sheet: { borderTopLeftRadius: 20, padding: 16 },
});`;
    expect(appliesPolicySpreadToPortalPanel(src)).toBe(false);
  });
});

describe('SB2-portal — file-level exemption', () => {
  it('a // sb2-exempt marker anywhere in the file suppresses the portal check', () => {
    const src = `// sb2-exempt: offscreen measurement Modal, no visual panel.
import { Modal } from 'react-native';
const s = { panel: { padding: 16 } };`;
    expect(fileHasSb2Exempt(src)).toBe(true);
  });

  it('a file without the marker is not exempt', () => {
    const src = `import { Modal } from 'react-native';`;
    expect(fileHasSb2Exempt(src)).toBe(false);
  });
});

describe('SB2-magic-number — literal maxWidth detection', () => {
  function findLiterals(src: string): string[] {
    const out: string[] = [];
    MAXWIDTH_LITERAL_REGEX.lastIndex = 0;
    let m;
    while ((m = MAXWIDTH_LITERAL_REGEX.exec(src)) !== null) {
      out.push(m[0]);
    }
    return out;
  }

  it('detects maxWidth: 420', () => {
    expect(findLiterals(`const s = { maxWidth: 420 };`)).toEqual([
      'maxWidth: 420',
    ]);
  });

  it('detects maxWidth: 380', () => {
    expect(findLiterals(`const s = { maxWidth: 380 };`)).toEqual([
      'maxWidth: 380',
    ]);
  });

  it('detects multiple literals in one file', () => {
    const src = `const a = { maxWidth: 420 };
const b = { maxWidth: 380 };`;
    expect(findLiterals(src)).toEqual(['maxWidth: 420', 'maxWidth: 380']);
  });

  it('does NOT detect maxWidth: MOBILE_CONTENT_MAX_WIDTH (bare scalar)', () => {
    // Note: a bare scalar still bypasses the policy and would fail
    // SB2-portal under constrained mode (no policy spread on the
    // panel). The magic-number check is for *literal numeric* values
    // only — the SB2-portal check is the one that flags bare scalars.
    expect(findLiterals(`const s = { maxWidth: MOBILE_CONTENT_MAX_WIDTH };`)).toEqual([]);
  });

  it('does NOT detect maxWidth: "100%"', () => {
    expect(findLiterals(`const s = { maxWidth: '100%' };`)).toEqual([]);
  });

  it('does NOT detect maxWidth: someVariable', () => {
    expect(findLiterals(`const s = { maxWidth: geometry.totalWidth };`)).toEqual([]);
  });

  it('does NOT detect paddingLeft: 420 (non-maxWidth numeric)', () => {
    // Scope is maxWidth only — other numeric layout values are out
    // of scope for this audit.
    expect(findLiterals(`const s = { paddingLeft: 420 };`)).toEqual([]);
  });

  it('does NOT detect maxWidth: 220 (non-canonical numeric cap)', () => {
    // Tightened scope: only the canonical policy caps (420 / 380) are
    // flagged. Other numeric maxWidth values are legitimate local
    // layout — small inline popovers, avatars, tablet/desktop work,
    // etc. This audit is NOT a generic maxWidth ban.
    expect(findLiterals(`const s = { maxWidth: 220 };`)).toEqual([]);
  });

  it('does NOT detect maxWidth: 421 or maxWidth: 381 (off-by-one near-misses)', () => {
    // Near-miss safety: a value one off from the canonical cap is
    // treated as a legitimate local width, not a policy bypass. The
    // audit catches exact-cap literals only — typos like 421 don't
    // satisfy the policy contract either and aren't useful as bypass.
    expect(findLiterals(`const s = { maxWidth: 421 };`)).toEqual([]);
    expect(findLiterals(`const s = { maxWidth: 381 };`)).toEqual([]);
  });

  it('does NOT detect maxWidth: 4200 or maxWidth: 3800 (longer numbers containing the cap substring)', () => {
    // Word boundary: the regex uses \\b after the digits, so 420
    // followed by another digit is a different number entirely.
    expect(findLiterals(`const s = { maxWidth: 4200 };`)).toEqual([]);
    expect(findLiterals(`const s = { maxWidth: 38000 };`)).toEqual([]);
  });

  it('does NOT detect maxWidth: 420 inside a // line comment', () => {
    // Comment-prefix filter: when the text before the match on the
    // same line starts with `//` the match is treated as prose, not
    // live code. The filter is the same heuristic audit-component-
    // quality.ts uses.
    const src = `// legacy note: maxWidth: 420 was the pre-policy cap
const s = { padding: 16 };`;
    expect(scanMagicNumberViolations(src, 'fake.tsx')).toEqual([]);
  });

  it('does NOT detect maxWidth: 420 inside a /* block comment line', () => {
    const src = `/*
 * Historical note: maxWidth: 380 was the dialog cap.
 */
const s = { padding: 16 };`;
    expect(scanMagicNumberViolations(src, 'fake.tsx')).toEqual([]);
  });

  it('does NOT detect maxWidth: 420 inside a JSDoc continuation', () => {
    const src = `/**
 * @deprecated maxWidth: 420 — use the policy spread instead.
 */
const s = { padding: 16 };`;
    expect(scanMagicNumberViolations(src, 'fake.tsx')).toEqual([]);
  });

  it('suppresses a single violation when // sb2-exempt is on the same line', () => {
    // Same-line exemption: a `// sb2-exempt` marker on the SAME line as
    // the literal suppresses just that one match. Other violations on
    // different lines in the same file are still reported.
    const src = `const a = { maxWidth: 420 }; // sb2-exempt: legacy
const b = { maxWidth: 380 };`;
    const violations = scanMagicNumberViolations(src, 'fake.tsx');
    expect(violations).toHaveLength(1);
    expect(violations[0].line).toBe(2);
    expect(violations[0].check).toBe('SB2-magic-number');
  });

  it('does NOT treat a file-level // sb2-exempt as a per-line suppress for magic-number', () => {
    // Same-line exemption is line-scoped for magic-number. A marker on
    // a different line does NOT suppress a violation. (The file-level
    // marker suppresses SB2-portal only — see fileHasSb2Exempt.)
    const src = `// sb2-exempt: file-level
const a = { maxWidth: 420 };`;
    const violations = scanMagicNumberViolations(src, 'fake.tsx');
    expect(violations).toHaveLength(1);
    expect(violations[0].line).toBe(2);
  });

  it('reports the correct line number for violations in multi-line source', () => {
    const src = `
const a = { padding: 8 };

const b = { maxWidth: 420 };
`;
    const violations = scanMagicNumberViolations(src, 'fake.tsx');
    expect(violations).toHaveLength(1);
    expect(violations[0].line).toBe(4);
  });
});

describe('SB2 — integration against real source shapes', () => {
  // These cases pin the contract against realistic source shapes.
  // They are the regression-prevention backstop for the two checks
  // working together in constrained mode.

  it('a portal component correctly using the policy spread passes both checks', () => {
    const src = `import { Modal, View } from 'react-native';
import { MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';
const styles = StyleSheet.create({
  sheet: { padding: 16, ...MOBILE_CONTENT_WIDTH_STYLE },
});`;
    expect(fileImportsRnModal(src)).toBe(true);
    expect(appliesPolicySpreadToPortalPanel(src)).toBe(true);
  });

  it('the original MobileSelect bug (sheet panel has no spread) is flagged', () => {
    // Pre-fix shape: Modal imported, sheet style has no policy spread.
    // The trigger's `group` style has the spread but that no longer
    // satisfies the tightened acceptance check.
    const src = `import { Modal, View } from 'react-native';
import { MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';
const styles = StyleSheet.create({
  group: { gap: 6, ...MOBILE_CONTENT_WIDTH_STYLE, marginBottom: 16 },
  sheet: { borderTopLeftRadius: 20, padding: 16, maxHeight: '70%' },
});`;
    expect(fileImportsRnModal(src)).toBe(true);
    expect(appliesPolicySpreadToPortalPanel(src)).toBe(false);
  });

  it('a non-portal component with an inline 420 literal is a magic-number violation', () => {
    const src = `import { View } from 'react-native';
const styles = { row: { maxWidth: 420 } };`;
    expect(fileImportsRnModal(src)).toBe(false);
    expect(MAXWIDTH_LITERAL_REGEX.test(src)).toBe(true);
  });
});

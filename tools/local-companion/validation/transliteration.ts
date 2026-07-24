// validation/transliteration.ts
// Generic romanization-plausibility check. The engine reads
// `profile.transliteration.charMap` to build the expected Latin-letter
// multiset from the native surfaceForm, compares it to the model's
// transliteration, and emits a mismatch when the symmetric difference exceeds
// the profile's tolerance.
//
// The algorithm is language-agnostic. The romanization table (ISO 9, BGN/PCGN,
// ISO 9985, ...) is pure data in each profile. No function here references a
// specific scheme.

import type { Rejection, LanguageProfile } from './types';

/** Build a per-character count of Latin letters expected from romanizing the
 *  native surfaceForm via the profile's charMap. Lowercase only; chars not in
 *  the charMap are dropped (apostrophes, spaces, separators). */
function expectedMultiset(
  surfaceForm: string,
  charMap: Record<string, string>,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const ch of surfaceForm.toLowerCase()) {
    const mapped = charMap[ch];
    if (mapped === undefined) continue;
    for (const latin of mapped) {
      m.set(latin, (m.get(latin) ?? 0) + 1);
    }
  }
  return m;
}

/** Build a per-character count of Latin letters in the model's transliteration.
 *  Apostrophes, hyphens, spaces, and any non-[a-z] char are dropped (these are
 *  soft-sign markers or separators the romanization spec allows to vary). */
function actualMultiset(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const ch of s.toLowerCase()) {
    if (ch >= 'a' && ch <= 'z') {
      m.set(ch, (m.get(ch) ?? 0) + 1);
    }
  }
  return m;
}

/** Multiset symmetric-difference count. 0 means the multisets are equal. */
function multisetDiff(
  a: Map<string, number>,
  b: Map<string, number>,
): number {
  const keys = new Set<string>([...a.keys(), ...b.keys()]);
  let diff = 0;
  for (const k of keys) {
    diff += Math.abs((a.get(k) ?? 0) - (b.get(k) ?? 0));
  }
  return diff;
}

/** Profile-driven transliteration plausibility check. Emits:
 *  - TRANSLIT_NON_LATIN when the transliteration contains no Latin letters.
 *  - TRANSLIT_MISMATCH when the Latin-letter multiset diverges from the
 *    romanization of the surfaceForm beyond the profile's tolerance.
 *
 *  Returns [] when the surfaceForm has no native-script chars (the script
 *  check handles that case) or transliteration is required-but-missing. The
 *  engine only invokes this when transliteration is required AND present. */
export function checkTransliteration(
  surfaceForm: string,
  transliteration: string,
  profile: LanguageProfile,
): Rejection[] {
  const expected = expectedMultiset(surfaceForm, profile.transliteration.charMap);
  if (expected.size === 0) return []; // surfaceForm has no native chars; script check handles

  const actual = actualMultiset(transliteration);
  if (actual.size === 0) {
    return [
      {
        code: 'TRANSLIT_NON_LATIN',
        reason: `transliteration "${transliteration}" contains no Latin letters.`,
        severity: 'reject',
      },
    ];
  }

  const tolerance = profile.transliteration.toleranceFor?.(surfaceForm) ?? 0;
  const diff = multisetDiff(expected, actual);
  if (diff > tolerance) {
    return [
      {
        code: 'TRANSLIT_MISMATCH',
        reason: `transliteration "${transliteration}" does not match ${profile.transliteration.schemeName} of surfaceForm "${surfaceForm}" (char-diff=${diff}, tolerance=${tolerance}).`,
        severity: 'reject',
      },
    ];
  }
  return [];
}

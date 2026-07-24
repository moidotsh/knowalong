// validation/scriptChecks.ts
// Structural + script-composition checks. The structural layer is fully
// language-agnostic (shape, enum, placeholder, ASCII-junk). The script layer
// is profile-driven: it reads `nativeScriptPattern` / `requiresNativeScript`
// / `forbiddenLatinWhenNative` from the profile and applies them generically.
//
// No function here references a language code, a script name, or a
// romanization table. Those live in profiles/.

import type {
  Rejection,
  ValidatedEntry,
  LanguageProfile,
} from './types';

/** DB-level realization_type enum (migration 00003). Universal across all
 *  languages — a structural constant, not a profile field. Keep in lockstep
 *  with REALIZATION_TYPE_DB_VALUES in prompts/clccGeneration.ts. */
export const ALLOWED_REALIZATION_TYPES: readonly string[] = [
  'word',
  'phrase',
  'construction',
  'feature',
  'morpheme',
];

/** Surrogate tokens the model emits when it has no real answer. Universal
 *  across languages. */
const PLACEHOLDER_TOKENS: ReadonlySet<string> = new Set([
  '-',
  '—',
  'n/a',
  'na',
  'none',
  'null',
  'todo',
  'tbd',
  '?',
  '???',
  '…',
  '...',
  'placeholder',
]);

/** ASCII-only, alphanumeric + apostrophes + hyphens, length>=4. Catches
 *  "likedat", "likedat'", "need-at" — the hybrid English-stem + Latin-suffix
 *  failure mode small local models emit for non-Latin concepts. The
 *  apostrophe/hyphen allowance closes the gap where "likedat'" slipped past
 *  the older `/^[A-Za-z][A-Za-z0-9]{3,}$/` regex. */
const HYBRID_JUNK_PATTERN = /^[A-Za-z][A-Za-z0-9''\-]{3,}$/;

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_TOKENS.has(value.trim().toLowerCase());
}

/** Structural checks shared by every language. Empty/placeholder/enum/code
 *  defects land here; script-specific defects land in checkScriptComposition. */
export function checkStructural(
  entry: ValidatedEntry,
  knownConceptCodes: ReadonlySet<string>,
): Rejection[] {
  const rejections: Rejection[] = [];

  if (!knownConceptCodes.has(entry.coreConceptCode)) {
    rejections.push({
      code: 'STRUCT_UNKNOWN_CONCEPT',
      reason: `coreConceptCode "${entry.coreConceptCode}" is not in the request/catalog.`,
      severity: 'reject',
    });
  }

  if (!ALLOWED_REALIZATION_TYPES.includes(entry.realizationType)) {
    rejections.push({
      code: 'STRUCT_BAD_REALIZATION_TYPE',
      reason: `realizationType "${entry.realizationType}" is not in the allowed enum (word|phrase|construction|feature|morpheme).`,
      severity: 'reject',
    });
  }

  // surfaceForm: empty → placeholder → hybrid-junk.
  const surface = entry.surfaceForm?.trim() ?? '';
  if (surface.length === 0) {
    rejections.push({
      code: 'STRUCT_EMPTY_FIELD',
      reason: 'surfaceForm is empty.',
      severity: 'reject',
    });
  } else if (isPlaceholder(surface)) {
    rejections.push({
      code: 'STRUCT_PLACEHOLDER',
      reason: `surfaceForm "${surface}" is a placeholder token.`,
      severity: 'reject',
    });
  } else if (HYBRID_JUNK_PATTERN.test(surface)) {
    rejections.push({
      code: 'STRUCT_HYBRID_JUNK_ASCII',
      reason: `surfaceForm "${surface}" looks like ASCII-only hybrid junk (real non-Latin text contains native script).`,
      severity: 'reject',
    });
  }

  // gloss
  const gloss = entry.gloss?.trim() ?? '';
  if (gloss.length === 0) {
    rejections.push({
      code: 'STRUCT_EMPTY_FIELD',
      reason: 'gloss is empty.',
      severity: 'reject',
    });
  } else if (isPlaceholder(gloss)) {
    rejections.push({
      code: 'STRUCT_PLACEHOLDER',
      reason: `gloss "${gloss}" is a placeholder token.`,
      severity: 'reject',
    });
  }

  // grammaticalNote
  const note = entry.grammaticalNote?.trim() ?? '';
  if (note.length === 0) {
    rejections.push({
      code: 'STRUCT_EMPTY_FIELD',
      reason: 'grammaticalNote is empty.',
      severity: 'reject',
    });
  } else if (isPlaceholder(note)) {
    rejections.push({
      code: 'STRUCT_PLACEHOLDER',
      reason: `grammaticalNote "${note}" is a placeholder token.`,
      severity: 'reject',
    });
  }

  return rejections;
}

/** Latin-letter test used by the mixed-script check. Apostrophes, hyphens,
 *  and digits do not count — only [A-Za-z] does. */
const LATIN_LETTER_PATTERN = /[A-Za-z]/;

/** Profile-driven script composition check. Emits:
 *  - SCRIPT_NONE_NATIVE when the profile requires native script and the
 *    surfaceForm has none.
 *  - SCRIPT_MIXED when the profile forbids Latin alongside native script and
 *    the surfaceForm contains both.
 *
 *  Skipped for empty/placeholder surfaceForms (structural check already
 *  flagged them) to avoid noisy double-flagging. */
export function checkScriptComposition(
  surfaceForm: string,
  profile: LanguageProfile,
): Rejection[] {
  const trimmed = surfaceForm?.trim() ?? '';
  if (trimmed.length === 0) return [];
  if (PLACEHOLDER_TOKENS.has(trimmed.toLowerCase())) return [];

  const rejections: Rejection[] = [];
  const hasNative = profile.nativeScriptPattern.test(trimmed);

  if (profile.requiresNativeScript && !hasNative) {
    rejections.push({
      code: 'SCRIPT_NONE_NATIVE',
      reason: `surfaceForm "${trimmed}" contains no ${profile.nativeScriptName} characters (real ${profile.languageCode} realizations use ${profile.nativeScriptName}).`,
      severity: 'reject',
    });
  }

  if (profile.forbiddenLatinWhenNative && hasNative && LATIN_LETTER_PATTERN.test(trimmed)) {
    rejections.push({
      code: 'SCRIPT_MIXED',
      reason: `surfaceForm "${trimmed}" mixes ${profile.nativeScriptName} and Latin scripts (real ${profile.languageCode} words use one script only).`,
      severity: 'reject',
    });
  }

  return rejections;
}

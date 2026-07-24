// validation/engine.ts
// The language-agnostic validation runner. One shared engine, one shared
// rejection-code system. The Russian profile is fully populated; future
// language profiles reuse this engine without modification.
//
// No function here references a language code, a script name, a romanization
// table, or any language-specific datum. The engine is pure mechanics; the
// profile is the data.

import type {
  LanguageProfile,
  Rejection,
  ValidatedEntry,
  ValidationResult,
} from './types';
import { checkStructural, checkScriptComposition } from './scriptChecks';
import { checkTransliteration } from './transliteration';
import { checkGrammarNote } from './grammarChecks';
import { PROFILE_BY_CODE } from './profiles';

/** Per-realizationType shape check (e.g. realizationType='word' rejects
 *  whitespace). Reads profile.realizationTypeConstraints generically. */
function checkRealizationTypeShape(
  entry: ValidatedEntry,
  profile: LanguageProfile,
): Rejection[] {
  const rejections: Rejection[] = [];
  for (const constraint of profile.realizationTypeConstraints) {
    if (entry.realizationType !== constraint.realizationType) continue;
    if (constraint.rejectsSurfaceFormPattern.test(entry.surfaceForm)) {
      rejections.push({
        code: 'REALIZATION_TYPE_SHAPE',
        reason: constraint.reason,
        severity: 'reject',
      });
    }
  }
  return rejections;
}

/** Validate one realization entry against a language profile. Walks the
 *  configured checks in deterministic order and returns a structured result.
 *  Adding a language is a profile-data change only — this function never
 *  needs editing for a new language. */
export function validateRealizationEntry(
  entry: ValidatedEntry,
  profile: LanguageProfile,
  knownConceptCodes: ReadonlySet<string>,
): ValidationResult {
  const rejections: Rejection[] = [];

  // 1. Structural (same for all languages).
  rejections.push(...checkStructural(entry, knownConceptCodes));

  // 2. Script composition (profile-driven).
  rejections.push(...checkScriptComposition(entry.surfaceForm, profile));

  // 3. Transliteration (profile-driven; only when required and present).
  if (profile.transliteration.required && entry.transliteration && entry.transliteration.trim().length > 0) {
    rejections.push(
      ...checkTransliteration(entry.surfaceForm, entry.transliteration, profile),
    );
  }

  // 4. Grammar-note contradictions (profile-driven; no-op when empty).
  rejections.push(...checkGrammarNote(entry.grammaticalNote, profile));

  // 5. Realization-type shape (profile-driven).
  rejections.push(...checkRealizationTypeShape(entry, profile));

  if (rejections.length === 0) {
    return { verdict: 'valid', rejections: [], skipReview: false };
  }
  return { verdict: 'malformed', rejections, skipReview: true };
}

/** Look up a language profile by code. Returns undefined for unsupported
 *  languages; callers fall back to structural-only validation. */
export function getProfile(languageCode: string): LanguageProfile | undefined {
  return PROFILE_BY_CODE[languageCode];
}

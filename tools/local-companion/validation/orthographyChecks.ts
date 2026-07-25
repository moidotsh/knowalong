// validation/orthographyChecks.ts
// Profile-driven orthography check. One of the profile-driven engine checks
// alongside checkScriptComposition and checkGrammarNote. No language code
// referenced here — the profile is the data.
//
// Applies to surfaceForm (Stage 2 realizations, via validateRealizationEntry)
// AND to sourceText (Stage 3 example sentences, via direct call from the
// pipeline's example-row filter — see pipelines/clccGeneration.ts).

import type { LanguageProfile, Rejection } from './types';

/** Returns one ORTHOGRAPHY_VIOLATION rejection per constraint whose
 *  rejectsCharPattern matches at least one character in the text. The
 *  matched character + its codepoint are interpolated into the reason so
 *  the model/operator sees exactly which char tripped the rule.
 *
 *  No-op when the profile has no orthographyConstraints. */
export function checkOrthography(
  text: string,
  profile: LanguageProfile,
): Rejection[] {
  if (!profile.orthographyConstraints || profile.orthographyConstraints.length === 0) {
    return [];
  }
  const rejections: Rejection[] = [];
  for (const constraint of profile.orthographyConstraints) {
    const match = text.match(constraint.rejectsCharPattern);
    if (match) {
      rejections.push({
        code: 'ORTHOGRAPHY_VIOLATION',
        reason: `${constraint.reason} (matched: "${match[0]}" U+${match[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}).`,
        severity: 'reject',
      });
    }
  }
  return rejections;
}

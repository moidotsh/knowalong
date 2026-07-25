// validation/profiles/bs-latn.ts
// BCS Latin (Bosnian/Croatian/Serbian Latin) validation profile. Latin
// script with Gaj's orthography (č, ć, đ, š, ž, dž, lj, nj) — no
// transliteration scheme (identity passthrough; transliteration IS the
// surface form). Grammar contradiction rules are sourced from bcs-shared.ts
// (script-independent BCS grammar).

import type { LanguageProfile } from '../types';
import { bcsSharedContradictionRules } from './bcs-shared';

export const BS_LATN_PROFILE: LanguageProfile = {
  languageCode: 'bs-latn',
  nativeScriptName: 'Gaj Latinica',
  // Basic Latin + Latin-1 Supplement + Latin Extended-A covers Gaj's
  // specific letters (č U+010D, ć U+0107, đ U+0111, š U+0161, ž U+017E
  // and their uppercase variants, all in U+0100-U+017F).
  nativeScriptPattern: /[\u0041-\u005A\u0061-\u007A\u00C0-\u017F]/,
  // Latin script — advisory-only (do not reject a clean Latin surfaceForm).
  requiresNativeScript: false,
  // No mixed-script rule — Latin is canonical.
  forbiddenLatinWhenNative: false,

  transliteration: {
    required: false,
    schemeName: 'identity',
    charMap: {},
    toleranceFor: () => 0,
  },

  contradictionRules: bcsSharedContradictionRules(),

  realizationTypeConstraints: [
    {
      realizationType: 'word',
      rejectsSurfaceFormPattern: /\s/,
      reason: 'realizationType "word" but surfaceForm contains whitespace (use "phrase" or "construction" for multi-token forms).',
    },
  ],
};

// validation/profiles/fr.ts
// French validation profile — minimal stub. French uses the Latin script with
// diacritics, so transliteration is identity (not required) and the script
// check is advisory-only. Ships the word-shape constraint so the engine runs
// without crashing for fr. Grammar contradiction rules land as a deliberate
// paired change when fr CLCC is promoted.

import type { LanguageProfile } from '../types';

export const FR_PROFILE: LanguageProfile = {
  languageCode: 'fr',
  nativeScriptName: 'Latin',
  // Latin block incl. Latin-1 Supplement diacritics (À-ÿ).
  nativeScriptPattern: /[\u0041-\u005A\u0061-\u007A\u00C0-\u00FF]/,
  // French is Latin-script; the script check is advisory-only (do not reject
  // a clean Latin surfaceForm for "no native script").
  requiresNativeScript: false,
  // No mixed-script rule — French legitimately uses only Latin.
  forbiddenLatinWhenNative: false,

  transliteration: {
    required: false,
    schemeName: 'identity',
    charMap: {},
    toleranceFor: () => 0,
  },

  contradictionRules: [],

  realizationTypeConstraints: [
    {
      realizationType: 'word',
      rejectsSurfaceFormPattern: /\s/,
      reason: 'realizationType "word" but surfaceForm contains whitespace (use "phrase" or "construction" for multi-token forms).',
    },
  ],
};

// validation/profiles/fa.ts
// Persian validation profile — minimal stub. Ships script identity + the
// word-shape constraint so the engine runs without crashing for fa. Full
// hardening (BGN/PCGN charMap, grammar contradiction rules) lands as a
// deliberate paired change when fa CLCC is promoted. The engine is already
// ready; only this data needs filling in.

import type { LanguageProfile } from '../types';

export const FA_PROFILE: LanguageProfile = {
  languageCode: 'fa',
  nativeScriptName: 'Persian-Arabic',
  // Arabic block + Arabic Presentation Forms-A/B cover Persian/Arabic script.
  nativeScriptPattern: /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/,
  requiresNativeScript: true,
  // Persian does not mix Latin; flag mixed-script surfaceForms.
  forbiddenLatinWhenNative: true,

  transliteration: {
    required: true,
    schemeName: 'BGN/PCGN',
    // Empty charMap → the transliteration check returns [] (no native chars
    // mapped) and is effectively a no-op until the BGN/PCGN table lands.
    // The script check still enforces Persian-Arabic surfaceForms.
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

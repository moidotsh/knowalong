// validation/types.ts
// Shared type vocabulary for the profile-driven validation framework.
//
// The engine (engine.ts) is language-agnostic: it walks a LanguageProfile's
// configured checks and emits structured Rejections. Every language-specific
// datum (script ranges, romanization tables, POS-vs-property exclusions) lives
// in a profile under validation/profiles/, never in the engine.

/** Structured rejection code. Stable, language-general handles used in the
 *  Stage 2 retry-feedback prompt and the operator drop log. Adding a code is
 *  an additive change; existing codes never change meaning. */
export type RejectionCode =
  // Structural (language-agnostic)
  | 'STRUCT_UNKNOWN_CONCEPT'
  | 'STRUCT_BAD_REALIZATION_TYPE'
  | 'STRUCT_PLACEHOLDER'
  | 'STRUCT_HYBRID_JUNK_ASCII'
  | 'STRUCT_EMPTY_FIELD'
  // Script composition (profile-driven)
  | 'SCRIPT_NONE_NATIVE'
  | 'SCRIPT_MIXED'
  // Transliteration (profile-driven)
  | 'TRANSLIT_NON_LATIN'
  | 'TRANSLIT_MISMATCH'
  // Grammar-note contradictions (profile-driven)
  | 'GRAMMAR_POS_PROP_CONTRADICTION'
  | 'GRAMMAR_POS_COMBO_CONTRADICTION'
  | 'GRAMMAR_MULTI_TENSE'
  | 'GRAMMAR_MULTI_PERSON'
  // Realization-type family shape (profile-driven)
  | 'REALIZATION_TYPE_SHAPE';

/** A single rejection emitted by the engine for one entry. */
export interface Rejection {
  code: RejectionCode;
  reason: string;
  /** 'reject' drops the row; 'warn'/'review' are reserved for future soft
   *  signals — the engine treats all configured rules as 'reject' in this
   *  checkpoint. */
  severity: 'reject' | 'warn' | 'review';
}

/** Aggregate result of validating one entry against a profile. */
export interface ValidationResult {
  verdict: 'valid' | 'malformed';
  rejections: Rejection[];
  /** True when the row should skip downstream review entirely. The engine
   *  sets this whenever at least one rejection fired. */
  skipReview: boolean;
}

/** The subset of a generated realization row the engine inspects. Keeping
 *  this narrow lets the pipeline and the Studio panel feed the same engine
 *  without binding to either's full row shape. */
export interface ValidatedEntry {
  coreConceptCode: string;
  realizationType: string;
  surfaceForm: string;
  transliteration?: string;
  gloss: string;
  grammaticalNote: string;
}

// ── Profile shape ──────────────────────────────────────────────────────

/** A per-language validation profile. The engine reads this data; it never
 *  references language codes, script names, or romanization tables directly.
 *  Adding a language is a profile-data change only. */
export interface LanguageProfile {
  languageCode: string;
  nativeScriptName: string; // 'Cyrillic' / 'Latin' / 'Persian-Arabic'
  /** Matches at least one native-script character in a surfaceForm. */
  nativeScriptPattern: RegExp;
  /** When false, the SCRIPT_NONE_NATIVE check is advisory-only (skipped). */
  requiresNativeScript: boolean;
  /** When true alongside requiresNativeScript, the SCRIPT_MIXED check fires
   *  on surfaceForms that mix native + Latin script. Set false for languages
   *  where both scripts are legitimately acceptable (e.g. bs). */
  forbiddenLatinWhenNative?: boolean;

  transliteration: {
    /** When false, the engine skips the transliteration check entirely. */
    required: boolean;
    schemeName: string; // 'ISO 9:1995' / 'BGN/PCGN' / 'identity'
    /** Romanization table: native char → Latin expansion. */
    charMap: Record<string, string>;
    /** Per-surface-form tolerance bonus added to the multiset-diff threshold
     *  (e.g. ё→yo costs 3 extra per ё for ru). */
    toleranceFor?: (surfaceForm: string) => number;
  };

  /** Grammar-note contradiction rules. Engine dispatches on `kind`. Empty
   *  array is valid — the engine skips grammar checks gracefully. */
  contradictionRules: ContradictionRule[];

  /** Per-realizationType shape constraints. Language-neutral in practice but
   *  profile-driven so a future language can override or extend. */
  realizationTypeConstraints: RealizationTypeConstraint[];
}

export type ContradictionRule =
  | PosPropContradiction
  | PosComboContradiction
  | ExclusiveCategoryContradiction;

/** A part-of-speech token that cannot co-occur with any of `forbiddenProps`.
 *  Example: "infinitive" cannot carry tense/person/number/case. */
export interface PosPropContradiction {
  kind: 'pos-prop';
  posToken: string;
  forbiddenProps: string[];
  /** Terms that exempt the row from this rule (e.g. 'participle' exempts a
   *  verb from the case+number rule). */
  unlessHas?: string[];
  /** "${pos}" and "${prop}" are substituted by the engine. */
  reasonTemplate: string;
}

/** A part-of-speech token that cannot carry a combo drawn one-from-each of
 *  `requiresOneFromEach`. Example: a finite verb cannot carry case+number. */
export interface PosComboContradiction {
  kind: 'pos-combo';
  posToken: string;
  requiresOneFromEach: string[][];
  unlessHas?: string[];
  reason: string;
}

/** A set of mutually-exclusive terms within one grammatical category.
 *  Example: two distinct tenses in one note is a contradiction. */
export interface ExclusiveCategoryContradiction {
  kind: 'exclusive-category';
  category: string; // 'tense' / 'person'
  terms: string[];
  /** "${matched}" is substituted by the engine with the matched terms. */
  reasonTemplate: string;
}

export interface RealizationTypeConstraint {
  realizationType: string; // 'word'
  rejectsSurfaceFormPattern: RegExp; // /\s/
  reason: string;
}

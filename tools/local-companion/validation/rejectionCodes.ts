// validation/rejectionCodes.ts
// Re-export of the RejectionCode type plus a registry of the codes used for
// coverage guards and iteration. The canonical type lives in types.ts;
// reason text is produced by the engine from profile data, not here.

export type { RejectionCode } from './types';

import type { RejectionCode } from './types';

/** All rejection codes the engine can emit. Used by the profile-coverage
 *  test to assert the engine is exhaustive over the configured rule kinds.
 *  Keep in lockstep with the union in types.ts. */
export const ALL_REJECTION_CODES: readonly RejectionCode[] = [
  'STRUCT_UNKNOWN_CONCEPT',
  'STRUCT_BAD_REALIZATION_TYPE',
  'STRUCT_PLACEHOLDER',
  'STRUCT_HYBRID_JUNK_ASCII',
  'STRUCT_EMPTY_FIELD',
  'SCRIPT_NONE_NATIVE',
  'SCRIPT_MIXED',
  'TRANSLIT_NON_LATIN',
  'TRANSLIT_MISMATCH',
  'GRAMMAR_POS_PROP_CONTRADICTION',
  'GRAMMAR_POS_COMBO_CONTRADICTION',
  'GRAMMAR_MULTI_TENSE',
  'GRAMMAR_MULTI_PERSON',
  'REALIZATION_TYPE_SHAPE',
];

// validation/index.ts
// Public barrel for the profile-driven validation framework. External
// consumers (pipelines/, prompts/, Studio's vendored mirror) import from here.
//
// To add a language: author validation/profiles/<code>.ts and register it in
// profiles/index.ts. No engine edit, no pipeline edit.

export { validateRealizationEntry, getProfile } from './engine';
export { ALL_REJECTION_CODES } from './rejectionCodes';
export type { RejectionCode } from './rejectionCodes';
export type {
  Rejection,
  ValidationResult,
  ValidatedEntry,
  LanguageProfile,
  ContradictionRule,
  PosPropContradiction,
  PosComboContradiction,
  ExclusiveCategoryContradiction,
  RealizationTypeConstraint,
} from './types';
export { PROFILE_BY_CODE, RU_PROFILE, FA_PROFILE, FR_PROFILE } from './profiles';

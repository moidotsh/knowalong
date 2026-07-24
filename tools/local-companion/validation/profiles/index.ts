// validation/profiles/index.ts
// Profile registry. Adding a language = authoring a new profiles/<code>.ts
// and registering it here. The engine reads this map via getProfile().

import type { LanguageProfile } from '../types';
import { RU_PROFILE } from './ru';
import { FA_PROFILE } from './fa';
import { FR_PROFILE } from './fr';

export const PROFILE_BY_CODE: Record<string, LanguageProfile> = {
  ru: RU_PROFILE,
  fa: FA_PROFILE,
  fr: FR_PROFILE,
};

export { RU_PROFILE, FA_PROFILE, FR_PROFILE };

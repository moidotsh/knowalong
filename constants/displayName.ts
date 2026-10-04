// constants/displayName.ts
// The product name shown in consumer-facing UI copy — the auth trio's
// footer, the home header and placeholder, the PWA meta titles. This is
// the NAME slot, deliberately separate from the brand COLOR slot in
// theme.ts: a consumer overrides both (color via the brand family, name
// via this one constant) and every generated reference follows.
//
// KnowAlong derives it from constants/identity.ts — the operating
// identity stays single-sourced there.

import { IDENTITY } from './identity';

export const APP_DISPLAY_NAME = IDENTITY.name;

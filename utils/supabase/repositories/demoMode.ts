// utils/supabase/repositories/demoMode.ts
// Demo mode detection. When Supabase env vars are not configured (the
// starter shell's default dev state), repositories delegate to the demo
// adapter instead of hitting a real Supabase project. This lets the full
// UI render and be exercised without a backend — the /dev/knowalong
// showcase and the library/import/source flows all work against fixtures.
//
// The check reads the raw SUPABASE_URL from constants (not the client's
// resolved placeholder) so the detection is exact: an empty or placeholder
// URL means "not configured yet."

import { SUPABASE_URL } from '../../../constants';

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';

/** True when Supabase is not configured. Repository methods delegate to the demo adapter. */
export const DEMO_MODE: boolean =
  !SUPABASE_URL ||
  SUPABASE_URL === '' ||
  SUPABASE_URL === PLACEHOLDER_URL ||
  SUPABASE_URL.startsWith('EXPO_PUBLIC_SUPABASE_URL');

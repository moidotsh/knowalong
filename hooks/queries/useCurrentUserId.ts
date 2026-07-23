// hooks/queries/useCurrentUserId.ts
// Resolves the effective user ID for domain queries. In demo mode (no
// Supabase configured), returns DEMO_USER_ID so the fixture-backed adapter
// can serve data without a real auth session. In real mode, returns the
// authStore userId (null until authenticated, which gates queries via
// `enabled: !!userId`).

import { useAuthStore } from '../../stores';
import { DEMO_MODE, DEMO_USER_ID } from '../../utils/supabase/repositories';

export function useCurrentUserId(): string | null {
  const authUserId = useAuthStore((s) => s.userId);
  if (DEMO_MODE) return DEMO_USER_ID;
  return authUserId;
}
